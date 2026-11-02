"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Service = {
  id: string;
  category: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number | null;
  variants: string[];
  variant_label: string | null;
};
type Cat = { id: string; name: string };
type Loc = { id: string; name: string; address: string };
type Slot = { start: string; time: string; location_id: string };
type Avail = Record<string, { count: number; location_id: string }>;
type Result = { id: string; service_name: string; variant: string | null; start_at: string; location_id: string; cancel_token: string };

const TZ = "America/Fortaleza";
const money = (c: number | null) => (c == null ? "Sob consulta" : (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const longDate = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00Z`));
const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${ym}-15T12:00:00Z`));
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const localTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const localDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

export default function BookingFlow({
  services,
  categories,
  locations,
  initialService,
  initialCategory,
}: {
  services: Service[];
  categories: Cat[];
  locations: Loc[];
  initialService?: string;
  initialCategory?: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceId, setServiceId] = useState<string | null>(initialService ?? null);
  const [variant, setVariant] = useState<string | null>(null);
  const [avail, setAvail] = useState<Avail | null>(null);
  const [month, setMonth] = useState<string>(todayStr().slice(0, 7));
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const loc = (id: string) => locations.find((l) => l.id === id);

  const loadAvail = useCallback(async (id: string) => {
    setAvail(null);
    setError("");
    try {
      const r = await fetch(`/api/availability?service=${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setAvail(j.dates);
      const first = Object.keys(j.dates).sort()[0];
      if (first) setMonth(first.slice(0, 7));
    } catch {
      setError("Não foi possível carregar a agenda. Tente novamente.");
      setAvail({});
    }
  }, []);

  const loadSlots = useCallback(async (id: string, d: string) => {
    setSlots(null);
    setSlot(null);
    try {
      const r = await fetch(`/api/slots?service=${id}&date=${d}`);
      const j = await r.json();
      setSlots(r.ok ? j.slots : []);
    } catch {
      setSlots([]);
    }
  }, []);

  useEffect(() => {
    if (step === 2 && serviceId && avail === null) void loadAvail(serviceId);
  }, [step, serviceId, avail, loadAvail]);

  function pickService(id: string) {
    setServiceId(id);
    setVariant(null);
    setAvail(null);
    setDate(null);
    setSlots(null);
    setSlot(null);
  }

  function pickDate(d: string) {
    setDate(d);
    if (serviceId) void loadSlots(serviceId, d);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !slot) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: service.id, start: slot.start, variant, name: form.name, phone: form.phone, notes: form.notes, website: form.website }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Não foi possível agendar.");
        if (r.status === 409 && date) {
          // horário perdido para outra pessoa: volta e recarrega a agenda
          setStep(2);
          void loadAvail(service.id);
          void loadSlots(service.id, date);
        }
        return;
      }
      setResult(j.appointment ?? null);
      setStep(4);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const needsVariant = !!service && service.variants.length > 0;
  const step1Ok = !!service && (!needsVariant || !!variant);

  // ---------- calendário ----------
  const calendar = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { first, days };
  }, [month]);
  const minMonth = todayStr().slice(0, 7);
  const maxMonth = avail && Object.keys(avail).length ? Object.keys(avail).sort().at(-1)!.slice(0, 7) : minMonth;

  if (step === 4 && result) {
    const day = localDay(result.start_at);
    const l = loc(result.location_id);
    return (
      <div className="booking-card success">
        <div className="check">✓</div>
        <h1>Agendamento confirmado</h1>
        <p className="hint">Esperamos você! Guarde os detalhes abaixo.</p>
        <div className="summary">
          <dl>
            <dt>Serviço</dt>
            <dd>
              {result.service_name}
              {result.variant ? ` · ${result.variant}` : ""}
            </dd>
            <dt>Quando</dt>
            <dd>
              {longDate(day)} às {localTime(result.start_at)}
            </dd>
            <dt>Onde</dt>
            <dd>{l?.address ?? ""}</dd>
          </dl>
        </div>
        <div className="actions-row">
          <Link href={`/agendamento/${result.cancel_token}`} className="btn btn-ghost">
            Ver / cancelar agendamento
          </Link>
          <Link href="/" className="btn btn-gold">
            Voltar ao início
          </Link>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 18 }}>
          Guarde o link do botão acima: é por ele que você pode cancelar.
        </p>
      </div>
    );
  }

  return (
    <div className="booking-card">
      <div className="steps" aria-label={`Passo ${step} de 3`}>
        {[1, 2, 3].map((n) => (
          <i key={n} className={n <= step ? "on" : ""} />
        ))}
      </div>

      {step === 1 && (
        <>
          <h1>O que vamos fazer hoje?</h1>
          <p className="hint">Escolha o serviço{needsVariant ? " e o estilo" : ""}.</p>
          {categories
            .filter((c) => services.some((s) => s.category === c.id))
            .sort((a, b) => (a.id === initialCategory ? -1 : b.id === initialCategory ? 1 : 0))
            .map((c) => (
              <div key={c.id}>
                <div className="group-title">{c.name}</div>
                <div className="options">
                  {services
                    .filter((s) => s.category === c.id)
                    .map((s) => (
                      <button key={s.id} type="button" className={`opt ${serviceId === s.id ? "sel" : ""}`} onClick={() => pickService(s.id)} aria-pressed={serviceId === s.id}>
                        <span>
                          <strong>{s.name}</strong>
                          <small>
                            {dur(s.duration_min)} · {s.description}
                          </small>
                        </span>
                        <span className="price-tag">{money(s.price_cents)}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          {needsVariant && service && (
            <>
              <div className="group-title">{service.variant_label ?? "Estilo"}</div>
              <div className="chips">
                {service.variants.map((v) => (
                  <button key={v} type="button" className={`chip ${variant === v ? "sel" : ""}`} onClick={() => setVariant(v)} aria-pressed={variant === v}>
                    {v}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="nav-row">
            <span />
            <button className="btn btn-gold" disabled={!step1Ok} onClick={() => setStep(2)}>
              Escolher data
            </button>
          </div>
        </>
      )}

      {step === 2 && service && (
        <>
          <h1>Escolha o dia e o horário</h1>
          <p className="hint">
            {service.name}
            {variant ? ` · ${variant}` : ""} · {dur(service.duration_min)}
          </p>

          {avail === null ? (
            <p className="center muted">Carregando agenda…</p>
          ) : Object.keys(avail).length === 0 ? (
            <p className="center muted">Não há horários livres nos próximos dias. Fale conosco pelo WhatsApp para combinarmos.</p>
          ) : (
            <>
              <div className="cal-head">
                <button type="button" aria-label="Mês anterior" disabled={month <= minMonth} onClick={() => setMonth(shiftMonth(month, -1))}>
                  ‹
                </button>
                <strong>{monthLabel(month)}</strong>
                <button type="button" aria-label="Próximo mês" disabled={month >= maxMonth} onClick={() => setMonth(shiftMonth(month, 1))}>
                  ›
                </button>
              </div>
              <div className="cal">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <div className="dow" key={i} aria-hidden>
                    {d}
                  </div>
                ))}
                {Array.from({ length: calendar.first }).map((_, i) => (
                  <div key={`b${i}`} />
                ))}
                {Array.from({ length: calendar.days }).map((_, i) => {
                  const d = `${month}-${String(i + 1).padStart(2, "0")}`;
                  const a = avail[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!a}
                      className={`day ${a ? "av" : ""} ${date === d ? "sel" : ""}`}
                      onClick={() => pickDate(d)}
                      aria-label={a ? `${longDate(d)}, ${a.count} horários` : `${longDate(d)}, sem horários`}
                    >
                      {i + 1}
                      {a && a.location_id !== "angicos" && <span className="dot" />}
                    </button>
                  );
                })}
              </div>
              <div className="legend">
                <span>Dias destacados têm horários livres</span>
                <span>
                  <i />
                  Natal
                </span>
              </div>
            </>
          )}

          {date && (
            <>
              {slots && slots[0] && <div className="loc-note">Atendimento em {loc(slots[0].location_id)?.name}. {loc(slots[0].location_id)?.address}</div>}
              <div className="group-title">{longDate(date)}</div>
              {slots === null ? (
                <p className="muted">Carregando horários…</p>
              ) : slots.length === 0 ? (
                <p className="muted">Sem horários nesse dia. Escolha outra data.</p>
              ) : (
                <div className="slots">
                  {slots.map((s) => (
                    <button key={s.start} type="button" className={`slot ${slot?.start === s.start ? "sel" : ""}`} onClick={() => setSlot(s)} aria-pressed={slot?.start === s.start}>
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {error && <p className="err" role="alert">{error}</p>}
          <div className="nav-row">
            <button className="back" onClick={() => setStep(1)}>
              ← Voltar
            </button>
            <button className="btn btn-gold" disabled={!slot} onClick={() => { setError(""); setStep(3); }}>
              Continuar
            </button>
          </div>
        </>
      )}

      {step === 3 && service && slot && date && (
        <form onSubmit={submit}>
          <h1>Quase lá</h1>
          <p className="hint">Confira e informe seus dados para confirmar.</p>
          <div className="summary">
            <dl>
              <dt>Serviço</dt>
              <dd>
                {service.name}
                {variant ? ` · ${variant}` : ""}
              </dd>
              <dt>Quando</dt>
              <dd>
                {longDate(date)} às {slot.time}
              </dd>
              <dt>Onde</dt>
              <dd>{loc(slot.location_id)?.address}</dd>
              <dt>Valor</dt>
              <dd>{money(service.price_cents)}</dd>
            </dl>
          </div>
          <div className="form">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="phone">WhatsApp</label>
              <input id="phone" required inputMode="tel" autoComplete="tel" placeholder="(84) 9 9999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="notes">Observações (opcional)</label>
              <textarea id="notes" rows={2} maxLength={300} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <div className="nav-row">
            <button type="button" className="back" onClick={() => setStep(2)}>
              ← Voltar
            </button>
            <button className="btn btn-gold" disabled={busy}>
              {busy ? "Confirmando…" : "Confirmar agendamento"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
