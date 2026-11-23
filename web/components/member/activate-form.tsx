"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useMember } from "@/hooks/use-session";

export function ActivateForm({ token }: { token: string }) {
  const uid = useId();
  const router = useRouter();
  const { refreshSession } = useMember();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pass = String(fd.get("pass") ?? "");
    if (pass.length < 8) return setError("Das Passwort braucht mindestens 8 Zeichen.");
    if (pass !== fd.get("pass2")) return setError("Die beiden Passwörter stimmen nicht überein.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pass }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Das Passwort konnte nicht gesetzt werden.");
      }
      await refreshSession();
      router.replace("/mitglieder");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
      setBusy(false);
    }
  }

  return (
    <form className="form plain" onSubmit={submit}>
      <label htmlFor={`${uid}-p`}>Neues Passwort (mind. 8 Zeichen)</label>
      <input id={`${uid}-p`} name="pass" type="password" autoComplete="new-password" minLength={8} required />
      <label htmlFor={`${uid}-p2`}>Passwort wiederholen</label>
      <input id={`${uid}-p2`} name="pass2" type="password" autoComplete="new-password" minLength={8} required />
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Einen Moment …" : "Passwort festlegen"}
      </button>
    </form>
  );
}
