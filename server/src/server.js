// server/src/server.js
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// --------------------
// Paths / DB
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "certificados.db");
const db = new Database(dbPath);

// --------------------
// Helpers
// --------------------
function normalizeCPF(v = "") {
  return String(v).replace(/\D/g, "");
}
function normalizeName(v = "") {
  return String(v).trim();
}
function normalizeCode(v = "") {
  return String(v).trim();
}

function authUser() {
  return process.env.ADMIN_USER || "admin";
}
function authPass() {
  return process.env.ADMIN_PASS || "admin123";
}
function makeToken(user, pass) {
  return Buffer.from(`${user}:${pass}`).toString("base64");
}
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Não autorizado" });
  const token = header.slice("Bearer ".length).trim();
  const expected = makeToken(authUser(), authPass());
  if (token !== expected) return res.status(401).json({ message: "Não autorizado" });
  next();
}

// --------------------
// Schema
// --------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS certificados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    curso TEXT NOT NULL,
    carga_horaria TEXT NOT NULL,
    data_conclusao TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'VALIDO',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_certificados_cpf ON certificados (cpf);
  CREATE INDEX IF NOT EXISTS idx_certificados_nome ON certificados (nome);
  CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON certificados (codigo);
`);

// --------------------
// Health
// --------------------
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "CIP Certificates API", db: dbPath });
});

// --------------------
// PUBLIC API (compatível com client/api.ts)
// --------------------

// GET /api/certificates/search?type=code|cpf|name&q=...
app.get("/api/certificates/search", (req, res) => {
  try {
    const type = String(req.query.type || "").toLowerCase();
    const qRaw = String(req.query.q || "");

    if (!type || !qRaw) return res.status(400).json({ message: "Informe type e q" });

    let row = null;

    if (type === "code") {
      const code = normalizeCode(qRaw);
      row = db
        .prepare(`SELECT * FROM certificados WHERE UPPER(codigo)=UPPER(?) LIMIT 1`)
        .get(code);
    } else if (type === "cpf") {
      const cpf = normalizeCPF(qRaw);
      if (cpf.length !== 11) return res.status(400).json({ message: "CPF inválido (precisa ter 11 números)" });
      row = db.prepare(`SELECT * FROM certificados WHERE cpf=? LIMIT 1`).get(cpf);
    } else if (type === "name") {
      const name = normalizeName(qRaw);
      if (name.length < 3) return res.status(400).json({ message: "Nome muito curto" });
      row = db
        .prepare(`SELECT * FROM certificados WHERE nome LIKE ? ORDER BY id DESC LIMIT 1`)
        .get(`%${name}%`);
    } else {
      return res.status(400).json({ message: "Type inválido. Use: code, cpf, name" });
    }

    if (!row) return res.status(404).json({ message: "Certificado não encontrado" });
    return res.json({ data: row });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

// GET /api/certificates/:code
app.get("/api/certificates/:code", (req, res) => {
  try {
    const code = normalizeCode(req.params.code || "");
    if (!code) return res.status(400).json({ message: "Código inválido" });

    const row = db
      .prepare(`SELECT * FROM certificados WHERE UPPER(codigo)=UPPER(?) LIMIT 1`)
      .get(code);

    if (!row) return res.status(404).json({ message: "Certificado não encontrado" });
    return res.json({ data: row });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

// --------------------
// ADMIN API
// --------------------

// POST /api/admin/login  body: { user, pass }
app.post("/api/admin/login", (req, res) => {
  const { user, pass } = req.body || {};
  const u = String(user || "");
  const p = String(pass || "");

  if (u === authUser() && p === authPass()) {
    return res.json({ token: makeToken(u, p) });
  }
  return res.status(401).json({ message: "Usuário ou senha inválidos" });
});

// GET /api/admin/certificates
app.get("/api/admin/certificates", requireAdmin, (_req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM certificados ORDER BY id DESC LIMIT 1000`).all();
    return res.json({ data: rows || [] });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

// POST /api/admin/certificates
app.post("/api/admin/certificates", requireAdmin, (req, res) => {
  try {
    const b = req.body || {};

    const nome = normalizeName(b.nome);
    const cpf = normalizeCPF(b.cpf);
    const curso = normalizeName(b.curso);
    const carga_horaria = normalizeName(b.carga_horaria);
    const data_conclusao = normalizeName(b.data_conclusao);
    const status = String(b.status || "VALIDO").toUpperCase() === "INVALIDO" ? "INVALIDO" : "VALIDO";
    const codigo = normalizeCode(b.codigo);

    if (!nome || !cpf || !curso || !carga_horaria || !data_conclusao) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    if (cpf.length !== 11) return res.status(400).json({ message: "CPF inválido (precisa ter 11 números)" });

    const finalCode =
      codigo ||
      `CIP-${Math.random().toString(36).slice(2, 4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const stmt = db.prepare(`
      INSERT INTO certificados (nome, cpf, curso, carga_horaria, data_conclusao, codigo, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(nome, cpf, curso, carga_horaria, data_conclusao, finalCode, status);

    const created = db
      .prepare(`SELECT * FROM certificados WHERE UPPER(codigo)=UPPER(?) LIMIT 1`)
      .get(finalCode);

    return res.json({ data: created });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("UNIQUE") && msg.toLowerCase().includes("codigo")) {
      return res.status(409).json({ message: "Código já existe. Tente outro código." });
    }
    return res.status(500).json({ message: "Erro no servidor", details: msg });
  }
});

// PUT /api/admin/certificates/:id
app.put("/api/admin/certificates/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const b = req.body || {};
    const nome = normalizeName(b.nome);
    const cpf = normalizeCPF(b.cpf);
    const curso = normalizeName(b.curso);
    const carga_horaria = normalizeName(b.carga_horaria);
    const data_conclusao = normalizeName(b.data_conclusao);
    const codigo = normalizeCode(b.codigo);
    const status = String(b.status || "VALIDO").toUpperCase() === "INVALIDO" ? "INVALIDO" : "VALIDO";

    if (!nome || !cpf || !curso || !carga_horaria || !data_conclusao || !codigo) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    if (cpf.length !== 11) return res.status(400).json({ message: "CPF inválido (precisa ter 11 números)" });

    db.prepare(`
      UPDATE certificados
      SET nome=?, cpf=?, curso=?, carga_horaria=?, data_conclusao=?, codigo=?, status=?
      WHERE id=?
    `).run(nome, cpf, curso, carga_horaria, data_conclusao, codigo, status, id);

    const updated = db.prepare(`SELECT * FROM certificados WHERE id=? LIMIT 1`).get(id);
    return res.json({ data: updated });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("UNIQUE") && msg.toLowerCase().includes("codigo")) {
      return res.status(409).json({ message: "Código já existe. Tente outro código." });
    }
    return res.status(500).json({ message: "Erro no servidor", details: msg });
  }
});

// DELETE /api/admin/certificates/:id
app.delete("/api/admin/certificates/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    db.prepare(`DELETE FROM certificados WHERE id=?`).run(id);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
  console.log(`📦 DB: ${dbPath}`);
});