"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, WEEKDAYS } from "@/lib/content";

type Appt = {
  id: string;
  service_id: string;
  service_name: string;
  professional_id: string;
  professional_name: string;
  location_id: string;
  start_at: string;
  end_at: string;
  variant: string | null;
  client_name: string;
  client_phone: string;
  notes: string | null;
  status: string;
  source: string;
};
type Service = { id: string; category: string; name: string; duration_min: number; price_cents: number | null; active: boolean; variants: string[]; variant_label: string | null };
type Pro = { id: string; name: string; title: string; bio: string; photo_url: string | null; categories: string[]; active: boolean; sort: number };
type Win = { id: number; professional_id: string; location_id: string; weekday: number | null; on_date: string | null; start_time: string; end_time: string };
type Blocked = { id: number; on_date: string; professional_id: string | null; reason: string | null };
type Loc = { id: string; name: string };
type Slot = { start: string; time: string; professionals: { id: string; name: string }[] };
type DayPro = { id: string; name: string; title: string; off: boolean; windows: { location_id: string; start_time: string; end_time: string }[] };

const TZ = "America/Fortaleza";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
const hhmm = (s: string) => s.slice(0, 5);
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const time = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const minuteOfDay = (iso: string) => toMin(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
const longDate = (d: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));
const SRC: Record<string, string> = { site: "site", whatsapp: "WhatsApp", admin: "manual" };
const ST: Record<string, string> = { confirmed: "Confirmado", completed: "Concluído", no_show: "Faltou", cancelled: "Cancelado" };
const LOC: Record<string, string> = { angicos: "Angicos", natal: "Natal" };

async function api<T = unknown>(url: string, method = "GET", data?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: data ? { "Content-Type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Erro");
  return j as T;
}

