"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pill } from "@/components/member/ui";
import { eur, fmtDate } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/member-view";
import type { Order, OrderStatus } from "@/types/member";
import { adminApi, errMsg } from "./api";
import { useToast } from "./toast";

const NEXT: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  neu: [{ to: "bestaetigt", label: "Bestätigen" }],
  bestaetigt: [{ to: "bereit", label: "Zur Abholung bereit" }],
  bereit: [{ to: "abgeholt", label: "Als abgeholt markieren" }],
  abgeholt: [],
  abgelehnt: [],
};

function OrderCard({ o }: { o: Order }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(o.internalNote ?? "");
  const st = ORDER_STATUS[o.status];

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      await adminApi("PATCH", `/api/admin/orders/${o.id}`, body);
      toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="adm-card">
      <header>
        <h3>
          {o.no} · {o.memberId ? <Link href={`/admin/kunden/${o.memberId}?tab=uebersicht`}>{o.customer.name}</Link> : o.customer.name}
        </h3>
        <Pill tone={st.tone}>{o.status === "bereit" ? "Bereit" : st.label}</Pill>
      </header>
      <p className="muted">
        {fmtDate(o.createdAt.slice(0, 10))} · {o.customer.email}
        {o.customer.phone ? ` · ${o.customer.phone}` : ""}
      </p>
      <ul className="adm-list">
        {o.items.map((it, i) => (
          <li key={i}>
            <div className="t">
              <b>
                {it.qty} × {it.name}
              </b>
              {it.variant && <small>{it.variant}</small>}
            </div>
            <span>{eur(it.sum)}</span>
          </li>
        ))}
      </ul>
      <div className="adm-actions" style={{ justifyContent: "space-between" }}>
        <b>Summe</b>
        <b>{eur(o.total)}</b>
      </div>
      {o.customer.note && <p className="muted">Nachricht des Kunden: „{o.customer.note}“</p>}
      <div className="adm-field">
        <label htmlFor={`note-${o.id}`}>Interne Notiz</label>
        <textarea id={`note-${o.id}`} rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        <div>
          <button type="button" className="btn btn-ghost adm-b sm" disabled={busy || note === (o.internalNote ?? "")} onClick={() => patch({ internalNote: note }, "Notiz gespeichert.")}>
            Notiz speichern
          </button>
        </div>
      </div>
      <div className="adm-actions">
        {NEXT[o.status].map((n) => (
          <button key={n.to} type="button" className="btn btn-primary adm-b sm" disabled={busy} onClick={() => patch({ status: n.to }, `Status: ${ORDER_STATUS[n.to].label}`)}>
            {n.label}
          </button>
        ))}
        {(o.status === "neu" || o.status === "bestaetigt" || o.status === "bereit") && (
          <button type="button" className="btn danger adm-b sm" disabled={busy} onClick={() => window.confirm("Anfrage ablehnen?") && patch({ status: "abgelehnt" }, "Anfrage abgelehnt.")}>
            Ablehnen
          </button>
        )}
        {(o.status === "abgelehnt" || o.status === "abgeholt") && (
          <button type="button" className="btn btn-ghost adm-b sm" disabled={busy} onClick={() => patch({ status: "neu" }, "Wieder auf „Neu“ gesetzt.")}>
            Wieder öffnen
          </button>
        )}
      </div>
    </section>
  );
}

export function OrdersAdmin({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const shown = orders.filter((o) => (filter === "open" ? o.status === "neu" || o.status === "bestaetigt" || o.status === "bereit" : filter === "done" ? o.status === "abgeholt" || o.status === "abgelehnt" : true));
  const openCount = orders.filter((o) => o.status === "neu" || o.status === "bestaetigt" || o.status === "bereit").length;
  return (
    <>
      <nav className="adm-tabs" aria-label="Filter">
        {([["open", `Offen (${openCount})`], ["done", "Abgeschlossen"], ["all", "Alle"]] as const).map(([k, l]) => (
          <a key={k} href="#" className={filter === k ? "on" : ""} onClick={(e) => { e.preventDefault(); setFilter(k); }}>
            {l}
          </a>
        ))}
      </nav>
      <div className="adm-grid">
        {shown.map((o) => (
          <OrderCard key={o.id} o={o} />
        ))}
      </div>
      {shown.length === 0 && <p className="adm-empty">Keine Anfragen.</p>}
    </>
  );
}
