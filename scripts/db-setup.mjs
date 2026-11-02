// Cria as tabelas e carrega os dados iniciais. Pode ser executado mais de uma vez.
// Uso: npm run db:setup   (lê DATABASE_URL de .env.local)
import { neon } from "@neondatabase/serverless";
import { schemaStatements, seedStatements } from "./statements.mjs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Defina DATABASE_URL em .env.local");
  process.exit(1);
}
const sql = neon(url);

for (const s of schemaStatements) await sql.query(s);

const [{ n }] = await sql.query("select count(*)::int as n from schedule_windows");
for (const s of seedStatements({ withWindows: n === 0 })) await sql.query(s.text, s.params);

console.log(`Banco pronto. ${n === 0 ? "Horários padrão de Angicos criados." : "Horários existentes mantidos."}`);