type Say = (m: string) => void;

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<"agenda" | "profissionais" | "horarios" | "servicos">("agenda");
  const [toast, setToast] = useState("");
  const say = useCallback<Say>((m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  }, []);

  async function logout() {
    await api("/api/admin/login", "DELETE");
    router.refresh();
  }

  const labels = { agenda: "Agenda", profissionais: "Profissionais", horarios: "Horários e datas", servicos: "Serviços e preços" } as const;
  return (
    <div className="admin wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Painel Lumière</h1>
        <button className="link-btn" onClick={logout}>
          Sair
        </button>
      </div>
      <div className="tabs" role="tablist" style={{ overflowX: "auto" }}>
        {(Object.keys(labels) as (keyof typeof labels)[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)} style={{ whiteSpace: "nowrap" }}>
            {labels[t]}
          </button>
        ))}
      </div>
      {tab === "agenda" && <Agenda say={say} />}
      {tab === "profissionais" && <Profissionais say={say} />}
      {tab === "horarios" && <Horarios say={say} />}
      {tab === "servicos" && <Servicos say={say} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Agenda

function Agenda({ say }: { say: Say }) {
  const [date, setDate] = useState(today());
  const [list, setList] = useState<Appt[] | null>(null);
  const [plan, setPlan] = useState<DayPro[]>([]);
  const [weekCount, setWeekCount] = useState<Record<string, number>>({});
  const weekStart = addDays(date, -dow(date));

  const load = useCallback(async () => {
    try {
      const [a, p, w] = await Promise.all([
        api<{ appointments: Appt[] }>(`/api/admin/appointments?from=${date}`),
        api<{ professionals: DayPro[] }>(`/api/admin/day?date=${date}`),
        api<{ appointments: Appt[] }>(`/api/admin/appointments?from=${weekStart}&to=${addDays(weekStart, 6)}`),
      ]);
      setList(a.appointments);
      setPlan(p.professionals);
      const c: Record<string, number> = {};
      for (const x of w.appointments) {
        if (x.status === "cancelled") continue;
        const d = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(x.start_at));
        c[d] = (c[d] ?? 0) + 1;
      }
      setWeekCount(c);
    } catch (e) {
      say((e as Error).message);
    }
  }, [date, weekStart, say]);
  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    if (status === "cancelled" && !confirm("Cancelar este agendamento?")) return;
    try {
      await api("/api/admin/appointments", "PATCH", { id, status });
      say("Atualizado");
      void load();
    } catch (e) {
      say((e as Error).message);
    }
  }

  const active = (list ?? []).filter((a) => a.status !== "cancelled");

  return (
    <>
      <div className="panel">
        <div className="row">
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="d">Dia</label>
            <input id="d" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <button className="link-btn" onClick={() => setDate(addDays(date, -1))}>← Anterior</button>
          <button className="link-btn" onClick={() => setDate(today())}>Hoje</button>
          <button className="link-btn" onClick={() => setDate(addDays(date, 1))}>Próximo →</button>
        </div>

        <div className="week" aria-label="Semana">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(weekStart, i);
            const n = weekCount[d] ?? 0;
            return (
              <button key={d} className={d === date ? "sel" : ""} onClick={() => setDate(d)} aria-label={`${longDate(d)}, ${n} agendamentos`}>
                <small>{WEEKDAYS[i].slice(0, 3)}</small>
                <b>{d.slice(8)}</b>
                <i>{n === 0 ? "livre" : `${n} ag.`}</i>
              </button>
            );
          })}
        </div>

        <h3 style={{ marginTop: 18 }}>
          {longDate(date)} <span className="muted" style={{ fontSize: "1rem", fontFamily: "var(--sans)" }}>· {active.length} agendamento{active.length === 1 ? "" : "s"}</span>
        </h3>
        <DayGrid plan={plan} appts={list ?? []} />
        <div className="legend-row">
          <span><i style={{ background: "#fbf8f3" }} />Expediente (livre)</span>
          <span><i style={{ background: "#e9d6a8" }} />Agendado</span>
          <span><i style={{ background: "#cfe3d2" }} />Concluído</span>
          <span><i style={{ background: "#ecc8c1" }} />Faltou</span>
          <span><i style={{ background: "#f1ebe3" }} />Fora do expediente</span>
        </div>
      </div>

      <div className="panel">
        <h3>Atendimentos do dia</h3>
        {list === null ? (
          <p className="muted">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="muted">Nenhum agendamento neste dia.</p>
        ) : (
          <div className="list">
            {list.map((a) => (
              <div key={a.id} className={`item ${a.status === "cancelled" ? "cancelled" : ""}`}>
                <div>
                  <strong>{time(a.start_at)}</strong> · {a.client_name} <span className="badge">{LOC[a.location_id] ?? a.location_id}</span>{" "}
                  <span className={`badge ${a.status}`}>{ST[a.status]}</span>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {a.service_name}
                    {a.variant ? ` · ${a.variant}` : ""} · com {a.professional_name} ·{" "}
                    <a href={`https://wa.me/${a.client_phone}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                      {a.client_phone}
                    </a>{" "}
                    · via {SRC[a.source] ?? a.source}
                    {a.notes ? ` · “${a.notes}”` : ""}
                  </div>
                </div>
                {a.status !== "cancelled" && (
                  <div className="actions">
                    {a.status !== "completed" && <button className="link-btn" onClick={() => setStatus(a.id, "completed")}>Concluído</button>}
                    {a.status !== "no_show" && <button className="link-btn" onClick={() => setStatus(a.id, "no_show")}>Faltou</button>}
                    <button className="link-btn danger" onClick={() => setStatus(a.id, "cancelled")}>Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Manual say={say} date={date} onDone={load} />
    </>
  );
}

/** Grade do dia: uma coluna por profissional, linhas de 30 min. */
function DayGrid({ plan, appts }: { plan: DayPro[]; appts: Appt[] }) {
  const STEP = 30;
  const { start, rows } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of plan) for (const w of p.windows) (lo = Math.min(lo, toMin(w.start_time)), (hi = Math.max(hi, toMin(w.end_time))));
    for (const a of appts) if (a.status !== "cancelled") (lo = Math.min(lo, minuteOfDay(a.start_at)), (hi = Math.max(hi, minuteOfDay(a.end_at))));
    if (!Number.isFinite(lo)) return { start: 8 * 60, rows: 0 };
    const s = Math.floor(lo / 60) * 60;
    return { start: s, rows: Math.ceil((hi - s) / STEP) };
  }, [plan, appts]);

  if (plan.length === 0) return <p className="muted">Nenhuma profissional cadastrada. Cadastre na aba Profissionais.</p>;
  if (rows === 0) return <p className="muted">Ninguém atende neste dia (sem expediente e sem agendamentos).</p>;

  const open = (p: DayPro, m: number) => !p.off && p.windows.some((w) => m >= toMin(w.start_time) && m < toMin(w.end_time));
  return (
    <div style={{ overflowX: "auto" }}>
      <div className="grid-day" style={{ gridTemplateColumns: `56px repeat(${plan.length}, minmax(150px, 1fr))`, minWidth: 56 + plan.length * 150 }}>
        <div className="hd" style={{ gridColumn: 1, borderLeft: 0 }} />
        {plan.map((p, i) => (
          <div className="hd" key={p.id} style={{ gridColumn: i + 2 }}>
            {p.name}
            {p.off && <div className="muted" style={{ fontWeight: 300, fontSize: "0.7rem" }}>folga</div>}
          </div>
        ))}
        {Array.from({ length: rows }).map((_, r) => {
          const m = start + r * STEP;
          return (
            <div key={`h${r}`} style={{ display: "contents" }}>
              <div className="hour" style={{ gridColumn: 1, gridRow: r + 2 }}>{m % 60 === 0 ? fromMin(m) : ""}</div>
              {plan.map((p, i) => (
                <div key={p.id} className={`cell ${open(p, m) ? "open" : ""}`} style={{ gridColumn: i + 2, gridRow: r + 2 }} />
              ))}
            </div>
          );
        })}
        {appts
          .filter((a) => a.status !== "cancelled")
          .map((a) => {
            const col = plan.findIndex((p) => p.id === a.professional_id);
            if (col < 0) return null;
            const s = minuteOfDay(a.start_at);
            const e = minuteOfDay(a.end_at);
            const r0 = Math.max(0, Math.floor((s - start) / STEP));
            const span = Math.max(1, Math.ceil((e - start) / STEP) - r0);
            return (
              <div key={a.id} className={`appt ${a.status}`} style={{ gridColumn: col + 2, gridRow: `${r0 + 2} / span ${span}` }} title={`${a.client_name} · ${a.service_name}`}>
                <b>{time(a.start_at)}</b> {a.client_name}
                <div className="muted" style={{ fontSize: "0.72rem" }}>
                  {a.service_name}
                  {a.variant ? ` · ${a.variant.replace("Volume ", "")}` : ""}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function Manual({ say, date, onDone }: { say: Say; date: string; onDone: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [pros, setPros] = useState<Pro[]>([]);
  const [f, setF] = useState({ service: "", professional: "", variant: "", date, start: "", name: "", phone: "" });
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => {
    api<{ services: Service[] }>("/api/admin/services").then((j) => setServices(j.services.filter((s) => s.active))).catch(() => {});
    api<{ professionals: Pro[] }>("/api/admin/professionals").then((j) => setPros(j.professionals.filter((p) => p.active))).catch(() => {});
  }, []);
  useEffect(() => setF((x) => ({ ...x, date, start: "" })), [date]);
  useEffect(() => {
    if (!f.service) return setSlots([]);
    api<{ slots: Slot[] }>(`/api/slots?service=${f.service}&date=${f.date}&admin=1${f.professional ? `&professional=${f.professional}` : ""}`)
      .then((j) => setSlots(j.slots))
      .catch(() => setSlots([]));
  }, [f.service, f.date, f.professional]);
  const svc = services.find((s) => s.id === f.service);
  const cands = pros.filter((p) => svc && p.categories.includes(svc.category));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/admin/appointments", "POST", f);
      say("Agendamento criado");
      setF({ ...f, start: "", name: "", phone: "" });
      onDone();
    } catch (err) {
      say((err as Error).message);
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <h3>Novo agendamento manual</h3>
      <p className="muted" style={{ marginTop: -8 }}>Para atendimentos combinados por Instagram, telefone ou presencialmente. O horário fica bloqueado também para o site e o WhatsApp.</p>
      <div className="row">
        <div className="field">
          <label>Serviço</label>
          <select required value={f.service} onChange={(e) => setF({ ...f, service: e.target.value, professional: "", variant: "", start: "" })}>
            <option value="">Selecione</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {svc && svc.variants.length > 0 && (
          <div className="field">
            <label>{svc.variant_label ?? "Estilo"}</label>
            <select required value={f.variant} onChange={(e) => setF({ ...f, variant: e.target.value })}>
              <option value="">Selecione</option>
              {svc.variants.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        )}
        {svc && (
          <div className="field">
            <label>Profissional</label>
            <select value={f.professional} onChange={(e) => setF({ ...f, professional: e.target.value, start: "" })}>
              <option value="">Qualquer disponível</option>
              {cands.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Dia</label>
          <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, start: "" })} />
        </div>
        <div className="field">
          <label>Horário</label>
          <select required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })}>
            <option value="">{slots.length ? "Selecione" : "Sem horários"}</option>
            {slots.map((s) => (
              <option key={s.start} value={s.start}>{s.time}{s.professionals.length ? ` · ${s.professionals.map((p) => p.name).join(", ")}` : ""}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Cliente</label>
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="field">
          <label>WhatsApp</label>
          <input required inputMode="tel" placeholder="(84) 9 9999-9999" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <button className="btn btn-gold btn-sm">Salvar</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Profissionais

const EMPTY: Pro = { id: "", name: "", title: "", bio: "", photo_url: "", categories: [], active: true, sort: 100 };

function ProForm({ initial, say, onSaved }: { initial: Pro; say: Say; onSaved: () => void }) {
  const [p, setP] = useState<Pro>({ ...initial, photo_url: initial.photo_url ?? "" });
  const isNew = !initial.id;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/admin/professionals", isNew ? "POST" : "PATCH", p);
      say(isNew ? "Profissional cadastrada" : "Salvo");
      if (isNew) setP(EMPTY);
      onSaved();
    } catch (err) {
      say((err as Error).message);
    }
  }
  return (
    <form className="pro-form" onSubmit={save}>
      <div className="row">
        <div className="field"><label>Nome</label><input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
        <div className="field"><label>Função (ex.: Lash designer)</label><input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></div>
        <div className="field" style={{ maxWidth: 110, minWidth: 90 }}><label>Ordem</label><input type="number" value={p.sort} onChange={(e) => setP({ ...p, sort: Number(e.target.value) })} /></div>
      </div>
      <div className="field"><label>Apresentação (aparece no site)</label><textarea rows={2} maxLength={400} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></div>
      <div className="field">
        <label>Foto (link https:// ou caminho, ex.: /profissionais/ana.jpg)</label>
        <input value={p.photo_url ?? ""} onChange={(e) => setP({ ...p, photo_url: e.target.value })} placeholder="Opcional" />
      </div>
      <div className="chips">
        <span className="muted" style={{ fontSize: "0.85rem", alignSelf: "center" }}>Atende:</span>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`chip ${p.categories.includes(c.id) ? "sel" : ""}`} aria-pressed={p.categories.includes(c.id)} onClick={() => setP({ ...p, categories: p.categories.includes(c.id) ? p.categories.filter((x) => x !== c.id) : [...p.categories, c.id] })}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="row" style={{ alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} /> Ativa (aparece no site e na agenda)
        </label>
        <button className="btn btn-gold btn-sm">{isNew ? "Cadastrar" : "Salvar"}</button>
      </div>
    </form>
  );
}

function Profissionais({ say }: { say: Say }) {
  const [list, setList] = useState<Pro[] | null>(null);
  const load = useCallback(() => api<{ professionals: Pro[] }>("/api/admin/professionals").then((j) => setList(j.professionals)).catch((e) => say(e.message)), [say]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!list) return <p className="muted">Carregando…</p>;
  return (
    <>
      <div className="panel">
        <h3>Nova profissional</h3>
        <p className="muted" style={{ marginTop: -8 }}>Depois de cadastrar, defina os dias e horários dela na aba Horários e datas.</p>
        <ProForm initial={EMPTY} say={say} onSaved={load} />
      </div>
      {list.map((p) => (
        <div className="panel" key={p.id}>
          <h3>{p.name} {!p.active && <span className="badge">inativa</span>}</h3>
          <ProForm initial={p} say={say} onSaved={load} />
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Horários

function Horarios({ say }: { say: Say }) {
  const [data, setData] = useState<{ windows: Win[]; blocked: Blocked[]; locations: Loc[]; professionals: { id: string; name: string }[] } | null>(null);
  const load = useCallback(() => api<NonNullable<typeof data>>("/api/admin/schedule").then(setData).catch((e) => say(e.message)), [say]);
  useEffect(() => {
    void load();
  }, [load]);

  const [w, setW] = useState({ professional_id: "", location_id: "angicos", weekday: "2", start_time: "09:00", end_time: "12:00" });
  const [d, setD] = useState({ professional_id: "", location_id: "natal", on_date: "", start_time: "09:00", end_time: "17:00" });
  const [b, setB] = useState({ on_date: "", professional_id: "", reason: "" });

  const add = async (payload: unknown, ok: string) => {
    try {
      await api("/api/admin/schedule", "POST", payload);
      say(ok);
      void load();
    } catch (e) {
      say((e as Error).message);
    }
  };
  const del = async (payload: unknown) => {
    try {
      await api("/api/admin/schedule", "DELETE", payload);
      void load();
    } catch (e) {
      say((e as Error).message);
    }
  };

  if (!data) return <p className="muted">Carregando…</p>;
  if (data.professionals.length === 0) return <p className="muted">Cadastre uma profissional primeiro (aba Profissionais).</p>;
  const first = data.professionals[0].id;
  const pid = (v: string) => v || first;
  const proName = (id: string | null) => (id ? data.professionals.find((p) => p.id === id)?.name ?? id : "Todas");
  const weekly = data.windows.filter((x) => x.weekday !== null);
  const dated = data.windows.filter((x) => x.on_date !== null);
  const locSel = (value: string, on: (v: string) => void) => (
    <select value={value} onChange={(e) => on(e.target.value)}>
      {data.locations.map((l) => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </select>
  );
  const proSel = (value: string, on: (v: string) => void, allLabel?: string) => (
    <select value={value} onChange={(e) => on(e.target.value)}>
      {allLabel ? <option value="">{allLabel}</option> : null}
      {data.professionals.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );

  return (
    <>
      <div className="panel">
        <h3>Horário semanal</h3>
        <div className="list">
          {weekly.length === 0 && <p className="muted">Nenhum horário semanal. Sem isso o site não mostra vagas nos dias comuns.</p>}
          {data.professionals.map((p) => {
            const mine = weekly.filter((x) => x.professional_id === p.id);
            if (!mine.length) return null;
            return (
              <div key={p.id}>
                <div className="group-title" style={{ marginTop: 8 }}>{p.name}</div>
                {mine.map((x) => (
                  <div className="item" key={x.id} style={{ marginBottom: 8 }}>
                    <span>
                      <strong>{WEEKDAYS[x.weekday!]}</strong> · {hhmm(x.start_time)} às {hhmm(x.end_time)} · {LOC[x.location_id] ?? x.location_id}
                    </span>
                    <button className="link-btn danger" onClick={() => del({ kind: "window", id: x.id })}>Remover</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <div className="field"><label>Profissional</label>{proSel(pid(w.professional_id), (v) => setW({ ...w, professional_id: v }))}</div>
          <div className="field"><label>Dia</label>
            <select value={w.weekday} onChange={(e) => setW({ ...w, weekday: e.target.value })}>
              {WEEKDAYS.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </div>
          <div className="field"><label>Local</label>{locSel(w.location_id, (v) => setW({ ...w, location_id: v }))}</div>
          <div className="field"><label>Início</label><input type="time" value={w.start_time} onChange={(e) => setW({ ...w, start_time: e.target.value })} /></div>
          <div className="field"><label>Fim</label><input type="time" value={w.end_time} onChange={(e) => setW({ ...w, end_time: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={() => add({ kind: "window", ...w, professional_id: pid(w.professional_id), weekday: Number(w.weekday) }, "Horário adicionado")}>Adicionar</button>
        </div>
      </div>

      <div className="panel">
        <h3>Datas específicas (ex.: dias de atendimento em Natal)</h3>
        <p className="muted" style={{ marginTop: -8 }}>Nestas datas o horário semanal daquela profissional é substituído pelo que você definir aqui.</p>
        <div className="list">
          {dated.length === 0 && <p className="muted">Nenhuma data cadastrada.</p>}
          {dated.map((x) => (
            <div className="item" key={x.id}>
              <span>
                <strong>{longDate(x.on_date!)}</strong> · {hhmm(x.start_time)} às {hhmm(x.end_time)} · {LOC[x.location_id] ?? x.location_id} · {proName(x.professional_id)}
              </span>
              <button className="link-btn danger" onClick={() => del({ kind: "window", id: x.id })}>Remover</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <div className="field"><label>Profissional</label>{proSel(pid(d.professional_id), (v) => setD({ ...d, professional_id: v }))}</div>
          <div className="field"><label>Data</label><input type="date" value={d.on_date} onChange={(e) => setD({ ...d, on_date: e.target.value })} /></div>
          <div className="field"><label>Local</label>{locSel(d.location_id, (v) => setD({ ...d, location_id: v }))}</div>
          <div className="field"><label>Início</label><input type="time" value={d.start_time} onChange={(e) => setD({ ...d, start_time: e.target.value })} /></div>
          <div className="field"><label>Fim</label><input type="time" value={d.end_time} onChange={(e) => setD({ ...d, end_time: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={() => add({ kind: "window", ...d, professional_id: pid(d.professional_id) }, "Data adicionada")}>Adicionar</button>
        </div>
      </div>

      <div className="panel">
        <h3>Folgas e feriados</h3>
        <div className="list">
          {data.blocked.length === 0 && <p className="muted">Nenhuma folga cadastrada.</p>}
          {data.blocked.map((x) => (
            <div className="item" key={x.id}>
              <span><strong>{longDate(x.on_date)}</strong> · {proName(x.professional_id)}{x.reason ? ` · ${x.reason}` : ""}</span>
              <button className="link-btn danger" onClick={() => del({ kind: "blocked", id: x.id })}>Remover</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <div className="field"><label>Data</label><input type="date" value={b.on_date} onChange={(e) => setB({ ...b, on_date: e.target.value })} /></div>
          <div className="field"><label>Quem</label>{proSel(b.professional_id, (v) => setB({ ...b, professional_id: v }), "Todas (espaço fechado)")}</div>
          <div className="field"><label>Motivo</label><input value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={() => add({ kind: "blocked", ...b }, "Folga adicionada")}>Bloquear dia</button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Serviços

function Servicos({ say }: { say: Say }) {
  const [list, setList] = useState<Service[] | null>(null);
  useEffect(() => {
    api<{ services: Service[] }>("/api/admin/services").then((j) => setList(j.services)).catch((e) => say(e.message));
  }, [say]);
  if (!list) return <p className="muted">Carregando…</p>;

  const patch = (id: string, p: Partial<Service>) => setList(list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  async function save(s: Service) {
    try {
      await api("/api/admin/services", "PATCH", { id: s.id, price_cents: s.price_cents, duration_min: s.duration_min, active: s.active });
      say(`${s.name} salvo`);
    } catch (e) {
      say((e as Error).message);
    }
  }

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <p className="muted" style={{ marginTop: 0 }}>A duração define quanto tempo o serviço ocupa na agenda. Deixe o preço vazio para exibir “Sob consulta”.</p>
      <table className="table">
        <thead>
          <tr><th>Serviço</th><th>Preço (R$)</th><th>Duração (min)</th><th>Ativo</th><th /></tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>
                <input type="text" inputMode="decimal" defaultValue={s.price_cents == null ? "" : (s.price_cents / 100).toFixed(2).replace(".", ",")}
                  onChange={(e) => { const v = e.target.value.trim().replace(",", "."); patch(s.id, { price_cents: v === "" ? null : Math.round(Number(v) * 100) }); }} />
              </td>
              <td><input type="number" min={10} max={480} step={5} value={s.duration_min} onChange={(e) => patch(s.id, { duration_min: Number(e.target.value) })} /></td>
              <td><input type="checkbox" checked={s.active} onChange={(e) => patch(s.id, { active: e.target.checked })} /></td>
              <td><button className="link-btn" onClick={() => save(s)}>Salvar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
