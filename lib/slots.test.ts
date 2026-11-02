import test from "node:test";
import assert from "node:assert/strict";
import { generateSlots } from "./slots.ts";
import { atLocal, addDays, weekday } from "./time.ts";

const base = {
  date: "2030-03-05",
  windows: [
    { location_id: "angicos", start_time: "09:00:00", end_time: "12:00:00", categories: null },
    { location_id: "angicos", start_time: "14:00:00", end_time: "18:00:00", categories: null },
  ],
  category: "lash",
  durationMin: 90,
  stepMin: 30,
  busy: [],
  now: new Date("2030-01-01T00:00:00Z"),
  minLeadMin: 0,
};

test("gera horários que cabem inteiros na janela", () => {
  const times = generateSlots(base).map((s) => s.time);
  assert.deepEqual(times, ["09:00", "09:30", "10:00", "10:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]);
});

test("horário ocupado remove todos os inícios que sobreporiam", () => {
  const busy = [{ start: atLocal(base.date, "10:00"), end: atLocal(base.date, "11:30") }];
  const times = generateSlots({ ...base, busy }).map((s) => s.time);
  assert.ok(!times.includes("09:00") && !times.includes("09:30") && !times.includes("10:00"));
  assert.ok(times.includes("14:00"));
});

test("encostar no fim de outro atendimento é permitido", () => {
  const busy = [{ start: atLocal(base.date, "09:00"), end: atLocal(base.date, "10:30") }];
  const times = generateSlots({ ...base, busy }).map((s) => s.time);
  assert.equal(times[0], "10:30");
  assert.ok(!times.includes("10:00"));
});

test("respeita antecedência mínima", () => {
  const now = atLocal(base.date, "08:00");
  const times = generateSlots({ ...base, now, minLeadMin: 180 }).map((s) => s.time);
  assert.equal(times[0], "14:00");
  assert.ok(!times.includes("09:00") && !times.includes("10:30"));
});

test("janela restrita por categoria", () => {
  const windows = [{ ...base.windows[0], categories: ["massagem"] }];
  assert.equal(generateSlots({ ...base, windows }).length, 0);
  assert.ok(generateSlots({ ...base, windows, category: "massagem" }).length > 0);
});

test("helpers de data", () => {
  assert.equal(addDays("2030-02-28", 1), "2030-03-01");
  assert.equal(weekday("2030-03-05"), 2);
});
