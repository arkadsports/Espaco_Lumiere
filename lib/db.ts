import { neon } from "@neondatabase/serverless";

function url(): string {
  const u = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!u) throw new Error("DATABASE_URL não configurada");
  return u;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = neon(url());
  return (await sql.query(text, params)) as T[];
}
