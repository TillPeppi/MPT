"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Modal } from "@/components/shared/modal";
import { useMember } from "@/hooks/use-session";
import { cartCount, clearCart, setCartQty } from "@/lib/cart";
import { eur } from "@/lib/format";
import type { OrderResult } from "@/types/member";

/** Anfrage-Warenkorb: Positionen prüfen, Notiz, Datenschutz, Anfrage senden (POST /api/order). Abholung & Zahlung im Studio. */
export function CartModal({ onClose }: { onClose: () => void }) {
  const { cart, products, shop } = useMember();
  const uid = useId();
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<OrderResult | null>(null);

  const rows = cart.flatMap((c) => {
    const p = products?.find((x) => x.id === c.productId);
    return p ? [{ ...c, product: p, sum: Math.round(p.price * c.qty * 100) / 100 }] : [];
  });
  const total = Math.round(rows.reduce((s, r) => s + r.sum, 0) * 100) / 100;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Bitte stimme der Datenschutzerklärung zu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({ productId: r.productId, variant: r.variant, qty: r.qty })),
          customer: { note },
          consent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<OrderResult> & { error?: string };
      if (!res.ok || !data.no) throw new Error(data.error || "Die Anfrage konnte nicht gesendet werden.");
      setDone({ ok: true, no: data.no, total: data.total ?? total });
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keine Verbindung zum Server.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal title="Anfrage gesendet" text={`Deine Anfrage ${done.no} (${eur(done.total, shop.currency)}) ist bei uns angekommen.`} onClose={onClose}>
        <div className="m-body">
          <p className="note" role="status">
            {shop.pickupNote ?? "Abholung und Bezahlung im Studio."} Wir melden uns, sobald alles bereitliegt.
          </p>
        </div>
        <div className="m-actions">
          <Link className="btn btn-primary" href="/mitglieder/anfragen" onClick={onClose}>
            Meine Anfragen
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Schließen
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Deine Anfrage" text={shop.pickupNote ?? "Abholung & Bezahlung im Studio."} onClose={onClose}>
      {rows.length === 0 ? (
        <div className="m-body">
          <p className="empty">{cartCount(cart) > 0 && !products ? "Preise werden geladen …" : "Deine Anfrage ist noch leer."}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="cart-form">
          <ul className="cart-list">
            {rows.map((r) => (
              <li key={`${r.productId}|${r.variant}`}>
                <div className="cart-name">
                  <b>{r.product.name}</b>
                  <small>{[r.variant, r.product.unit].filter(Boolean).join(" · ")}</small>
                </div>
                <div className="qty" role="group" aria-label={`Menge ${r.product.name}`}>
                  <button type="button" aria-label="Weniger" onClick={() => setCartQty(r.productId, r.variant, r.qty - 1)}>
                    −
                  </button>
                  <span aria-live="polite">{r.qty}</span>
                  <button type="button" aria-label="Mehr" disabled={r.qty >= 20} onClick={() => setCartQty(r.productId, r.variant, r.qty + 1)}>
                    +
                  </button>
                </div>
                <b className="cart-sum">{eur(r.sum, shop.currency)}</b>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <span>Summe</span>
            <b>{eur(total, shop.currency)}</b>
          </div>
          <label htmlFor={`${uid}-note`} className="fl">
            Notiz (optional)
          </label>
          <textarea id={`${uid}-note`} className="fi" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Wunsch für die Abholung" />
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung der Anfrage zu (Datenschutz).</span>
          </label>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <div className="m-actions cart-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Wird gesendet …" : "Anfrage senden"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Weiter stöbern
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
