import type { RecapConfig, RecapEntry, RecapQuestion, RecapScoreKey } from "@/types/member";
import { addDays, iso, mondayOf } from "./format";

/* Reine Funktionen für Wochenrecap und MPT Performance Score (laufen auf Server und Client). */

export const SCORE_LABELS: Record<RecapScoreKey, string> = {
  training: "Training",
  schlaf: "Schlaf",
  ernaehrung: "Ernährung",
  energie: "Energie",
};

export const SCORE_KEYS = Object.keys(SCORE_LABELS) as RecapScoreKey[];

/** ISO-8601-Woche („2026-W47“) und Montag der Woche */
export function isoWeekOf(date: Date): { week: string; weekStart: string } {
  const monday = mondayOf(date);
  const thursday = addDays(monday, 3);
  const jan4 = new Date(thursday.getFullYear(), 0, 4, 12);
  const wk = 1 + Math.round((thursday.getTime() - mondayOf(jan4).getTime()) / (7 * 86_400_000));
  return { week: `${thursday.getFullYear()}-W${String(wk).padStart(2, "0")}`, weekStart: iso(monday) };
}

/** Erlaubte Skalenwerte, z. B. 1–6 und 8–10 */
export function scaleValues(scale: RecapConfig["scale"]): number[] {
  const out: number[] = [];
  for (let v = scale.min; v <= scale.max; v++) if (!scale.skip.includes(v)) out.push(v);
  return out;
}

const toPct = (v: number, scale: RecapConfig["scale"]): number => ((v - scale.min) / (scale.max - scale.min)) * 100;

function questionPct(q: RecapQuestion, value: unknown, scale: RecapConfig["scale"]): number | null {
  if (q.type === "yesno" && typeof value === "boolean") return value ? 100 : 0;
  if (q.type === "scale" && typeof value === "number") return toPct(value, scale);
  return null;
}

/**
 * MPT Performance Score: gewichteter Mittelwert der Bestandteile Training, Schlaf, Ernährung, Energie (je 0–100).
 * Training = Mittel aus der Selbsteinschätzung und den besuchten Einheiten der Woche (max. `maxSessions`).
 */
export function computeScore(
  config: RecapConfig,
  answers: Record<string, number | boolean | string>,
  sessions: number,
): { components: Record<RecapScoreKey, number>; score: number } {
  const components = {} as Record<RecapScoreKey, number>;
  let weighted = 0;
  let total = 0;
  for (const key of SCORE_KEYS) {
    const parts = config.questions
      .filter((q) => q.score === key)
      .map((q) => questionPct(q, answers[q.id], config.scale))
      .filter((v): v is number => v !== null);
    const sessionsPct = key === "training" ? (Math.min(sessions, config.maxSessions) / config.maxSessions) * 100 : null;
    const all = sessionsPct === null ? parts : [...(parts.length ? [parts.reduce((a, b) => a + b, 0) / parts.length] : []), sessionsPct];
    if (all.length === 0) {
      components[key] = 0;
      continue;
    }
    const value = all.reduce((a, b) => a + b, 0) / all.length;
    components[key] = Math.round(value);
    const w = config.weights[key] ?? 1;
    weighted += value * w;
    total += w;
  }
  return { components, score: total > 0 ? Math.round(weighted / total) : 0 };
}

export function scoreTone(score: number): "good" | "mid" | "low" {
  return score >= 70 ? "good" : score >= 45 ? "mid" : "low";
}

export const weekLabel = (e: Pick<RecapEntry, "week">): string => {
  const [y, w] = e.week.split("-W");
  return `KW ${Number(w)} / ${y}`;
};
