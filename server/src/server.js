// server/src/server.js
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

// --------------------
// Config
// --------------------
const PORT = process.env.PORT || 3001;

// CORS liberado (prático). Depois, se quiser, travo só no seu domínio.
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
const db = new sqlite3.Database(dbPath);

// --------------------
// Helpers
// --------------------
function normalizeCPF(value = "") {
  return String(value).replace(/\D/g, "");
}
function normalizeName(value = "") {
  return String(value).trim();
}
function normalizeCode(value = "") {
  return String(value).trim();
}

function authUser() {
  return process.env.ADMIN_USER || "admin";
}
function authPass() {
  return process.env.ADMIN_PASS || "admin123";
}

// Token simples (pra bater com o client): base64("user:pass")
function makeToken(user, pass) {
  return Buffer.from(`${user}:${pass}`).toString("base64");
}

function verifyBearer(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  const expected = makeToken(authUser(), authPass());
  return token === expected;
}

function requireAdmin(req, res, next) {
  if (!verifyBearer(req)) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  next();
}

// Promises simples para sqlite
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// --------------------
// DB init + migration
// --------------------
async function ensureSchema() {
  await dbRun(`
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
    )
  `);

  // garantir índices
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_certificados_cpf ON certificados (cpf)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_certificados_nome ON certificados (nome)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON certificados (codigo)`);

  // migração: se tabela já existia sem coluna status, adiciona
  const cols = await dbAll(`PRAGMA table_info(certificados)`);
  const hasStatus = (cols || []).some((c) => c?.name === "status");
  if (!hasStatus) {
    await dbRun(`ALTER TABLE certificados ADD COLUMN status TEXT NOT NULL DEFAULT 'VALIDO'`);
  }
}

await ensureSchema();

// --------------------
// Health check
// --------------------
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "CIP Certificates API", db: dbPath });
});

// --------------------
// PUBLIC API (compatível com client/api.ts)
// --------------------

// GET /api/certificates/search?type=code|cpf|name&q=...
app.get("/api/certificates/search", async (req, res) => {
  try {
    const type = String(req.query.type || "").toLowerCase();
    const qRaw = String(req.query.q || "");

    if (!type || !qRaw) {
      return res.status(400).json({ message: "Informe type e q" });
    }

    let row = null;

    if (type === "code") {
      const code = normalizeCode(qRaw);
      row = await dbGet(
        `SELECT * FROM certificados WHERE UPPER(codigo)=UPPER(?) LIMIT 1`,
        [code]
      );
    } else if (type === "cpf") {
      const cpf = normalizeCPF(qRaw);
      if (cpf.length !== 11) {
        return res.status(400).json({ message: "CPF inválido (precisa ter 11 números)" });
      }
      row = await dbGet(`SELECT * FROM certificados WHERE cpf=? LIMIT 1`, [cpf]);
    } else if (type === "name") {
      const name = normalizeName(qRaw);
      if (name.length < 3) {
        return res.status(400).json({ message: "Nome muito curto" });
      }
      // pega o mais recente que bate com LIKE
      row = await dbGet(
        `SELECT * FROM certificados WHERE nome LIKE ? ORDER BY id DESC LIMIT 1`,
        [`%${name}%`]
      );
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
app.get("/api/certificates/:code", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code || "");
    if (!code) return res.status(400).json({ message: "Código inválido" });

    const row = await dbGet(
      `SELECT * FROM certificados WHERE UPPER(codigo)=UPPER(?) LIMIT 1`,
      [code]
    );
    if (!row) return res.status(404).json({ message: "Certificado não encontrado" });

    return res.json({ data: row });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

// --------------------
// ADMIN API (compatível com client/api.ts)
// --------------------

// POST /api/admin/login  body: { user, pass }
app.post("/api/admin/login", async (req, res) => {
  const { user, pass } = req.body || {};
  const u = String(user || "");
  const p = String(pass || "");

  if (u === authUser() && p === authPass()) {
    return res.json({ token: makeToken(u, p) });
  }
  return res.status(401).json({ message: "Usuário ou senha inválidos" });
});

// GET /api/admin/certificates
app.get("/api/admin/certificates", requireAdmin, async (_req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM certificados ORDER BY id DESC LIMIT 1000`);
    return res.json({ data: rows || [] });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

// POST /api/admin/certificates
app.post("/api/admin/certificates", requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};

    const nome = normalizeName(b.nome);
    const cpf = normalizeCPF(b.cpf);
    const curso = normalizeName(b.curso);
    const carga_horaria = normalizeName(b.carga_horaria);
    const data_conclusao = normalizeName(b.data_conclusao);
    const status = (String(b.status || "VALIDO").toUpperCase() === "INVALIDO") ? "INVALIDO" : "VALIDO";
    const codigo = normalizeCode(b.codigo);

    if (!nome || !cpf || !curso || !carga_horaria || !data_conclusao) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    if (cpf.length !== 11) {
      return res.status(400).json({ message: "CPF inválido (precisa ter 11 números)" });
    }

    const finalCode = codigo || `CIP-${Math.random().toString(36).slice(2, 4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

    await dbRun(
      `INSERT INTO certificados (nome, cpf, curso, carga_horaria, data_conclusao, codigo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nome, cpf, curso, carga_horaria, data_conclusao, finalCode, status]
    );

    const created = await dbGet(
      `SELECT * FROM certificados WHERE UPPER(codigo)=UPPER(?) LIMIT 1`,
      [finalCode]
    );

    return res.json({ data: created });
  } catch (e) {
    // código duplicado
    const msg = String(e);
    if (msg.includes("UNIQUE") && msg.includes("codigo")) {
      return res.status(409).json({ message: "Código já existe. Tente outro código." });
    }
    return res.status(500).json({ message: "Erro no servidor", details: msg });
  }
});

// PUT /api/admin/certificates/:id
app.put("/api/admin/certificates/:id", requireAdmin, async (req, res) => {
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
    const status = (String(b.status || "VALIDO").toUpperCase() === "INVALIDO") ? "INVALIDO" : "VALIDO";

    if (!nome || !cpf || !curso || !carga_horaria || !data_conclusao || !codigo) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    if (cpf.length !== 11) {
      return res.status(400).json({ message: "CPF inválido (precisa ter 11 números)" });
    }

    await dbRun(
      `UPDATE certificados
       SET nome=?, cpf=?, curso=?, carga_horaria=?, data_conclusao=?, codigo=?, status=?
       WHERE id=?`,
      [nome, cpf, curso, carga_horaria, data_conclusao, codigo, status, id]
    );

    const updated = await dbGet(`SELECT * FROM certificados WHERE id=? LIMIT 1`, [id]);
    return res.json({ data: updated });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("UNIQUE") && msg.includes("codigo")) {
      return res.status(409).json({ message: "Código já existe. Tente outro código." });
    }
    return res.status(500).json({ message: "Erro no servidor", details: msg });
  }
});

// DELETE /api/admin/certificates/:id
app.delete("/api/admin/certificates/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    await dbRun(`DELETE FROM certificados WHERE id=?`, [id]);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Erro no servidor", details: String(e) });
  }
});

// --------------------
// Start
// --------------------
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
  console.log(`📦 DB: ${dbPath}`);
});