import { availabilityRange, BookingError, getService, MAX_DAYS_AHEAD } from "@/lib/booking";
import { handle, json } from "@/lib/http";
import { isDateStr, localDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(async () => {
    const p = new URL(req.url).searchParams;
    const service = await getService(p.get("service") ?? "");
    if (!service || !service.active) throw new BookingError("not_found", "Serviço não encontrado.");
    const from = p.get("from");
    const dates = await availabilityRange(
      service,
      isDateStr(from) ? from : localDate(new Date()),
      Number(p.get("days")) || MAX_DAYS_AHEAD,
      p.get("professional"),
    );
    return json({ dates });
  });
