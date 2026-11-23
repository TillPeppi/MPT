import { LineChart, type ChartPoint } from "@/components/member/charts";
import { MCard, PageTitle } from "@/components/member/ui";
import { backend, getSite } from "@/lib/api";
import { fmtDate, num } from "@/lib/format";
import { skinSum } from "@/lib/member-view";
import { requireSession } from "@/lib/session";
import type { Measurement } from "@/types/member";

export const metadata = { title: "Messungen | MPT" };

interface Metric {
  key: string;
  label: string;
  unit: string;
  /** true: Abnahme ist gut (Körperfett, Hautfalten) */
  lowerBetter: boolean;
  get: (m: Measurement) => number | null | undefined;
}

const METRICS: Metric[] = [
  { key: "weight", label: "Gewicht", unit: "kg", lowerBetter: false, get: (m) => m.weight },
  { key: "leanMass", label: "Lean Mass", unit: "kg", lowerBetter: false, get: (m) => m.leanMass },
  { key: "bodyfat", label: "Körperfettanteil", unit: "%", lowerBetter: true, get: (m) => m.bodyfat },
  { key: "skin", label: "Σ Hautfalten", unit: "mm", lowerBetter: true, get: skinSum },
];

function deltaText(d: number, unit: string): string {
  const r = Math.round(d * 10) / 10;
  return r === 0 ? `±0 ${unit}` : `${r > 0 ? "+" : "−"}${num(Math.abs(r))} ${unit}`;
}

export default async function MeasurementsPage() {
  const { token } = await requireSession();
  const [me, site] = await Promise.all([backend.me(token), getSite()]);
  const ms = me.measurements;
  const cur = ms[ms.length - 1];
  const prev = ms[ms.length - 2];
  const first = ms[0];
  const { skinfolds, girths } = site.settings.measure;

  if (!cur) {
    return (
      <>
        <PageTitle title="Messungen" />
        <p className="empty">Noch keine Messung vorhanden. Beim Check-up nimmt dein Coach die ersten Werte auf.</p>
      </>
    );
  }

  const shown = ms.slice(-5);
  const rows = (points: { key: string; label: string }[], pick: (m: Measurement) => Record<string, number> | undefined, unit: string) =>
    points
      .filter((p) => shown.some((m) => pick(m)?.[p.key] != null))
      .map((p) => {
        const a = pick(first)?.[p.key];
        const z = pick(cur)?.[p.key];
        return { ...p, unit, values: shown.map((m) => pick(m)?.[p.key]), delta: a != null && z != null ? z - a : null };
      });

  return (
    <>
      <PageTitle title="Messungen" text="Deine Körperwerte im Verlauf. Die Messungen nimmt dein Coach vor." />
      <p className="note flush">
        Letzte Messung: <b>{fmtDate(cur.date)}</b>
        {me.member.nextMeasurementDue && (
          <>
            {" · "}Nächste Messung fällig am <b>{fmtDate(me.member.nextMeasurementDue)}</b>
          </>
        )}
      </p>

      <div className="mgrid two">
        {METRICS.map((mt) => {
          const v = mt.get(cur);
          if (v == null) return null;
          const p = prev ? mt.get(prev) : null;
          const d = p != null ? v - p : null;
          const good = d != null && d !== 0 && (mt.lowerBetter ? d < 0 : d > 0);
          const points: ChartPoint[] = ms.flatMap((m) => {
            const x = mt.get(m);
            return x == null ? [] : [{ label: m.date, value: x }];
          });
          return (
            <MCard key={mt.key} title={mt.label} className="metric">
              <div className="metric-top">
                <b className="big-line">
                  {num(v)} <small>{mt.unit}</small>
                </b>
                {d != null && <em className={good ? "good" : d === 0 ? "" : "bad"}>{deltaText(d, mt.unit)} zur Vormessung</em>}
              </div>
              <LineChart points={points} unit={mt.unit} title={`${mt.label} im Verlauf`} />
            </MCard>
          );
        })}
      </div>

      <details className="fold">
        <summary>Alle Messpunkte (Hautfalten in mm, Umfänge in cm)</summary>
        {[
          { title: "Hautfalten", data: rows(skinfolds, (m) => m.skinfolds, "mm") },
          { title: "Umfänge", data: rows(girths, (m) => m.girths, "cm") },
        ].map(
          (g) =>
            g.data.length > 0 && (
              <div className="tscroll" key={g.title} tabIndex={0} role="region" aria-label={g.title}>
                <table className="mtable">
                  <thead>
                    <tr>
                      <th scope="col" className="stick">
                        {g.title}
                      </th>
                      {shown.map((m) => (
                        <th key={m.id} scope="col">
                          {fmtDate(m.date).replace(/ \d{4}$/, "")}
                        </th>
                      ))}
                      <th scope="col">Δ gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.data.map((r) => (
                      <tr key={r.key}>
                        <th scope="row" className="stick">
                          {r.label}
                        </th>
                        {r.values.map((x, i) => (
                          <td key={i}>{x != null ? num(x) : "–"}</td>
                        ))}
                        <td className={r.delta != null && r.delta < 0 ? "good" : ""}>{r.delta != null ? deltaText(r.delta, r.unit) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
        )}
      </details>
    </>
  );
}
