import dotenv from "dotenv";
import { openDb, run, get } from "./db.js";
import { makeCode } from "./utils.js";

dotenv.config();

const DB_PATH = process.env.DB_PATH || "./data/certificados.db";
const db = openDb(DB_PATH);

const examples = [
  {
    nome: "Fernanda Ferreira de Oliveira",
    cpf: "71832190110",
    curso: "Merendeiro Escolar",
    carga_horaria: "35 horas",
    data_conclusao: "12/12/2025",
    codigo: "CIP-AB1234",
    status: "VALIDO",
  },
];

(async () => {
  for (const e of examples) {
    const codigo = e.codigo || makeCode("CIP");
    const existing = await get(db, "SELECT id FROM certificados WHERE codigo = ?", [codigo]);
    if (existing) continue;
    await run(
      db,
      `INSERT INTO certificados (nome, cpf, curso, carga_horaria, data_conclusao, codigo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [e.nome, e.cpf, e.curso, e.carga_horaria, e.data_conclusao, codigo, e.status]
    );
  }
  console.log("Seed concluído.");
  process.exit(0);
})();
