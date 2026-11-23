import type { Plan, SetValue } from "@/types/member";

/* Reine Auswertung von Trainingslogs (Check-up: aktueller Plan gegen Vorplan). */

export interface BestSet {
  date: string;
  set: SetValue;
}

/** Bester Satz einer Übung im jeweils letzten Log, das die Übung enthält (zuerst kg, dann Wdh., dann Zeit) */
export function bestSetOf(plan: Plan, exerciseId: string): BestSet | null {
  const logs = [...plan.logs].sort((a, z) => z.date.localeCompare(a.date));
  for (const l of logs) {
    const sets = (l.sets[exerciseId] ?? []).filter((s) => Object.keys(s).length > 0);
    if (!sets.length) continue;
    const best = [...sets].sort((a, z) => (z.kg ?? 0) - (a.kg ?? 0) || (z.reps ?? 0) - (a.reps ?? 0) || (z.sec ?? 0) - (a.sec ?? 0))[0];
    return { date: l.date, set: best };
  }
  return null;
}

export function setText(s: SetValue | undefined | null): string {
  if (!s) return "–";
  const parts: string[] = [];
  if (s.kg != null) parts.push(`${s.kg.toLocaleString("de-DE")} kg`);
  if (s.reps != null) parts.push(`${s.reps} Wdh.`);
  if (s.sec != null) parts.push(`${s.sec} s`);
  if (s.m != null) parts.push(`${s.m} m`);
  if (s.kcal != null) parts.push(`${s.kcal} kcal`);
  return parts.join(" × ") || "–";
}

export interface CompareRow {
  name: string;
  group: string;
  current: BestSet | null;
  previous: BestSet | null;
}

/** Übungen des aktuellen Plans (nach Namen) mit dem besten Satz im Vorplan */
export function comparePlans(current: Plan, previous: Plan | null): CompareRow[] {
  const prevByName = new Map<string, string>();
  for (const d of previous?.days ?? []) for (const e of d.exercises) prevByName.set(e.name.trim().toLowerCase(), e.id);
  const rows: CompareRow[] = [];
  for (const d of current.days) {
    for (const e of d.exercises) {
      const pid = prevByName.get(e.name.trim().toLowerCase());
      rows.push({ name: e.name, group: e.group, current: bestSetOf(current, e.id), previous: previous && pid ? bestSetOf(previous, pid) : null });
    }
  }
  return rows;
}

/** Welche Spalten sind für eine Übung sinnvoll? Wdh./kg Standard; Zeit bei „30s“; Strecke/kcal bei Ausdauergeräten */
export type SetCol = "reps" | "kg" | "sec" | "m" | "kcal";
export function defaultColumns(ex: { name: string; reps: string }, existing: SetValue[] = []): SetCol[] {
  const cols = new Set<SetCol>();
  const reps = ex.reps.toLowerCase();
  const name = ex.name.toLowerCase();
  if (/\d\s*(s|sek|sec|min)\b/.test(reps) || /plank|halten|hold/.test(name)) cols.add("sec");
  else if (/ergo|lauf|bike|rad|ski|sled|schlitten|rower|rudergerät|assault|cardio/.test(name)) {
    cols.add("m");
    cols.add("kcal");
    cols.add("sec");
  } else {
    cols.add("reps");
    cols.add("kg");
  }
  for (const s of existing) for (const c of ["reps", "kg", "sec", "m", "kcal"] as SetCol[]) if (s[c] != null) cols.add(c);
  return (["reps", "kg", "sec", "m", "kcal"] as SetCol[]).filter((c) => cols.has(c));
}
