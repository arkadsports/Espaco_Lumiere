import { query } from "./db";
import { generateSlots, type Busy, type Slot, type Win } from "./slots";
import { addDays, atLocal, isDateStr, localDate, weekday } from "./time";

export const STEP_MIN = Number(process.env.SLOT_STEP_MIN || 30);
export const MIN_LEAD_MIN = Number(process.env.MIN_LEAD_HOURS || 3) * 60;
export const MAX_DAYS_AHEAD = Number(process.env.MAX_DAYS_AHEAD || 60);
export const CANCEL_MIN_HOURS = Number(process.env.CANCEL_MIN_HOURS || 4);
const MAX_ACTIVE_PER_PHONE = 3;

export type Service = {
  id: string;
  category: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number | null;
  variants: string[];
  variant_label: string | null;
  resource: string;
  active: boolean;
};

export class BookingError extends Error {
  code: "conflict" | "invalid" | "unavailable" | "limit" | "not_found" | "too_late";
  constructor(code: BookingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function listServices(includeInactive = false): Promise<Service[]> {
  return query<Service>(
    `select id, category, name, description, duration_min, price_cents, variants, variant_label, resource, active
       from services ${includeInactive ? "" : "where active"} order by sort, name`,
  );
}

export async function getService(id: string): Promise<Service | null> {
  const rows = await query<Service>(
    `select id, category, name, description, duration_min, price_cents, variants, variant_label, resource, active
       from services where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

type WinRow = Win & { weekday: number | null; on_date: string | null };
type Ctx = { weekly: WinRow[]; dated: WinRow[]; blocked: Set<string>; busy: Busy[] };

async function loadCtx(from: string, to: string, resource: string): Promise<Ctx> {
  const [weekly, dated, blocked, busy] = await Promise.all([
    query<WinRow>(
      `select location_id, weekday, null::text as on_date, start_time::text, end_time::text, categories
         from schedule_windows where weekday is not null`,
    ),
    query<WinRow>(
      `select location_id, null::int as weekday, on_date::text, start_time::text, end_time::text, categories
         from schedule_windows where on_date between $1 and $2`,
      [from, to],
    ),
    query<{ on_date: string }>(`select on_date::text from blocked_dates where on_date between $1 and $2`, [from, to]),
    query<{ start_at: string; end_at: string }>(
      `select start_at, end_at from appointments
        where resource = $1 and status <> 'cancelled' and start_at < $3 and end_at > $2`,
      [resource, atLocal(from, "00:00").toISOString(), atLocal(addDays(to, 1), "00:00").toISOString()],
    ),
  ]);
  return {
    weekly,
    dated,
    blocked: new Set(blocked.map((b) => b.on_date)),
    busy: busy.map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) })),
  };
}

/** Datas específicas (ex.: dias em Natal) substituem completamente o horário semanal daquele dia. */
function windowsFor(ctx: Ctx, date: string): Win[] {
  if (ctx.blocked.has(date)) return [];
  const dated = ctx.dated.filter((w) => w.on_date === date);
  if (dated.length > 0) return dated;
  return ctx.weekly.filter((w) => w.weekday === weekday(date));
}

function slotsFor(ctx: Ctx, service: Service, date: string, now: Date, minLeadMin: number): Slot[] {
  return generateSlots({
    date,
    windows: windowsFor(ctx, date),
    category: service.category,
    durationMin: service.duration_min,
    stepMin: STEP_MIN,
    busy: ctx.busy,
    now,
    minLeadMin,
  });
}

export async function slotsForDate(service: Service, date: string, opts: { ignoreLead?: boolean } = {}) {
  if (!isDateStr(date)) throw new BookingError("invalid", "Data inválida.");
  const ctx = await loadCtx(date, date, service.resource);
  return slotsFor(ctx, service, date, new Date(), opts.ignoreLead ? -24 * 60 : MIN_LEAD_MIN);
}

/** Resumo por dia, para pintar o calendário. */
export async function availabilityRange(service: Service, from: string, days: number) {
  const today = localDate(new Date());
  const start = from < today ? today : from;
  const span = Math.min(Math.max(days, 1), MAX_DAYS_AHEAD + 1);
  const end = addDays(start, span - 1);
  const ctx = await loadCtx(start, end, service.resource);
  const now = new Date();
  const out: Record<string, { count: number; location_id: string }> = {};
  for (let i = 0; i < span; i++) {
    const date = addDays(start, i);
    const slots = slotsFor(ctx, service, date, now, MIN_LEAD_MIN);
    if (slots.length > 0) out[date] = { count: slots.length, location_id: slots[0].location_id };
  }
  return out;
}

export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!/^55\d{10,11}$/.test(d)) throw new BookingError("invalid", "Telefone inválido. Use DDD + número.");
  return d;
}

export type Appointment = {
  id: string;
  service_id: string;
  service_name: string;
  location_id: string;
  start_at: string;
  end_at: string;
  variant: string | null;
  client_name: string;
  client_phone: string;
  notes: string | null;
  status: string;
  source: string;
  cancel_token: string;
};

const APPT_SELECT = `select a.id, a.service_id, s.name as service_name, a.location_id, a.start_at, a.end_at, a.variant,
  a.client_name, a.client_phone, a.notes, a.status, a.source, a.cancel_token
  from appointments a join services s on s.id = a.service_id`;

export async function createAppointment(input: {
  serviceId: string;
  start: string;
  variant?: string | null;
  name: string;
  phone: string;
  notes?: string | null;
  source: "site" | "whatsapp" | "admin";
}): Promise<Appointment> {
  const service = await getService(input.serviceId);
  if (!service || !service.active) throw new BookingError("invalid", "Serviço não encontrado.");

  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) throw new BookingError("invalid", "Informe seu nome.");
  const phone = normalizePhone(input.phone);

  let variant: string | null = null;
  if (service.variants.length > 0) {
    if (!input.variant || !service.variants.includes(input.variant)) {
      throw new BookingError("invalid", `Escolha uma opção de ${service.variant_label ?? "estilo"}.`);
    }
    variant = input.variant;
  }

  const startDate = new Date(input.start);
  if (Number.isNaN(startDate.getTime())) throw new BookingError("invalid", "Horário inválido.");
  const date = localDate(startDate);
  const ignoreLead = input.source === "admin";

  const slots = await slotsForDate(service, date, { ignoreLead });
  const slot = slots.find((s) => s.start === startDate.toISOString());
  if (!slot) throw new BookingError("unavailable", "Esse horário não está mais disponível. Escolha outro.");

  if (input.source !== "admin") {
    const [{ n }] = await query<{ n: number }>(
      `select count(*)::int as n from appointments where client_phone = $1 and status = 'confirmed' and start_at > now()`,
      [phone],
    );
    if (n >= MAX_ACTIVE_PER_PHONE) {
      throw new BookingError("limit", "Você já tem vários agendamentos ativos. Fale conosco pelo WhatsApp.");
    }
  }

  const end = new Date(startDate.getTime() + service.duration_min * 60_000);
  try {
    const rows = await query<{ id: string }>(
      `insert into appointments (service_id, resource, location_id, start_at, end_at, variant, client_name, client_phone, notes, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [service.id, service.resource, slot.location_id, startDate.toISOString(), end.toISOString(), variant, name, phone, input.notes?.slice(0, 300) ?? null, input.source],
    );
    return (await getAppointment(rows[0].id))!;
  } catch (e) {
    // 23P01 = violação da exclusion constraint: alguém reservou no mesmo instante.
    if ((e as { code?: string }).code === "23P01") {
      throw new BookingError("conflict", "Esse horário acabou de ser reservado. Escolha outro.");
    }
    throw e;
  }
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const rows = await query<Appointment>(`${APPT_SELECT} where a.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getAppointmentByToken(token: string): Promise<Appointment | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const rows = await query<Appointment>(`${APPT_SELECT} where a.cancel_token = $1`, [token]);
  return rows[0] ?? null;
}

export async function upcomingForPhone(phone: string): Promise<Appointment[]> {
  return query<Appointment>(
    `${APPT_SELECT} where a.client_phone = $1 and a.status = 'confirmed' and a.start_at > now() order by a.start_at`,
    [phone],
  );
}

export async function cancelAppointment(appt: Appointment, opts: { force?: boolean } = {}) {
  if (appt.status !== "confirmed") throw new BookingError("invalid", "Este agendamento não está ativo.");
  const hoursLeft = (new Date(appt.start_at).getTime() - Date.now()) / 3_600_000;
  if (!opts.force && hoursLeft < CANCEL_MIN_HOURS) {
    throw new BookingError("too_late", `Cancelamentos online só até ${CANCEL_MIN_HOURS}h antes. Fale conosco pelo WhatsApp.`);
  }
  await query(`update appointments set status = 'cancelled' where id = $1`, [appt.id]);
}
