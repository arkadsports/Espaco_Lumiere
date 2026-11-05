// Prova que o BANCO impede horários sobrepostos, mesmo com requisições simultâneas.
// Usa Postgres em memória (PGlite), sem precisar de conta nem internet.
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { schemaStatements, seedStatements } from "./statements.mjs";

const db = new PGlite({ extensions: { btree_gist }, initialMemory: 128 * 1024 * 1024 });
for (const s of schemaStatements) await db.query(s);
for (const s of seedStatements({ withWindows: true })) await db.query(s.text, s.params);
await db.query("insert into professionals (id, name, categories) values ('ana-teste', 'Ana', '{massagem}')");

const insert = (pro, start, end, status = "confirmed") =>
  db.query(
    `insert into appointments (service_id, professional_id, location_id, start_at, end_at, client_name, client_phone, status)
     values ('lash-aplicacao', $1, 'angicos', $2, $3, 'Teste', '5584999999999', $4) returning id`,
    [pro, start, end, status],
  );

const rejects = async (p) => {
  try {
    await p;
  } catch (e) {
    assert.equal(e.code, "23P01", `esperava 23P01, veio ${e.code}: ${e.message}`);
    return;
  }
  assert.fail("deveria ter sido rejeitado");
};

await insert("livia-melo", "2030-03-05T12:00:00Z", "2030-03-05T14:30:00Z");
console.log("ok  reserva inicial");

await rejects(insert("livia-melo", "2030-03-05T12:00:00Z", "2030-03-05T14:30:00Z"));
console.log("ok  mesmo horário rejeitado");

await rejects(insert("livia-melo", "2030-03-05T13:00:00Z", "2030-03-05T13:30:00Z"));
console.log("ok  sobreposição parcial rejeitada");

await insert("livia-melo", "2030-03-05T14:30:00Z", "2030-03-05T16:00:00Z");
console.log("ok  horário colado no fim do anterior é permitido");

await insert("ana-teste", "2030-03-05T12:00:00Z", "2030-03-05T13:00:00Z");
console.log("ok  outro profissional/recurso no mesmo horário é permitido");

const c = await insert("livia-melo", "2030-03-06T12:00:00Z", "2030-03-06T14:00:00Z");
await db.query(`update appointments set status = 'cancelled' where id = $1`, [c.rows[0].id]);
await insert("livia-melo", "2030-03-06T12:00:00Z", "2030-03-06T14:00:00Z");
console.log("ok  horário cancelado volta a ficar livre");

const results = await Promise.allSettled([
  insert("livia-melo", "2030-03-07T12:00:00Z", "2030-03-07T13:00:00Z"),
  insert("livia-melo", "2030-03-07T12:00:00Z", "2030-03-07T13:00:00Z"),
  insert("livia-melo", "2030-03-07T12:30:00Z", "2030-03-07T13:30:00Z"),
]);
assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
console.log("ok  3 tentativas simultâneas no mesmo horário: só 1 vence");

console.log("\nSchema validado: sem conflitos de horário.");
