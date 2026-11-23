"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DAYS_LONG } from "@/lib/format";
import type { Hours } from "@/types/site";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";
import { useUnsavedGuard } from "./use-unsaved";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

type Exc = NonNullable<Hours["exceptions"]>[number];

/** Öffnungszeiten je Wochentag (mehrere Zeitfenster) plus Ausnahmen und Schließtage */
export function HoursEditor({ hours }: { hours: Hours }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState<Hours>(() => structuredClone({ week: hours.week, note: hours.note ?? "", exceptions: hours.exceptions ?? [] }));
  const [base, setBase] = useState(() => JSON.stringify(value));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(value) !== base;
  useUnsavedGuard(dirty);

  const setRanges = (d: number, fn: (r: [string, string][]) => [string, string][]) =>
    setValue((v) => ({ ...v, week: { ...v.week, [d]: fn((v.week[String(d)] ?? []) as [string, string][]) } }));
  const setExc = (i: number, patch: Partial<Exc>) => setValue((v) => ({ ...v, exceptions: (v.exceptions ?? []).map((e, j) => (j === i ? { ...e, ...patch } : e)) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi("PUT", "/api/admin/settings/hours", value);
      setBase(JSON.stringify(value));
      toast.success("Öffnungszeiten gespeichert.");
      router.refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={submit}>
      <section className="adm-card">
        <header>
          <h2>Regelmäßige Zeiten</h2>
        </header>
        {ORDER.map((d) => {
          const ranges = (value.week[String(d)] ?? []) as [string, string][];
          return (
            <div key={d} className="adm-field">
              <span className="lab">{DAYS_LONG[d]}</span>
              {ranges.length === 0 && <span className="hint">Geschlossen</span>}
              {ranges.map((r, i) => (
                <div key={i} className="adm-add" style={{ paddingTop: 0 }}>
                  <input aria-label={`${DAYS_LONG[d]} von`} type="time" className="adm-in" style={{ maxWidth: 160 }} value={r[0]} onChange={(e) => setRanges(d, (l) => l.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                  <span>bis</span>
                  <input aria-label={`${DAYS_LONG[d]} bis`} type="time" className="adm-in" style={{ maxWidth: 160 }} value={r[1]} onChange={(e) => setRanges(d, (l) => l.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                  <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setRanges(d, (l) => l.filter((_, j) => j !== i))}>
                    Entfernen
                  </button>
                </div>
              ))}
              <div>
                <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setRanges(d, (l) => [...l, ["16:00", "21:00"]])}>
                  + Zeitfenster
                </button>
              </div>
            </div>
          );
        })}
        <div className="adm-field">
          <label htmlFor="hours-note">Hinweis unter den Zeiten</label>
          <input id="hours-note" type="text" value={value.note ?? ""} maxLength={200} onChange={(e) => setValue({ ...value, note: e.target.value })} />
        </div>
      </section>

      <section className="adm-card">
        <header>
          <h2>Ausnahmen & Schließtage</h2>
        </header>
        <p className="hint">An Schließtagen sind keine Kursbuchungen und keine Terminwünsche möglich. Bereits bestehende Buchungen werden nicht automatisch abgesagt (bitte unter Kurse & Buchungen stornieren).</p>
        {(value.exceptions ?? []).map((x, i) => (
          <div key={i} className="adm-sub" style={{ padding: 14 }}>
            <div className="adm-row">
              <div className="adm-field">
                <label htmlFor={`ex-d-${i}`}>Datum</label>
                <input id={`ex-d-${i}`} type="date" value={x.date} onChange={(e) => setExc(i, { date: e.target.value })} />
              </div>
              <div className="adm-field">
                <label htmlFor={`ex-n-${i}`}>Bezeichnung</label>
                <input id={`ex-n-${i}`} type="text" value={x.note ?? ""} maxLength={120} placeholder="z. B. Betriebsferien" onChange={(e) => setExc(i, { note: e.target.value })} />
              </div>
              <label className="adm-check">
                <input type="checkbox" checked={x.closed === true} onChange={(e) => setExc(i, { closed: e.target.checked, from: x.from ?? "10:00", to: x.to ?? "14:00" })} />
                Ganztägig geschlossen
              </label>
            </div>
            {!x.closed && (
              <div className="adm-add">
                <span>Geöffnet von</span>
                <input aria-label="Ausnahme von" type="time" className="adm-in" style={{ maxWidth: 160 }} value={x.from ?? ""} onChange={(e) => setExc(i, { from: e.target.value })} />
                <span>bis</span>
                <input aria-label="Ausnahme bis" type="time" className="adm-in" style={{ maxWidth: 160 }} value={x.to ?? ""} onChange={(e) => setExc(i, { to: e.target.value })} />
              </div>
            )}
            <div>
              <button type="button" className="btn danger adm-b sm" onClick={() => setValue((v) => ({ ...v, exceptions: (v.exceptions ?? []).filter((_, j) => j !== i) }))}>
                Entfernen
              </button>
            </div>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setValue((v) => ({ ...v, exceptions: [...(v.exceptions ?? []), { date: "", closed: true, note: "" }] }))}>
            + Ausnahme
          </button>
        </div>
      </section>

      <div className="adm-bar">
        <button type="submit" className="btn btn-primary adm-b" disabled={busy || !dirty}>
          {busy ? "Speichert …" : "Speichern"}
        </button>
        {dirty ? <span className="dirty" role="status">Ungespeicherte Änderungen</span> : <span className="hint">Alles gespeichert.</span>}
      </div>
    </form>
  );
}
