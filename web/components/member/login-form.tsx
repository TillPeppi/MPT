"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useMember } from "@/hooks/use-session";

interface Props {
  /** Ziel nach dem Login (nur interne Pfade) */
  next?: string;
  /** Statt Weiterleitung: Dialog bleibt auf der Seite (z. B. im Kursplan) */
  onSuccess?: () => void;
}

const safeNext = (n?: string): string => (n && /^\/[^/\\]/.test(n) ? n : "/mitglieder");

export function LoginForm({ next, onSuccess }: Props) {
  const uid = useId();
  const router = useRouter();
  const { refreshSession } = useMember();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), pass: fd.get("pass") }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Anmeldung nicht möglich.");
      }
      await refreshSession();
      if (onSuccess) onSuccess();
      else {
        router.replace(safeNext(next));
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
      setBusy(false);
    }
  }

  return (
    <form className="form plain" onSubmit={submit}>
      <label htmlFor={`${uid}-e`}>E-Mail</label>
      <input id={`${uid}-e`} name="email" type="email" autoComplete="username" required />
      <label htmlFor={`${uid}-p`}>Passwort</label>
      <input id={`${uid}-p`} name="pass" type="password" autoComplete="current-password" required />
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Einen Moment …" : "Einloggen"}
      </button>
      <p className="note">
        Passwort vergessen? Melde dich beim Studio, du bekommst einen neuen Einladungslink.{" "}
        <Link className="linkbtn" href="/#kontakt">
          Zugang anfragen
        </Link>
      </p>
    </form>
  );
}
