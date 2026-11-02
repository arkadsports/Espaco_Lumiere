import { BookingError, getService, slotsForDate } from "@/lib/booking";
import { isAdmin } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { isDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(async () => {
    const p = new URL(req.url).searchParams;
    const service = await getService(p.get("service") ?? "");
    if (!service || !service.active) throw new BookingError("not_found", "Serviço não encontrado.");
    const date = p.get("date");
    if (!isDateStr(date)) throw new BookingError("invalid", "Data inválida.");
    const ignoreLead = p.get("admin") === "1" && (await isAdmin());
    return json({ slots: await slotsForDate(service, date, { ignoreLead }) });
  });
