# Sistema de Consulta de Certificados e Diplomas
**Instituição:** Colégio Integrado Polivalente

## ✅ Como rodar no Windows (passo a passo)
1) Abra esta pasta no seu computador (onde está este README).
2) Copie o arquivo `server/.env.example` para `server/.env`
   - (Opcional) troque `ADMIN_USER` e `ADMIN_PASS`.
3) No PowerShell, rode:

```bash
npm install
npm run setup
npm run seed
npm run dev
```

- O site abre em: `http://localhost:5173`
- A API roda em: `http://localhost:3001`

## Área administrativa
- Acesse: `http://localhost:5173/admin`
- Usuário e senha estão em `server/.env`

## Observações
- Este projeto usa SQLite (um arquivo). O banco fica em `server/data/certificados.db`.
- Para colocar na internet depois, eu te passo o passo a passo (Vercel + Render/Railway/VPS).
