import { after } from "next/server";
import { handleIncoming } from "@/lib/agent";
import { query } from "@/lib/db";
import { verifySignature, sendText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Verificação do webhook (Meta chama uma vez ao cadastrar a URL)
export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

type Msg = { id: string; from: string; type: string; text?: { body: string } };
type Payload = { entry?: { changes?: { value?: { messages?: Msg[] } }[] }[] };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("invalid signature", { status: 401 });

  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const messages = (payload.entry ?? []).flatMap((e) => (e.changes ?? []).flatMap((c) => c.value?.messages ?? []));
  for (const m of messages) {
    // a Meta reenvia o webhook se demorarmos; o id garante que cada mensagem é tratada uma vez
    const inserted = await query(`insert into wa_processed (message_id) values ($1) on conflict do nothing returning message_id`, [m.id]);
    if (inserted.length === 0) continue;

    if (m.type === "text" && m.text?.body) {
      after(() => handleIncoming(m.from, m.text!.body));
    } else {
      after(() => sendText(m.from, "Por enquanto consigo ler apenas mensagens de texto. Pode escrever o que você precisa?"));
    }
  }
  return new Response("ok", { status: 200 });
}
