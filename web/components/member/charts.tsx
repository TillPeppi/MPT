import { fmtDate, num } from "@/lib/format";

export interface ChartPoint {
  /** YYYY-MM-DD oder beliebiger Text für die x-Achse */
  label: string;
  value: number;
}

/** Winzige Verlaufslinie ohne Achsen (z. B. pro Übung) */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const W = 80;
  const H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (W - 4) + 2},${H - 3 - ((v - min) / span) * (H - 6)}`);
  const last = pts[pts.length - 1].split(",");
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill="currentColor" />
    </svg>
  );
}

/** Verlaufsdiagramm mit Min/Max-Achse. Reines SVG, keine Bibliothek. */
export function LineChart({ points, unit, title, digits = 1, domain }: { points: ChartPoint[]; unit?: string; title: string; digits?: number; domain?: [number, number] }) {
  if (points.length === 0) return null;
  const W = 320;
  const H = 130;
  const PL = 8;
  const PR = 8;
  const PT = 14;
  const PB = 22;
  const vals = points.map((p) => p.value);
  const lo = domain ? domain[0] : Math.min(...vals);
  const hi = domain ? domain[1] : Math.max(...vals);
  const pad = domain ? 0 : (hi - lo || 1) * 0.15;
  const min = lo - pad;
  const max = hi + pad;
  const x = (i: number) => (points.length === 1 ? W / 2 : PL + (i / (points.length - 1)) * (W - PL - PR));
  const y = (v: number) => PT + (1 - (v - min) / (max - min || 1)) * (H - PT - PB);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const fmt = (v: number) => `${num(v, digits)}${unit ? ` ${unit}` : ""}`;
  const dateLabel = (l: string) => (/^\d{4}-\d{2}-\d{2}$/.test(l) ? fmtDate(l) : l);
  const peak = points.reduce((a, p) => (p.value > a.value ? p : a), points[0]);
  const low = points.reduce((a, p) => (p.value < a.value ? p : a), points[0]);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${points.map((p) => `${dateLabel(p.label)} ${fmt(p.value)}`).join(", ")}`}>
        <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} className="ax" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={`${p.label}-${i}`} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4.2 : 2.8} fill="currentColor" className={i === points.length - 1 ? "last" : ""} />
        ))}
        {points.length > 1 && (
          <>
            <text x={x(points.indexOf(peak))} y={y(peak.value) - 7} textAnchor="middle" className="tx">
              {num(peak.value, digits)}
            </text>
            {low !== peak && (
              <text x={x(points.indexOf(low))} y={y(low.value) + 15} textAnchor="middle" className="tx">
                {num(low.value, digits)}
              </text>
            )}
          </>
        )}
        <text x={PL} y={H - 6} className="tx soft">
          {dateLabel(points[0].label)}
        </text>
        {points.length > 1 && (
          <text x={W - PR} y={H - 6} textAnchor="end" className="tx soft">
            {dateLabel(points[points.length - 1].label)}
          </text>
        )}
      </svg>
    </figure>
  );
}
