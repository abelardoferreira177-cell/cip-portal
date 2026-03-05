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

// Em produção (Railway/Cloudflare), o site vai estar em outro domínio.
// Aqui liberamos CORS de forma prática. Depois, se quiser, eu travo para o seu domínio.
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

// Banco SQLite em: server/data/certificados.db
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "certificados.db");
const db = new sqlite3.Database(dbPath);

// Cria tabela se não existir
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS certificados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT NOT NULL,
      curso TEXT NOT NULL,
      carga_horaria TEXT NOT NULL,
      data_conclusao TEXT NOT NULL,
      codigo TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Índices para melhorar buscas
  db.run(`CREATE INDEX IF NOT EXISTS idx_certificados_cpf ON certificados (cpf)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_certificados_nome ON certificados (nome)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON certificados (codigo)`);
});

// --------------------
// Helpers
// --------------------
function normalizeCPF(value = "") {
  return String(value).replace(/\D/g, "");
}

function normalizeName(value = "") {
  return String(value).trim();
}

function generateCode(prefix = "CIP") {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  return `${prefix}-${pick(letters)}${pick(letters)}${pick(nums)}${pick(nums)}${pick(nums)}${pick(nums)}`;
}

function isAdminAuth(req) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASS || "admin123";

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) return false;

  const base64 = auth.replace("Basic ", "").trim();
  const decoded = Buffer.from(base64, "base64").toString("utf8"); // user:pass
  const [u, p] = decoded.split(":");

  return u === user && p === pass;
}

function requireAdmin(req, res, next) {
  if (!isAdminAuth(req)) {
    return res.status(401).json({ ok: false, message: "Não autorizado" });
  }
  next();
}

// --------------------
// Health check
// --------------------
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "CIP Certificates API",
    db: dbPath,
  });
});

// --------------------
// Auth
// --------------------
// Login simples: o frontend manda { usuario, senha } e nós validamos com .env
app.post("/auth/login", (req, res) => {
  const { usuario, senha } = req.body || {};

  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASS || "admin123";

  if (usuario === user && senha === pass) {
    // O frontend pode guardar um "basic token"
    const token = Buffer.from(`${usuario}:${senha}`).toString("base64");
    return res.json({ ok: true, token });
  }

  return res.status(401).json({ ok: false, message: "Usuário ou senha inválidos" });
});

// --------------------
// Public consultation
// --------------------
// /consulta?tipo=codigo&valor=...
// tipos: codigo | cpf | nome
app.get("/consulta", (req, res) => {
  const tipo = String(req.query.tipo || "").toLowerCase();
  const valorRaw = String(req.query.valor || "");

  if (!tipo || !valorRaw) {
    return res.status(400).json({ ok: false, message: "Informe tipo e valor" });
  }

  let sql = "";
  let param = "";

  if (tipo === "codigo") {
    sql = `SELECT * FROM certificados WHERE UPPER(codigo) = UPPER(?) LIMIT 1`;
    param = valorRaw.trim();
  } else if (tipo === "cpf") {
    const cpf = normalizeCPF(valorRaw);
    if (cpf.length !== 11) {
      return res.status(400).json({ ok: false, message: "CPF inválido (precisa ter 11 números)" });
    }
    sql = `SELECT * FROM certificados WHERE cpf = ? LIMIT 1`;
    param = cpf;
  } else if (tipo === "nome") {
    const nome = normalizeName(valorRaw);
    if (nome.length < 3) {
      return res.status(400).json({ ok: false, message: "Nome muito curto" });
    }
    // Busca parcial
    sql = `SELECT * FROM certificados WHERE nome LIKE ? ORDER BY id DESC LIMIT 20`;
    param = `%${nome}%`;
  } else {
    return res.status(400).json({ ok: false, message: "Tipo inválido. Use: codigo, cpf, nome" });
  }

  db.all(sql, [param], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, message: "Erro no banco", err: String(err) });

    // Para codigo/cpf deve vir 0 ou 1; para nome pode vir lista
    return res.json({ ok: true, resultados: rows || [] });
  });
});

