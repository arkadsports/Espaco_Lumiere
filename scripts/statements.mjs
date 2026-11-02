import { readFileSync } from "node:fs";
import { SERVICES, LOCATIONS, DEFAULT_WINDOWS } from "../lib/content.ts";

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

/** Statements de schema (sem parâmetros). */
export const schemaStatements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);

/** Seed idempotente: não sobrescreve preços/horários que o admin já editou. */
export function seedStatements({ withWindows }) {
  const out = [];
  for (const l of LOCATIONS) {
    out.push({
      text: `insert into locations (id, name, address, maps_url) values ($1,$2,$3,$4)
             on conflict (id) do update set name = excluded.name, address = excluded.address, maps_url = excluded.maps_url`,
      params: [l.id, l.name, l.address, l.maps_url],
    });
  }
  for (const s of SERVICES) {
    out.push({
      text: `insert into services (id, category, name, description, duration_min, price_cents, variants, variant_label, resource, sort)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (id) do nothing`,
      params: [s.id, s.category, s.name, s.description, s.duration_min, s.price_cents, s.variants, s.variant_label, s.resource, s.sort],
    });
  }
  if (withWindows) {
    for (const w of DEFAULT_WINDOWS) {
      out.push({
        text: `insert into schedule_windows (location_id, weekday, start_time, end_time) values ($1,$2,$3,$4)`,
        params: [w.location_id, w.weekday, w.start_time, w.end_time],
      });
    }
  }
  return out;
}
