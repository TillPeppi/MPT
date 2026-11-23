"use client";

import { useState } from "react";

/** Platzhalter bis zur Newsletter-Anbindung: es wird nichts gespeichert oder gesendet. */
export function NewsletterForm() {
  const [done, setDone] = useState(false);
  if (done) return <span className="acc">Danke für dein Interesse! Der Newsletter startet in Kürze.</span>;
  return (
    <form
      className="newsletter"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label className="sr" htmlFor="nl-mail">
        E-Mail-Adresse für den Newsletter
      </label>
      <input id="nl-mail" type="email" required placeholder="Keine News verpassen – E-Mail" autoComplete="email" />
      <button className="btn btn-primary btn-sm">Abonnieren</button>
    </form>
  );
}
