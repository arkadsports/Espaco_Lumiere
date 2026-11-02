import { BookingError, cancelAppointment, getAppointmentByToken } from "@/lib/booking";
import { body, handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = (req: Request) =>
  handle(async () => {
    const { token } = await body<{ token?: string }>(req);
    const appt = await getAppointmentByToken(String(token ?? ""));
    if (!appt) throw new BookingError("not_found", "Agendamento não encontrado.");
    await cancelAppointment(appt);
    return json({ ok: true });
  });