// Verificação por link oficial: /verificar/:codigo
app.get("/verificar/:codigo", (req, res) => {
  const codigo = String(req.params.codigo || "").trim();
  if (!codigo) return res.status(400).json({ ok: false, message: "Código inválido" });

  db.get(
    `SELECT * FROM certificados WHERE UPPER(codigo) = UPPER(?) LIMIT 1`,
    [codigo],
    (err, row) => {
      if (err) return res.status(500).json({ ok: false, message: "Erro no banco", err: String(err) });
      if (!row) return res.status(404).json({ ok: false, message: "Certificado não encontrado" });

      return res.json({ ok: true, certificado: row });
    }
  );
});

// --------------------
// Admin endpoints (CRUD)
// --------------------

// Listar certificados (admin)
app.get("/admin/certificados", requireAdmin, (req, res) => {
  db.all(`SELECT * FROM certificados ORDER BY id DESC LIMIT 500`, [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, message: "Erro no banco", err: String(err) });
    res.json({ ok: true, itens: rows || [] });
  });
});

// Criar certificado (admin)
app.post("/admin/certificados", requireAdmin, (req, res) => {
  const body = req.body || {};

  const nome = normalizeName(body.nome);
  const cpf = normalizeCPF(body.cpf);
  const curso = normalizeName(body.curso);
  const carga_horaria = normalizeName(body.carga_horaria);
  const data_conclusao = normalizeName(body.data_conclusao);

  let codigo = normalizeName(body.codigo);

  if (!nome || !cpf || !curso || !carga_horaria || !data_conclusao) {
    return res.status(400).json({ ok: false, message: "Campos obrigatórios faltando" });
  }

  if (cpf.length !== 11) {
    return res.status(400).json({ ok: false, message: "CPF inválido (precisa ter 11 números)" });
  }

  if (!codigo) {
    codigo = generateCode("CIP");
  }

  const sql = `
    INSERT INTO certificados (nome, cpf, curso, carga_horaria, data_conclusao, codigo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [nome, cpf, curso, carga_horaria, data_conclusao, codigo], function (err) {
    if (err) {
      // Se código duplicado, tenta gerar outro automaticamente
      const msg = String(err);
      if (msg.includes("UNIQUE") && msg.includes("codigo")) {
        const novo = generateCode("CIP");
        return db.run(sql, [nome, cpf, curso, carga_horaria, data_conclusao, novo], function (err2) {
          if (err2) return res.status(500).json({ ok: false, message: "Erro no banco", err: String(err2) });
          return res.json({ ok: true, id: this.lastID, codigo: novo });
        });
      }
      return res.status(500).json({ ok: false, message: "Erro no banco", err: msg });
    }

    res.json({ ok: true, id: this.lastID, codigo });
  });
});

// Atualizar certificado (admin)
app.put("/admin/certificados/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

  const body = req.body || {};
  const nome = normalizeName(body.nome);
  const cpf = normalizeCPF(body.cpf);
  const curso = normalizeName(body.curso);
  const carga_horaria = normalizeName(body.carga_horaria);
  const data_conclusao = normalizeName(body.data_conclusao);
  const codigo = normalizeName(body.codigo);

  if (!nome || !cpf || !curso || !carga_horaria || !data_conclusao || !codigo) {
    return res.status(400).json({ ok: false, message: "Campos obrigatórios faltando" });
  }
  if (cpf.length !== 11) {
    return res.status(400).json({ ok: false, message: "CPF inválido (precisa ter 11 números)" });
  }

  const sql = `
    UPDATE certificados
    SET nome=?, cpf=?, curso=?, carga_horaria=?, data_conclusao=?, codigo=?
    WHERE id=?
  `;

  db.run(sql, [nome, cpf, curso, carga_horaria, data_conclusao, codigo, id], function (err) {
    if (err) return res.status(500).json({ ok: false, message: "Erro no banco", err: String(err) });
    res.json({ ok: true, changes: this.changes });
  });
});

// Remover certificado (admin)
app.delete("/admin/certificados/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "ID inválido" });

  db.run(`DELETE FROM certificados WHERE id=?`, [id], function (err) {
    if (err) return res.status(500).json({ ok: false, message: "Erro no banco", err: String(err) });
    res.json({ ok: true, changes: this.changes });
  });
});

// --------------------
// Start
// --------------------
app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
  console.log(`📦 DB: ${dbPath}`);
});