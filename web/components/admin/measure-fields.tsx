"use client";

import { iso } from "@/lib/format";
import type { Measurement } from "@/types/member";
import type { MeasurePoint } from "@/types/site";

export interface MeasureDraft {
  id?: string;
  date: string;
  weight: string;
  leanMass: string;
  bodyfat: string;
  skinfolds: Record<string, string>;
  girths: Record<string, string>;
  note: string;
}

const str = (v: number | null | undefined): string => (v == null ? "" : String(v).replace(".", ","));
const toNum = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export const blankMeasure = (): MeasureDraft => ({ date: iso(new Date()), weight: "", leanMass: "", bodyfat: "", skinfolds: {}, girths: {}, note: "" });

export const measureToDraft = (m: Measurement): MeasureDraft => ({
  id: m.id,
  date: m.date,
  weight: str(m.weight),
  leanMass: str(m.leanMass),
  bodyfat: str(m.bodyfat),
  skinfolds: Object.fromEntries(Object.entries(m.skinfolds ?? {}).map(([k, v]) => [k, str(v)])),
  girths: Object.fromEntries(Object.entries(m.girths ?? {}).map(([k, v]) => [k, str(v)])),
  note: m.note ?? "",
});

export const isBlankMeasure = (d: MeasureDraft): boolean => !d.weight && !d.leanMass && !d.bodyfat && !Object.values(d.skinfolds).some(Boolean) && !Object.values(d.girths).some(Boolean);

/** Payload für die API; ungültige Zahlen lösen einen Fehler aus (Text auf Deutsch) */
export function measureToPayload(d: MeasureDraft): Record<string, unknown> {
  const num = (s: string, label: string): number | null => {
    const n = toNum(s);
    if (n !== null && Number.isNaN(n)) throw new Error(`${label}: bitte eine Zahl angeben.`);
    return n;
  };
  const map = (o: Record<string, string>, label: string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o)) {
      const n = num(v, label);
      if (n !== null) out[k] = n;
    }
    return out;
  };
  return {
    id: d.id,
    date: d.date,
    weight: num(d.weight, "Gewicht"),
    leanMass: num(d.leanMass, "Magermasse"),
    bodyfat: num(d.bodyfat, "Körperfett"),
    skinfolds: map(d.skinfolds, "Hautfalte"),
    girths: map(d.girths, "Umfang"),
    note: d.note,
  };
}

function NumberBox({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id}>
      {label}
      <input id={id} type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Eingabefelder einer Messung (im Messungen-Tab und im Check-up) */
export function MeasureFields({ idp, value, onChange, skinfolds, girths }: { idp: string; value: MeasureDraft; onChange: (v: MeasureDraft) => void; skinfolds: MeasurePoint[]; girths: MeasurePoint[] }) {
  return (
    <div className="adm-listed">
      <div className="adm-row">
        <div className="adm-field">
          <label htmlFor={`${idp}-d`}>Datum</label>
          <input id={`${idp}-d`} type="date" value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
        </div>
        <div className="adm-field">
          <label htmlFor={`${idp}-w`}>Gewicht (kg)</label>
          <input id={`${idp}-w`} type="text" inputMode="decimal" value={value.weight} onChange={(e) => onChange({ ...value, weight: e.target.value })} />
        </div>
        <div className="adm-field">
          <label htmlFor={`${idp}-l`}>Lean Mass (kg)</label>
          <input id={`${idp}-l`} type="text" inputMode="decimal" value={value.leanMass} onChange={(e) => onChange({ ...value, leanMass: e.target.value })} />
        </div>
        <div className="adm-field">
          <label htmlFor={`${idp}-b`}>Körperfett (%)</label>
          <input id={`${idp}-b`} type="text" inputMode="decimal" value={value.bodyfat} onChange={(e) => onChange({ ...value, bodyfat: e.target.value })} />
        </div>
      </div>
      <details className="adm-sub" open={Object.values(value.skinfolds).some(Boolean)}>
        <summary>Hautfalten (mm)</summary>
        <div className="body">
          <div className="adm-skin">
            {skinfolds.map((p) => (
              <NumberBox key={p.key} id={`${idp}-s-${p.key}`} label={p.label} value={value.skinfolds[p.key] ?? ""} onChange={(v) => onChange({ ...value, skinfolds: { ...value.skinfolds, [p.key]: v } })} />
            ))}
          </div>
        </div>
      </details>
      <details className="adm-sub" open={Object.values(value.girths).some(Boolean)}>
        <summary>Umfänge (cm)</summary>
        <div className="body">
          <div className="adm-skin">
            {girths.map((p) => (
              <NumberBox key={p.key} id={`${idp}-g-${p.key}`} label={p.label} value={value.girths[p.key] ?? ""} onChange={(v) => onChange({ ...value, girths: { ...value.girths, [p.key]: v } })} />
            ))}
          </div>
        </div>
      </details>
      <div className="adm-field">
        <label htmlFor={`${idp}-n`}>Notiz</label>
        <input id={`${idp}-n`} type="text" maxLength={500} value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} />
      </div>
    </div>
  );
}
