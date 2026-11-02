import { BookingError } from "@/lib/booking";
import { query } from "@/lib/db";
import { adminOnly, body, json } from "@/lib/http";
import { isDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const HHMM = /^\d{2}:\d{2}$/;

export const GET = () =>
  adminOnly(async () => {
    const [windows, blocked, locations] = await Promise.all([
      query(
        `select id, location_id, weekday, on_date::text as on_date, start_time::text as start_time, end_time::text as end_time, categories
           from schedule_windows order by on_date nulls first, weekday, start_time`,
      ),
      query(`select on_date::text as on_date, reason from blocked_dates where on_date >= current_date - 1 order by on_date`),
      query(`select id, name from locations order by id`),
    ]);
    return json({ windows, blocked, locations });
  });

type Add =
  | { kind: "window"; location_id: string; weekday?: number; on_date?: string; start_time: string; end_time: string; categories?: string[] }
  | { kind: "blocked"; on_date: string; reason?: string };

export const POST = (req: Request) =>
  adminOnly(async () => {
    const b = await body<Add>(req);
    if (b.kind === "blocked") {
      if (!isDateStr(b.on_date)) throw new BookingError("invalid", "Data inválida.");
      await query(
        `insert into blocked_dates (on_date, reason) values ($1,$2) on conflict (on_date) do update set reason = excluded.reason`,
        [b.on_date, b.reason ?? null],
      );
      return json({ ok: true }, 201);
    }
    if (b.kind !== "window") throw new BookingError("invalid", "Tipo inválido.");
    if (!HHMM.test(b.start_time) || !HHMM.test(b.end_time) || b.end_time <= b.start_time) {
      throw new BookingError("invalid", "Horário inválido: o fim precisa ser depois do início.");
    }
    const weekly = b.weekday !== undefined && b.weekday !== null;
    if (weekly === (b.on_date !== undefined && b.on_date !== null)) {
      throw new BookingError("invalid", "Informe um dia da semana OU uma data específica.");
    }
    if (weekly && !(Number.isInteger(b.weekday) && b.weekday! >= 0 && b.weekday! <= 6)) throw new BookingError("invalid", "Dia da semana inválido.");
    if (!weekly && !isDateStr(b.on_date)) throw new BookingError("invalid", "Data inválida.");
    const cats = b.categories && b.categories.length > 0 ? b.categories : null;
    await query(
      `insert into schedule_windows (location_id, weekday, on_date, start_time, end_time, categories) values ($1,$2,$3,$4,$5,$6)`,
      [b.location_id, weekly ? b.weekday : null, weekly ? null : b.on_date, b.start_time, b.end_time, cats],
    );
    return json({ ok: true }, 201);
  });

export const DELETE = (req: Request) =>
  adminOnly(async () => {
    const b = await body<{ kind?: string; id?: number; on_date?: string }>(req);
    if (b.kind === "window") await query(`delete from schedule_windows where id = $1`, [Number(b.id)]);
    else if (b.kind === "blocked" && isDateStr(b.on_date)) await query(`delete from blocked_dates where on_date = $1`, [b.on_date]);
    else throw new BookingError("invalid", "Requisição inválida.");
    return json({ ok: true });
  });
