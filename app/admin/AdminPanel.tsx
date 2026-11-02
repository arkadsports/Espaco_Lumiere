"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, WEEKDAYS } from "@/lib/content";

type Appt = {
  id: string;
  service_id: string;
  service_name: string;
  location_id: string;
  start_at: string;
  variant: string | null;
  client_name: string;
  client_phone: string;
  notes: string | null;
  status: string;
  source: string;
};
type Service = { id: string; name: string; duration_min: number; price_cents: number | null; active: boolean; variants: string[]; variant_label: string | null };
type Win = { id: number; location_id: string; weekday: number | null; on_date: string | null; start_time: string; end_time: string; categories: string[] | null };
type Blocked = { on_date: string; reason: string | null };
type Loc = { id: string; name: string };
type Slot = { start: string; time: string };

const TZ = "America/Fortaleza";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const hhmm = (s: string) => s.slice(0, 5);
const time = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const longDate = (d: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));
const SRC: Record<string, string> = { site: "site", whatsapp: "WhatsApp", admin: "manual" };
const ST: Record<string, string> = { confirmed: "Confirmado", completed: "Concluído", no_show: "Faltou", cancelled: "Cancelado" };

async function api<T = unknown>(url: string, method = "GET", data?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: data ? { "Content-Type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Erro");
  return j as T;
}

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<"agenda" | "horarios" | "servicos">("agenda");
  const [toast, setToast] = useState("");
  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  }, []);

  async function logout() {
    await api("/api/admin/login", "DELETE");
    router.refresh();
  }

  return (
    <div className="admin wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Painel Lumière</h1>
        <button className="link-btn" onClick={logout}>
          Sair
        </button>
      </div>
      <div className="tabs" role="tablist">
        {(["agenda", "horarios", "servicos"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t === "agenda" ? "Agenda" : t === "horarios" ? "Horários e datas" : "Serviços e preços"}
          </button>
        ))}
      </div>
      {tab === "agenda" && <Agenda say={say} />}
      {tab === "horarios" && <Horarios say={say} />}
      {tab === "servicos" && <Servicos say={say} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Agenda({ say }: { say: (m: string) => void }) {
  const [date, setDate] = useState(today());
  const [list, setList] = useState<Appt[] | null>(null);
  const load = useCallback(async () => {
    try {
      setList((await api<{ appointments: Appt[] }>(`/api/admin/appointments?from=${date}`)).appointments);
    } catch (e) {
      say((e as Error).message);
    }
  }, [date, say]);
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

  return (
    <>
      <div className="panel">
        <div className="row">
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="d">Dia</label>
            <input id="d" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <button className="link-btn" onClick={() => setDate(today())}>
            Hoje
          </button>
        </div>
        <h3 style={{ marginTop: 18 }}>{longDate(date)}</h3>
        {list === null ? (
          <p className="muted">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="muted">Nenhum agendamento neste dia.</p>
        ) : (
          <div className="list">
            {list.map((a) => (
              <div key={a.id} className={`item ${a.status === "cancelled" ? "cancelled" : ""}`}>
                <div>
                  <strong>{time(a.start_at)}</strong> · {a.client_name} <span className="badge">{a.location_id}</span>{" "}
                  <span className={`badge ${a.status}`}>{ST[a.status]}</span>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {a.service_name}
                    {a.variant ? ` · ${a.variant}` : ""} ·{" "}
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
      <Manual say={say} onDone={load} />
    </>
  );
}

function Manual({ say, onDone }: { say: (m: string) => void; onDone: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [f, setF] = useState({ service: "", variant: "", date: today(), start: "", name: "", phone: "" });
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => {
    api<{ services: Service[] }>("/api/admin/services").then((j) => setServices(j.services.filter((s) => s.active))).catch(() => {});
  }, []);
  useEffect(() => {
    if (!f.service) return setSlots([]);
    api<{ slots: Slot[] }>(`/api/slots?service=${f.service}&date=${f.date}&admin=1`).then((j) => setSlots(j.slots)).catch(() => setSlots([]));
  }, [f.service, f.date]);
  const svc = services.find((s) => s.id === f.service);

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
      <p className="muted" style={{ marginTop: -8 }}>Para atendimentos combinados por Instagram, telefone ou presencialmente. O horário também fica bloqueado para o site e o WhatsApp.</p>
      <div className="row">
        <div className="field">
          <label>Serviço</label>
          <select required value={f.service} onChange={(e) => setF({ ...f, service: e.target.value, variant: "", start: "" })}>
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
        <div className="field">
          <label>Dia</label>
          <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, start: "" })} />
        </div>
        <div className="field">
          <label>Horário</label>
          <select required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })}>
            <option value="">{slots.length ? "Selecione" : "Sem horários"}</option>
            {slots.map((s) => (
              <option key={s.start} value={s.start}>{s.time}</option>
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

function Horarios({ say }: { say: (m: string) => void }) {
  const [data, setData] = useState<{ windows: Win[]; blocked: Blocked[]; locations: Loc[] } | null>(null);
  const load = useCallback(() => api<{ windows: Win[]; blocked: Blocked[]; locations: Loc[] }>("/api/admin/schedule").then(setData).catch((e) => say(e.message)), [say]);
  useEffect(() => {
    void load();
  }, [load]);

  const [w, setW] = useState({ location_id: "angicos", weekday: "2", start_time: "09:00", end_time: "12:00" });
  const [d, setD] = useState({ location_id: "natal", on_date: "", start_time: "09:00", end_time: "17:00" });
  const [cats, setCats] = useState<string[]>([]);
  const [b, setB] = useState({ on_date: "", reason: "" });

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
  const catName = (c: string[] | null) => (c?.length ? ` · só ${c.map((x) => CATEGORIES.find((k) => k.id === x)?.name ?? x).join(", ")}` : "");
  const weekly = data.windows.filter((x) => x.weekday !== null);
  const dated = data.windows.filter((x) => x.on_date !== null);
  const locSel = (value: string, on: (v: string) => void) => (
    <select value={value} onChange={(e) => on(e.target.value)}>
      {data.locations.map((l) => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </select>
  );

  return (
    <>
      <div className="panel">
        <h3>Horário semanal</h3>
        <div className="list">
          {weekly.length === 0 && <p className="muted">Nenhum horário semanal. Sem isso o site não mostra vagas nos dias comuns.</p>}
          {weekly.map((x) => (
            <div className="item" key={x.id}>
              <span>
                <strong>{WEEKDAYS[x.weekday!]}</strong> · {hhmm(x.start_time)} às {hhmm(x.end_time)} · {x.location_id}
                {catName(x.categories)}
              </span>
              <button className="link-btn danger" onClick={() => del({ kind: "window", id: x.id })}>Remover</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <div className="field"><label>Dia</label>
            <select value={w.weekday} onChange={(e) => setW({ ...w, weekday: e.target.value })}>
              {WEEKDAYS.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </div>
          <div className="field"><label>Local</label>{locSel(w.location_id, (v) => setW({ ...w, location_id: v }))}</div>
          <div className="field"><label>Início</label><input type="time" value={w.start_time} onChange={(e) => setW({ ...w, start_time: e.target.value })} /></div>
          <div className="field"><label>Fim</label><input type="time" value={w.end_time} onChange={(e) => setW({ ...w, end_time: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={() => add({ kind: "window", ...w, weekday: Number(w.weekday), categories: cats }, "Horário adicionado")}>Adicionar</button>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: "0.85rem", alignSelf: "center" }}>Restringir a (opcional):</span>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`chip ${cats.includes(c.id) ? "sel" : ""}`} onClick={() => setCats(cats.includes(c.id) ? cats.filter((x) => x !== c.id) : [...cats, c.id])}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Datas específicas (ex.: dias de atendimento em Natal)</h3>
        <p className="muted" style={{ marginTop: -8 }}>Nestas datas o horário semanal é substituído pelo que você definir aqui.</p>
        <div className="list">
          {dated.length === 0 && <p className="muted">Nenhuma data cadastrada.</p>}
          {dated.map((x) => (
            <div className="item" key={x.id}>
              <span>
                <strong>{longDate(x.on_date!)}</strong> · {hhmm(x.start_time)} às {hhmm(x.end_time)} · {x.location_id}
              </span>
              <button className="link-btn danger" onClick={() => del({ kind: "window", id: x.id })}>Remover</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <div className="field"><label>Data</label><input type="date" value={d.on_date} onChange={(e) => setD({ ...d, on_date: e.target.value })} /></div>
          <div className="field"><label>Local</label>{locSel(d.location_id, (v) => setD({ ...d, location_id: v }))}</div>
          <div className="field"><label>Início</label><input type="time" value={d.start_time} onChange={(e) => setD({ ...d, start_time: e.target.value })} /></div>
          <div className="field"><label>Fim</label><input type="time" value={d.end_time} onChange={(e) => setD({ ...d, end_time: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={() => add({ kind: "window", ...d }, "Data adicionada")}>Adicionar</button>
        </div>
      </div>

      <div className="panel">
        <h3>Folgas e feriados</h3>
        <div className="list">
          {data.blocked.length === 0 && <p className="muted">Nenhuma folga cadastrada.</p>}
          {data.blocked.map((x) => (
            <div className="item" key={x.on_date}>
              <span><strong>{longDate(x.on_date)}</strong>{x.reason ? ` · ${x.reason}` : ""}</span>
              <button className="link-btn danger" onClick={() => del({ kind: "blocked", on_date: x.on_date })}>Remover</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <div className="field"><label>Data</label><input type="date" value={b.on_date} onChange={(e) => setB({ ...b, on_date: e.target.value })} /></div>
          <div className="field"><label>Motivo</label><input value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} /></div>
          <button className="btn btn-gold btn-sm" onClick={() => add({ kind: "blocked", ...b }, "Folga adicionada")}>Bloquear dia</button>
        </div>
      </div>
    </>
  );
}

function Servicos({ say }: { say: (m: string) => void }) {
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
      <p className="muted" style={{ marginTop: 0 }}>A duração define quantos horários o serviço ocupa na agenda. Deixe o preço vazio para exibir “Sob consulta”.</p>
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
