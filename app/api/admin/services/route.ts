import { BookingError, listServices } from "@/lib/booking";
import { query } from "@/lib/db";
import { adminOnly, body, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = () => adminOnly(async () => json({ services: await listServices(true) }));

export const PATCH = (req: Request) =>
  adminOnly(async () => {
    const b = await body<{ id?: string; price_cents?: number | null; duration_min?: number; active?: boolean }>(req);
    const dur = Number(b.duration_min);
    if (!b.id || !Number.isInteger(dur) || dur < 10 || dur > 480) throw new BookingError("invalid", "Duração inválida (10 a 480 min).");
    const price = b.price_cents == null ? null : Math.round(Number(b.price_cents));
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw new BookingError("invalid", "Preço inválido.");
    await query(`update services set price_cents = $2, duration_min = $3, active = $4 where id = $1`, [b.id, price, dur, !!b.active]);
    return json({ ok: true });
  });
