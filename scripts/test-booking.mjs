// Teste de ponta a ponta das regras de agendamento (lib/booking.ts) contra Postgres em memória.
// Uso: npm run test:booking
import { register } from "node:module";
import assert from "node:assert/strict";

register("./loader.mjs", import.meta.url);

const { PGlite } = await import("@electric-sql/pglite");
const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
const { schemaStatements, seedStatements } = await import("./statements.mjs");
const { addDays, localDate, weekday } = await import("../lib/time.ts");

const db = new PGlite({ extensions: { btree_gist } });
globalThis.__testDb = db;
for (const s of schemaStatements) await db.query(s);
for (const s of seedStatements({ withWindows: true })) await db.query(s.text, s.params);

const B = await import("../lib/booking.ts");

// próxima terça-feira com pelo menos 10 dias de folga
let tue = addDays(localDate(new Date()), 10);
while (weekday(tue) !== 2) tue = addDays(tue, 1);
const times = (slots) => slots.map((s) => s.time);
const lash = await B.getService("lash-aplicacao"); // 150 min
const start = (date, hm) => new Date(`${date}T${hm}:00-03:00`).toISOString();
const phone = (n) => `8499900${String(n).padStart(4, "0")}`;
let n = 0;
const book = (extra = {}) =>
  B.createAppointment({ serviceId: "lash-aplicacao", variant: "Volume Glamour", name: "Cliente Teste", phone: phone(++n), source: "site", ...extra });
const code = async (p) => p.then(() => "ok", (e) => e.code ?? e.message);

// 1. só a Livia atende lash: horários padrão da terça (09-12 e 14-18, serviço de 150 min)
assert.deepEqual(times(await B.slotsForDate(lash, tue, { ignoreLead: true })), ["09:00", "09:30", "14:00", "14:30", "15:00", "15:30"]);
console.log("ok  horários iniciais por janela e duração");

// 2. reservar 09:00 bloqueia 09:00 e 09:30 da Livia
const a1 = await book({ start: start(tue, "09:00"), source: "admin" });
assert.equal(a1.professional_id, "livia-melo");
assert.deepEqual(times(await B.slotsForDate(lash, tue, { ignoreLead: true })), ["14:00", "14:30", "15:00", "15:30"]);
assert.equal(await code(book({ start: start(tue, "09:00"), source: "admin" })), "unavailable");
console.log("ok  horário reservado some da agenda e não pode ser reservado de novo");

// 3. segunda profissional de lash: o horário volta, atribuído a ela quando "sem preferência"
await db.query(`insert into professionals (id, name, categories, sort) values ('bia', 'Bia', '{lash,sobrancelha}', 20), ('ana', 'Ana', '{massagem}', 30)`);
await db.query(`insert into schedule_windows (professional_id, location_id, weekday, start_time, end_time) values ('bia','angicos',2,'09:00','12:00')`);
const slots9 = await B.slotsForDate(lash, tue, { ignoreLead: true });
assert.deepEqual(times(slots9).slice(0, 2), ["09:00", "09:30"]);
assert.deepEqual(slots9[0].professionals.map((p) => p.id), ["bia"]);
const a2 = await book({ start: start(tue, "09:00"), source: "admin" });
assert.equal(a2.professional_id, "bia");
console.log("ok  segunda profissional libera o horário e recebe a reserva");

// 4. escolha explícita de profissional
assert.deepEqual(times(await B.slotsForDate(lash, tue, { ignoreLead: true, professionalId: "livia-melo" })), ["14:00", "14:30", "15:00", "15:30"]);
assert.equal(await code(book({ start: start(tue, "09:00"), professionalId: "livia-melo", source: "admin" })), "unavailable");
console.log("ok  filtro por profissional respeita a agenda dela");

// 5. simultaneidade: 5 clientes disputam o último horário livre da tarde
const race = await Promise.all(Array.from({ length: 5 }, () => code(book({ start: start(tue, "14:00"), professionalId: "livia-melo", source: "admin" }))));
assert.equal(race.filter((r) => r === "ok").length, 1, `esperava 1 vencedora, veio ${JSON.stringify(race)}`);
assert.ok(race.every((r) => r === "ok" || r === "conflict" || r === "unavailable"));
console.log("ok  5 reservas simultâneas no mesmo horário: só 1 vence", JSON.stringify(race));

// 6. dia específico em Natal substitui o horário semanal
const natalDay = addDays(tue, 1); // quarta, que normalmente é Angicos
await db.query(`insert into schedule_windows (professional_id, location_id, on_date, start_time, end_time) values ('livia-melo','natal',$1,'10:00','14:00')`, [natalDay]);
const nat = await B.slotsForDate(lash, natalDay, { ignoreLead: true, professionalId: "livia-melo" });
assert.deepEqual(times(nat), ["10:00", "10:30", "11:00", "11:30"]);
assert.ok(nat.every((s) => s.location_id === "natal"));
const range = await B.availabilityRange(lash, natalDay, 1, "livia-melo");
assert.equal(range[natalDay]?.location_id, "natal");
console.log("ok  data específica em Natal substitui o horário semanal e marca o local");

// 7. folgas: de uma profissional e geral
await db.query(`insert into blocked_dates (on_date, professional_id) values ($1, 'bia')`, [addDays(tue, 7)]);
const nextTue = addDays(tue, 7);
const off = await B.slotsForDate(lash, nextTue, { ignoreLead: true });
assert.ok(off.every((s) => s.professionals.every((p) => p.id !== "bia")) && off.length > 0);
await db.query(`insert into blocked_dates (on_date, professional_id) values ($1, null)`, [nextTue]);
assert.equal((await B.slotsForDate(lash, nextTue, { ignoreLead: true })).length, 0);
console.log("ok  folga individual e folga geral");

// 8. serviço sem profissional que o atenda não tem horários
const massagem = await B.getService("massagem");
assert.equal((await B.slotsForDate(massagem, tue, { ignoreLead: true })).length, 0);
await db.query(`insert into schedule_windows (professional_id, location_id, weekday, start_time, end_time) values ('ana','angicos',2,'09:00','12:00')`);
assert.deepEqual(times(await B.slotsForDate(massagem, tue, { ignoreLead: true })), ["09:00", "09:30", "10:00", "10:30", "11:00"]);
console.log("ok  serviço só aparece com horários quando há profissional que o atenda");

// 9. validações
assert.equal(await code(book({ start: start(tue, "15:00"), variant: undefined, source: "admin" })), "invalid");
assert.equal(await code(book({ start: start(tue, "15:00"), phone: "123", source: "admin" })), "invalid");
assert.equal(await code(book({ start: start(tue, "15:15"), source: "admin" })), "unavailable");
console.log("ok  estilo obrigatório, telefone válido e horário fora do passo");

// 10. antecedência mínima vale para o site (não para o painel)
const soon = await B.slotsForDate(lash, localDate(new Date()));
const soonAdmin = await B.slotsForDate(lash, localDate(new Date()), { ignoreLead: true });
assert.ok(soon.length <= soonAdmin.length);
console.log("ok  antecedência mínima aplicada ao site");

// 11. cancelamento libera o horário
await B.cancelAppointment(a1, { force: true });
assert.ok(times(await B.slotsForDate(lash, tue, { ignoreLead: true, professionalId: "livia-melo" })).includes("09:00"));
console.log("ok  cancelar libera o horário");

console.log("\nRegras de agendamento validadas.");
