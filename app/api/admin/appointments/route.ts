import { APPT_SELECT, BookingError, cancelAppointment, createAppointment, getAppointment, type Appointment } from "@/lib/booking";
import { query } from "@/lib/db";
import { adminOnly, body, json } from "@/lib/http";
import { addDays, atLocal, isDateStr, localDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  adminOnly(async () => {
    const p = new URL(req.url).searchParams;
    const from = isDateStr(p.get("from")) ? p.get("from")! : localDate(new Date());
    const to = isDateStr(p.get("to")) ? p.get("to")! : from;
    const rows = await query<Appointment>(
      `${APPT_SELECT}
        where a.start_at >= $1 and a.start_at < $2
        order by a.start_at`,
      [atLocal(from, "00:00").toISOString(), atLocal(addDays(to, 1), "00:00").toISOString()],
    );
    return json({ appointments: rows });
  });

export const POST = (req: Request) =>
  adminOnly(async () => {
    const b = await body<{ service?: string; professional?: string; start?: string; variant?: string; name?: string; phone?: string; notes?: string }>(req);
    const appt = await createAppointment({
      serviceId: String(b.service ?? ""),
      start: String(b.start ?? ""),
      professionalId: b.professional || null,
      variant: b.variant ?? null,
      name: String(b.name ?? ""),
      phone: String(b.phone ?? ""),
      notes: b.notes ?? null,
      source: "admin",
    });
    return json({ appointment: appt }, 201);
  });

export const PATCH = (req: Request) =>
  adminOnly(async () => {
    const { id, status } = await body<{ id?: string; status?: string }>(req);
    const appt = await getAppointment(String(id ?? ""));
    if (!appt) throw new BookingError("not_found", "Agendamento não encontrado.");
    if (status === "cancelled") {
      await cancelAppointment(appt, { force: true });
    } else if (status === "completed" || status === "no_show" || status === "confirmed") {
      await query(`update appointments set status = $2 where id = $1`, [appt.id, status]);
    } else {
      throw new BookingError("invalid", "Status inválido.");
    }
    return json({ ok: true });
  });
