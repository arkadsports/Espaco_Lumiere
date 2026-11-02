import { NextResponse } from "next/server";
import { BookingError } from "./booking";
import { isAdmin } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

const STATUS: Record<BookingError["code"], number> = {
  invalid: 400,
  not_found: 404,
  conflict: 409,
  unavailable: 409,
  limit: 429,
  too_late: 403,
};

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof BookingError) return json({ error: e.message, code: e.code }, STATUS[e.code]);
    console.error(e);
    return json({ error: "Erro interno. Tente novamente em instantes." }, 500);
  }
}

export async function adminOnly(fn: () => Promise<Response>): Promise<Response> {
  if (!(await isAdmin())) return json({ error: "Não autorizado" }, 401);
  return handle(fn);
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BookingError("invalid", "Requisição inválida.");
  }
}
