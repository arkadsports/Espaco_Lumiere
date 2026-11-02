import { atLocal, fmtTime } from "./time.ts";

export type Win = {
  location_id: string;
  start_time: string;
  end_time: string;
  categories: string[] | null;
};
export type Busy = { start: Date; end: Date };
export type Slot = { start: string; time: string; location_id: string };

/**
 * Gera os horários livres de um dia a partir das janelas de atendimento.
 * Função pura: não acessa banco, só calcula.
 */
export function generateSlots(o: {
  date: string;
  windows: Win[];
  category: string;
  durationMin: number;
  stepMin: number;
  busy: Busy[];
  now: Date;
  minLeadMin: number;
}): Slot[] {
  const out = new Map<string, Slot>();
  const earliest = o.now.getTime() + o.minLeadMin * 60_000;
  const dur = o.durationMin * 60_000;

  for (const w of o.windows) {
    if (w.categories && w.categories.length > 0 && !w.categories.includes(o.category)) continue;
    const ws = atLocal(o.date, w.start_time).getTime();
    const we = atLocal(o.date, w.end_time).getTime();
    for (let t = ws; t + dur <= we; t += o.stepMin * 60_000) {
      if (t < earliest) continue;
      const end = t + dur;
      if (o.busy.some((b) => b.start.getTime() < end && b.end.getTime() > t)) continue;
      const d = new Date(t);
      const iso = d.toISOString();
      if (!out.has(iso)) out.set(iso, { start: iso, time: fmtTime(d), location_id: w.location_id });
    }
  }
  return [...out.values()].sort((a, b) => a.start.localeCompare(b.start));
}
