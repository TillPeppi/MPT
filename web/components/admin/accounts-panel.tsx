"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Pill } from "@/components/member/ui";
import { fmtDate } from "@/lib/format";
import type { AdminAccount } from "@/types/admin";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";

export function AccountsPanel({ accounts, meId }: { accounts: AdminAccount[]; meId: string }) {
  const uid = useId();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await run(async () => {
      await adminApi("POST", "/api/admin/accounts", { username: fd.get("username"), name: fd.get("name"), password: fd.get("password") });
      form.reset();
    }, "Konto angelegt. Das Startpasswort muss beim ersten Login geändert werden.");
  }

  function reset(a: AdminAccount) {
    const pw = window.prompt(`Neues Startpasswort für ${a.name} (mindestens 8 Zeichen):`);
    if (pw === null) return;
    void run(() => adminApi("PATCH", `/api/admin/accounts/${a.id}`, { password: pw }), "Passwort zurückgesetzt. Alle Geräte dieses Kontos wurden abgemeldet.");
  }

  return (
    <div className="adm-grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
      <section className="adm-card">
        <header>
          <h2>Admin-Konten</h2>
        </header>
        <ul className="adm-list">
          {accounts.map((a) => (
            <li key={a.id}>
              <div className="t">
                <b>
                  {a.name} {a.id === meId && <small>(du)</small>}
                </b>
                <small>
                  @{a.username} · seit {fmtDate(a.createdAt.slice(0, 10))}
                  {a.mustChangePassword ? " · Startpasswort noch nicht geändert" : ""}
                </small>
              </div>
              <div className="adm-actions">
                <Pill tone={a.active ? "ok" : "off"}>{a.active ? "Aktiv" : "Deaktiviert"}</Pill>
                <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => reset(a)}>
                  Passwort zurücksetzen
                </button>
                {a.id !== meId && (
                  <button type="button" className={`btn adm-b sm ${a.active ? "danger" : "btn-ghost"}`} disabled={busy} onClick={() => run(() => adminApi("PATCH", `/api/admin/accounts/${a.id}`, { active: !a.active }), a.active ? "Konto deaktiviert." : "Konto aktiviert.")}>
                    {a.active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="adm-card">
        <header>
          <h2>Neues Konto</h2>
        </header>
        <form className="adm-form" onSubmit={create}>
          <div className="adm-row">
            <div className="adm-field">
              <label htmlFor={`${uid}-n`}>Name</label>
              <input id={`${uid}-n`} name="name" type="text" required maxLength={80} />
            </div>
            <div className="adm-field">
              <label htmlFor={`${uid}-u`}>Benutzername</label>
              <input id={`${uid}-u`} name="username" type="text" required autoCapitalize="none" pattern="[a-z0-9._\-]{3,30}" title="3 bis 30 Zeichen: Kleinbuchstaben, Ziffern, Punkt, Bindestrich" />
            </div>
            <div className="adm-field">
              <label htmlFor={`${uid}-p`}>Startpasswort</label>
              <input id={`${uid}-p`} name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary adm-b" disabled={busy}>
              Konto anlegen
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
