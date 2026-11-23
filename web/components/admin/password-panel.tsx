"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";

export function PasswordPanel() {
  const uid = useId();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const next = String(fd.get("new") ?? "");
    if (next.length < 8) return toast.error("Das neue Passwort braucht mindestens 8 Zeichen.");
    if (next !== fd.get("new2")) return toast.error("Die beiden neuen Passwörter stimmen nicht überein.");
    setBusy(true);
    try {
      await adminApi("POST", "/api/admin/password", { current: fd.get("current"), new: next });
      form.reset();
      toast.success("Passwort geändert. Andere Geräte wurden abgemeldet.");
      router.refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={submit}>
      <div className="adm-field">
        <label htmlFor={`${uid}-c`}>Aktuelles Passwort</label>
        <input id={`${uid}-c`} name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="adm-field">
        <label htmlFor={`${uid}-n`}>Neues Passwort (mindestens 8 Zeichen)</label>
        <input id={`${uid}-n`} name="new" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="adm-field">
        <label htmlFor={`${uid}-n2`}>Neues Passwort wiederholen</label>
        <input id={`${uid}-n2`} name="new2" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <button type="submit" className="btn btn-primary adm-b" disabled={busy}>
          Passwort ändern
        </button>
      </div>
    </form>
  );
}
