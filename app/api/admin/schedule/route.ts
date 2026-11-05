import { BookingError } from "@/lib/booking";
import { query } from "@/lib/db";
import { adminOnly, body, json } from "@/lib/http";
import { isDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

const HHMM = /^\d{2}:\d{2}$/;

export const GET = () =>
  adminOnly(async () => {
    const [windows, blocked, locations, professionals] = await Promise.all([
      query(
        `select id, professional_id, location_id, weekday, on_date::text as on_date, start_time::text as start_time, end_time::text as end_time
           from schedule_windows order by on_date nulls first, weekday, start_time`,
      ),
      query(`select id, on_date::text as on_date, professional_id, reason from blocked_dates where on_date >= current_date - 1 order by on_date`),
      query(`select id, name from locations order by id`),
      query(`select id, name from professionals order by sort, name`),
    ]);
    return json({ windows, blocked, locations, professionals });
  });

type Add =
  | { kind: "window"; professional_id: string; location_id: string; weekday?: number | null; on_date?: string | null; start_time: string; end_time: string }
  | { kind: "blocked"; on_date: string; professional_id?: string | null; reason?: string };

export const POST = (req: Request) =>
  adminOnly(async () => {
    const b = await body<Add>(req);
    if (b.kind === "blocked") {
      if (!isDateStr(b.on_date)) throw new BookingError("invalid", "Data inválida.");
      await query(
        `insert into blocked_dates (on_date, professional_id, reason) values ($1,$2,$3)
         on conflict (on_date, coalesce(professional_id, '')) do update set reason = excluded.reason`,
        [b.on_date, b.professional_id || null, b.reason?.slice(0, 120) || null],
      );
      return json({ ok: true }, 201);
    }
    if (b.kind !== "window") throw new BookingError("invalid", "Tipo inválido.");
    if (!b.professional_id) throw new BookingError("invalid", "Escolha a profissional.");
    if (!HHMM.test(b.start_time) || !HHMM.test(b.end_time) || b.end_time <= b.start_time) {
      throw new BookingError("invalid", "Horário inválido: o fim precisa ser depois do início.");
    }
    const weekly = b.weekday !== undefined && b.weekday !== null;
    if (weekly === (b.on_date !== undefined && b.on_date !== null && b.on_date !== "")) {
      throw new BookingError("invalid", "Informe um dia da semana OU uma data específica.");
    }
    if (weekly && !(Number.isInteger(b.weekday) && b.weekday! >= 0 && b.weekday! <= 6)) throw new BookingError("invalid", "Dia da semana inválido.");
    if (!weekly && !isDateStr(b.on_date)) throw new BookingError("invalid", "Data inválida.");
    await query(
      `insert into schedule_windows (professional_id, location_id, weekday, on_date, start_time, end_time) values ($1,$2,$3,$4,$5,$6)`,
      [b.professional_id, b.location_id, weekly ? b.weekday : null, weekly ? null : b.on_date, b.start_time, b.end_time],
    );
    return json({ ok: true }, 201);
  });

export const DELETE = (req: Request) =>
  adminOnly(async () => {
    const b = await body<{ kind?: string; id?: number }>(req);
    if (b.kind === "window") await query(`delete from schedule_windows where id = $1`, [Number(b.id)]);
    else if (b.kind === "blocked") await query(`delete from blocked_dates where id = $1`, [Number(b.id)]);
    else throw new BookingError("invalid", "Requisição inválida.");
    return json({ ok: true });
  });
