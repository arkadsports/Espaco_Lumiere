// Substitui lib/db.ts nos testes: usa o PGlite criado por scripts/test-booking.mjs.
export async function query(text, params = []) {
  const r = await globalThis.__testDb.query(text, params);
  return r.rows;
}
