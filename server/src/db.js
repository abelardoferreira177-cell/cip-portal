import sqlite3 from "sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function openDb(dbPath) {
  // garante pasta existente (ex.: ./data)
  try { mkdirSync(dirname(dbPath), { recursive: true }); } catch {}

  const db = new sqlite3.Database(dbPath);

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
        status TEXT NOT NULL DEFAULT 'VALIDO',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_cert_cpf ON certificados(cpf)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cert_nome ON certificados(nome)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cert_codigo ON certificados(codigo)`);
  });

  return db;
}

export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

export function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
