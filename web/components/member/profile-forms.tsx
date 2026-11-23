"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useMember } from "@/hooks/use-session";

type Msg = { ok: boolean; text: string } | null;

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Das hat nicht geklappt.");
  }
}

const Message = ({ msg }: { msg: Msg }) =>
  msg ? (
    <p className={msg.ok ? "okmsg" : "err"} role={msg.ok ? "status" : "alert"}>
      {msg.text}
    </p>
  ) : null;

export function PhoneForm({ phone }: { phone: string }) {
  const uid = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await post("/api/member/profile", { phone: new FormData(e.currentTarget).get("phone") });
      setMsg({ ok: true, text: "Gespeichert." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Keine Verbindung zum Server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form plain" onSubmit={submit}>
      <label htmlFor={`${uid}-t`}>Telefon</label>
      <input id={`${uid}-t`} name="phone" type="tel" autoComplete="tel" defaultValue={phone} maxLength={30} />
      <Message msg={msg} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        Speichern
      </button>
    </form>
  );
}

export function PasswordForm() {
  const uid = useId();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const next = String(fd.get("new") ?? "");
    if (next.length < 8) return setMsg({ ok: false, text: "Das neue Passwort braucht mindestens 8 Zeichen." });
    if (next !== fd.get("new2")) return setMsg({ ok: false, text: "Die beiden neuen Passwörter stimmen nicht überein." });
    setBusy(true);
    setMsg(null);
    try {
      await post("/api/member/password", { current: fd.get("current"), new: next });
      form.reset();
      setMsg({ ok: true, text: "Passwort geändert. Andere Geräte wurden abgemeldet." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Keine Verbindung zum Server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form plain" onSubmit={submit}>
      <label htmlFor={`${uid}-c`}>Aktuelles Passwort</label>
      <input id={`${uid}-c`} name="current" type="password" autoComplete="current-password" required />
      <label htmlFor={`${uid}-n`}>Neues Passwort (mind. 8 Zeichen)</label>
      <input id={`${uid}-n`} name="new" type="password" autoComplete="new-password" minLength={8} required />
      <label htmlFor={`${uid}-n2`}>Neues Passwort wiederholen</label>
      <input id={`${uid}-n2`} name="new2" type="password" autoComplete="new-password" minLength={8} required />
      <Message msg={msg} />
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        Passwort ändern
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const { refreshSession } = useMember();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/member/logout", { method: "POST" }).catch(() => undefined);
        await refreshSession();
        router.replace("/mitglieder/login");
        router.refresh();
      }}
    >
      Abmelden
    </button>
  );
}
