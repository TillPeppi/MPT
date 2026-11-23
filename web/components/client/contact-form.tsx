"use client";

import { useId, useState, type FormEvent } from "react";
import type { ContactRequest, FormDef } from "@/types/site";

interface Props {
  form: FormDef;
  /** Wird als erste Betreff-Option vorausgewählt (z. B. bei Event-Anmeldungen) */
  presetSubject?: string;
}

type Status = "idle" | "sending" | "done";

export function ContactForm({ form, presetSubject }: Props) {
  const uid = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const f = form.fields;
  const subjects = [...(presetSubject ? [presetSubject] : []), ...(form.subjects ?? [])];
  const id = (k: string) => `${uid}-${k}`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    if (!el.checkValidity()) {
      setError("Bitte Name, E-Mail und Datenschutz ausfüllen.");
      el.reportValidity();
      return;
    }
    const fields: Record<string, string> = {};
    let website = "";
    new FormData(el).forEach((v, k) => {
      if (typeof v !== "string") return;
      if (k === "website") website = v;
      else if (k !== "Datenschutz") fields[k] = v;
    });
    const body: ContactRequest = { formId: form.id, fields, consent: true, website };
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Das Senden hat leider nicht geklappt. Bitte versuche es gleich noch einmal.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server. Bitte versuche es gleich noch einmal.");
    }
  }

  if (status === "done") {
    return (
      <div className="form">
        <div className="ok" role="status">
          <h3>Danke!</h3>
          <p>{form.successText || "Wir melden uns bei dir."}</p>
        </div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="row">
        <div>
          <label htmlFor={id("name")}>Name *</label>
          <input id={id("name")} name="Name" required autoComplete="name" />
        </div>
        {f.phone ? (
          <div>
            <label htmlFor={id("tel")}>Telefon</label>
            <input id={id("tel")} name="Telefon" type="tel" autoComplete="tel" />
          </div>
        ) : (
          <div />
        )}
      </div>
      <label htmlFor={id("mail")}>E-Mail *</label>
      <input id={id("mail")} name="E-Mail" type="email" required autoComplete="email" />
      {(f.company || f.employees) && (
        <div className="row">
          {f.company && (
            <div>
              <label htmlFor={id("org")}>Unternehmen</label>
              <input id={id("org")} name="Unternehmen" autoComplete="organization" />
            </div>
          )}
          {f.employees && (
            <div>
              <label htmlFor={id("emp")}>Anzahl Mitarbeitende</label>
              <select id={id("emp")} name="Mitarbeitende">
                <option>1–10</option>
                <option>11–50</option>
                <option>51–200</option>
                <option>200+</option>
              </select>
            </div>
          )}
        </div>
      )}
      {f.date && (
        <div className="row">
          <div>
            <label htmlFor={id("date")}>Wunschtermin</label>
            <input id={id("date")} name="Wunschtermin" type="date" />
          </div>
          <div>
            <label htmlFor={id("time")}>Uhrzeit</label>
            <input id={id("time")} name="Uhrzeit" type="time" />
          </div>
        </div>
      )}
      {subjects.length > 0 && (
        <>
          <label htmlFor={id("subj")}>Betreff</label>
          <select id={id("subj")} name="Betreff">
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </>
      )}
      {f.message !== false && (
        <>
          <label htmlFor={id("msg")}>Nachricht</label>
          <textarea id={id("msg")} name="Nachricht" placeholder="Erzähl uns kurz von deinen Zielen …" />
        </>
      )}
      <div className="sr" aria-hidden="true">
        <label>
          Bitte leer lassen
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="consent">
        <input type="checkbox" name="Datenschutz" required /> Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzerklärung zu.
      </label>
      <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Wird gesendet …" : `${form.submitLabel || "Absenden"} →`}
      </button>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
