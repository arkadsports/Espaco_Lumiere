import { createAppointment } from "@/lib/booking";
import { body, handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Payload = {
  service?: string;
  start?: string;
  variant?: string;
  professional?: string;
  name?: string;
  phone?: string;
  notes?: string;
  website?: string; // honeypot
};

export const POST = (req: Request) =>
  handle(async () => {
    const b = await body<Payload>(req);
    if (b.website) return json({ ok: true }); // bot: finge sucesso, não grava
    const appt = await createAppointment({
      serviceId: String(b.service ?? ""),
      start: String(b.start ?? ""),
      professionalId: b.professional || null,
      variant: b.variant ?? null,
      name: String(b.name ?? ""),
      phone: String(b.phone ?? ""),
      notes: b.notes ?? null,
      source: "site",
    });
    return json({ appointment: appt }, 201);
  });
