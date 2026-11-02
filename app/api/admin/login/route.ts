import { checkPassword, endAdminSession, startAdminSession } from "@/lib/auth";
import { body, handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = (req: Request) =>
  handle(async () => {
    const { password } = await body<{ password?: string }>(req);
    if (!checkPassword(String(password ?? ""))) {
      await new Promise((r) => setTimeout(r, 800)); // freia tentativa de força bruta
      return json({ error: "Senha incorreta." }, 401);
    }
    await startAdminSession();
    return json({ ok: true });
  });

export const DELETE = () =>
  handle(async () => {
    await endAdminSession();
    return json({ ok: true });
  });
