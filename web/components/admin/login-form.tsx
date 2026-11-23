"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { adminApi, errMsg } from "./api";

const safeNext = (n?: string): string => (n && /^\/admin(\/|$)/.test(n) && !n.startsWith("//") ? n : "/admin");

export function AdminLoginForm({ next }: { next?: string }) {
  const uid = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await adminApi("POST", "/api/admin/login", { username: fd.get("username"), pass: fd.get("pass") });
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={submit}>
      <div className="adm-field">
        <label htmlFor={`${uid}-u`}>Benutzername</label>
        <input id={`${uid}-u`} name="username" type="text" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div className="adm-field">
        <label htmlFor={`${uid}-p`}>Passwort</label>
        <input id={`${uid}-p`} name="pass" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary adm-b" disabled={busy}>
        {busy ? "Einen Moment …" : "Anmelden"}
      </button>
    </form>
  );
}
