// Loader só para testes: resolve imports sem extensão (.ts) e troca lib/db.ts por um stub em PGlite.
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const stub = pathToFileURL(fileURLToPath(new URL("./pg-stub.mjs", import.meta.url))).href;

export async function resolve(specifier, context, next) {
  if (specifier === "./db" && context.parentURL?.endsWith("/lib/booking.ts")) {
    return { url: stub, shortCircuit: true };
  }
  if (specifier.startsWith("./") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith("file:")) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
  }
  return next(specifier, context);
}
