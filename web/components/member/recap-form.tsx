"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, type FormEvent } from "react";
import { scaleValues } from "@/lib/recap";
import type { RecapConfig } from "@/types/member";

type Answers = Record<string, number | boolean | string>;

/** Wochenrecap (R-1): Ja/Nein, Skalen 1–10 ohne 7, Freitext. Nach dem Absenden nicht mehr änderbar. */
export function RecapForm({ config }: { config: RecapConfig }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const values = scaleValues(config.scale);
  const set = (id: string, v: number | boolean | string) => setAnswers((a) => ({ ...a, [id]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const missing = config.questions.find((q) => q.required && (answers[q.id] === undefined || answers[q.id] === ""));
    if (missing) return setError(`Bitte beantworte noch: „${missing.label}“`);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Das Absenden hat nicht geklappt.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
      setBusy(false);
    }
  }

  return (
    <form className="recap-form" onSubmit={submit} noValidate>
      {config.questions.map((q) => (
        <Fragment key={q.id}>
        {/* Abschnitt vor dem fieldset: <legend> wird sonst immer oberhalb gerendert */}
        {q.section && <p className="rsec">{q.section}</p>}
        <fieldset className="rq">
          <legend>
            {q.label}
            {!q.required && <small> (optional)</small>}
          </legend>
          {q.type === "yesno" && (
            <div className="yn" role="radiogroup" aria-label={q.label}>
              {[true, false].map((v) => (
                <label key={String(v)} className={answers[q.id] === v ? "on" : ""}>
                  <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => set(q.id, v)} />
                  {v ? "Ja" : "Nein"}
                </label>
              ))}
            </div>
          )}
          {q.type === "scale" && (
            <>
              <div className="scale" role="radiogroup" aria-label={q.label}>
                {values.map((v, i) => (
                  <label key={v} className={`${answers[q.id] === v ? "on" : ""} ${i > 0 && values[i - 1] !== v - 1 ? "gap" : ""}`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => set(q.id, v)} />
                    {v}
                  </label>
                ))}
              </div>
              <p className="ends">
                <span>{config.scale.min} = schlecht</span>
                <span>{config.scale.max} = sehr gut</span>
              </p>
            </>
          )}
          {q.type === "text" && (
            <textarea
              aria-label={q.label}
              rows={3}
              maxLength={1000}
              value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
              onChange={(e) => set(q.id, e.target.value)}
            />
          )}
        </fieldset>
        </Fragment>
      ))}
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Einen Moment …" : "Recap abschicken"}
      </button>
      <p className="note">Du kannst den Recap einmal pro Woche abschicken. Danach ist er nicht mehr änderbar.</p>
    </form>
  );
}
