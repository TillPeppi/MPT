"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Pill } from "@/components/member/ui";
import { TARIFFS } from "@/lib/admin-schema";
import { fmtDate, iso } from "@/lib/format";
import type { AdminMemberRow } from "@/types/admin";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";

type Filter = "all" | "active" | "inactive" | "trial" | "due" | "invite";

export function MembersList({ members }: { members: AdminMemberRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [today] = useState(() => iso(new Date()));
  const [weekAhead] = useState(() => iso(new Date(new Date().getTime() + 7 * 86_400_000)));

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members.filter((m) => {
      if (s && !`${m.name} ${m.email} ${m.phone}`.toLowerCase().includes(s)) return false;
      if (filter === "active") return m.active;
      if (filter === "inactive") return !m.active;
      if (filter === "trial") return m.active && (m.tariff === "testphase" || !!m.trialEnd);
      if (filter === "due") return m.active && !!m.nextMeasurementDue && m.nextMeasurementDue <= weekAhead;
      if (filter === "invite") return !m.hasPassword;
      return true;
    });
  }, [members, q, filter, weekAhead]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await adminApi<{ id: string }>("POST", "/api/admin/members", { name: fd.get("name"), email: fd.get("email"), tariff: fd.get("tariff"), phone: fd.get("phone") });
      toast.success("Kunde angelegt. Erzeuge jetzt den Einladungslink.");
      router.push(`/admin/kunden/${res.id}`);
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm-search">
        <input type="search" placeholder="Name, E-Mail oder Telefon suchen …" aria-label="Kunden suchen" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="active">Aktive</option>
          <option value="all">Alle</option>
          <option value="inactive">Inaktive</option>
          <option value="trial">Testphase</option>
          <option value="due">Messung fällig</option>
          <option value="invite">Noch ohne Passwort</option>
        </select>
        <button type="button" className="btn btn-primary adm-b" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          + Neuer Kunde
        </button>
      </div>

      {adding && (
        <section className="adm-card" style={{ maxWidth: 760, marginBottom: 18 }}>
          <header>
            <h2>Neuer Kunde</h2>
          </header>
          <form className="adm-form wide" onSubmit={create}>
            <div className="adm-row">
              <div className="adm-field">
                <label htmlFor="nm-n">Name *</label>
                <input id="nm-n" name="name" type="text" required maxLength={120} />
              </div>
              <div className="adm-field">
                <label htmlFor="nm-e">E-Mail *</label>
                <input id="nm-e" name="email" type="email" required />
              </div>
            </div>
            <div className="adm-row">
              <div className="adm-field">
                <label htmlFor="nm-p">Telefon</label>
                <input id="nm-p" name="phone" type="text" />
              </div>
              <div className="adm-field">
                <label htmlFor="nm-t">Tarif</label>
                <select id="nm-t" name="tariff" defaultValue="kleingruppe">
                  {Object.entries(TARIFFS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <button type="submit" className="btn btn-primary adm-b" disabled={busy}>
                Kunde anlegen
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="tscroll" style={{ background: "var(--surface)" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="hide-sm">Tarif</th>
              <th className="hide-sm">Zuletzt dabei</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link className="nm" href={`/admin/kunden/${m.id}`}>
                    {m.name}
                  </Link>
                  <div className="muted">{m.email}</div>
                </td>
                <td className="hide-sm">
                  {TARIFFS[m.tariff] ?? m.tariff}
                  {m.groups.length ? <div className="muted">{m.groups.join(", ")}</div> : null}
                </td>
                <td className="hide-sm">{m.lastSession ? fmtDate(m.lastSession) : "–"}</td>
                <td>
                  <div className="adm-actions">
                    {!m.active && <Pill tone="off">Inaktiv</Pill>}
                    {!m.hasPassword && <Pill tone="warn">Einladung offen</Pill>}
                    {m.nextMeasurementDue && m.nextMeasurementDue <= today && <Pill tone="warn">Messung fällig</Pill>}
                    {m.trialEnd && m.trialEnd >= today && <Pill tone="info">Test bis {fmtDate(m.trialEnd)}</Pill>}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="adm-empty">
                  Keine Kunden gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
