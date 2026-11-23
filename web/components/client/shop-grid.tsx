"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/shared/modal";
import { useMember } from "@/hooks/use-session";
import { addToCart } from "@/lib/cart";
import { eur, lines } from "@/lib/format";
import { bg } from "@/lib/style";
import type { PublicProduct } from "@/types/site";

interface Props {
  products: PublicProduct[];
  variant: string;
  currency?: string;
}

const initials = (s: string): string =>
  s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function CategoryIcon({ category }: { category?: string }) {
  const c = (category ?? "").toLowerCase();
  const path = c.includes("prot") ? (
    <path d="M5 8h14v13H5zM4 4h16v4H4zM9 14h6" />
  ) : c.includes("suppl") ? (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)" />
      <path d="M9.3 8.3l5.4 7.4" />
    </>
  ) : c.includes("equip") ? (
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
  ) : (
    <path d="M5 8h14l-1.5 12h-11zM9 8a3 3 0 016 0" />
  );
  return (
    <svg className="pic-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

/**
 * Shop-Raster. Gäste sehen Bild, Name und Beschreibung, aber keine Preise; „Anfragen“ führt zum Login.
 * Mitglieder sehen die Preise (kommen nach dem Login aus GET /api/member/shop, nie aus dem Seiten-HTML)
 * und legen Produkte in den Anfrage-Warenkorb (Header-Icon).
 */
export function ShopGrid({ products, variant, currency }: Props) {
  const { session, products: priced, shop } = useMember();
  const [cat, setCat] = useState("");
  const [gate, setGate] = useState(false);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string | null>(null);
  const cur = currency ?? shop.currency;
  const priceOf = (id: string): number | undefined => priced?.find((x) => x.id === id)?.price;
  const cats = [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))];
  const shown = products.filter((p) => !cat || p.category === cat);

  return (
    <>
      {cats.length > 1 && (
        <div className="sched-filter" role="group" aria-label="Kategorie">
          <button type="button" className={cat === "" ? "on" : ""} aria-pressed={cat === ""} onClick={() => setCat("")}>
            Alle
          </button>
          {cats.map((c) => (
            <button key={c} type="button" className={cat === c ? "on" : ""} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      {shown.length > 0 ? (
        <div className={variant === "rows" ? "shop-rows" : "shop-grid"}>
          {shown.map((p) => {
            const soldOut = !!p.soldOut;
            const variants = lines(p.variants);
            return (
              <article key={p.id} className={`prod ${soldOut ? "so" : ""}`}>
                {p.image ? (
                  <div className="pimg" style={bg(p.image)} role="img" aria-label={p.name} />
                ) : (
                  <div className="pimg ph" aria-hidden="true">
                    <span className="ini">{initials(p.name)}</span>
                    <CategoryIcon category={p.category} />
                  </div>
                )}
                {p.badge && <span className="pbadge">{p.badge}</span>}
                <div className="pb">
                  <h3>{p.name}</h3>
                  <div className="pmeta">
                    <span>{p.unit ?? ""}</span>
                    {p.category ? ` · ${p.category}` : ""}
                    {variants.length > 0 ? ` · ${variants.length} Sorten` : ""}
                  </div>
                  {p.desc && <p className="pdesc">{p.desc}</p>}
                  <div className="buy">
                    {session && priceOf(p.id) !== undefined && <b className="pprice">{eur(priceOf(p.id) ?? 0, cur)}</b>}
                    {session && !soldOut && variants.length > 0 && (
                      <select
                        className="vsel"
                        aria-label={`Sorte für ${p.name}`}
                        value={choice[p.id] ?? variants[0]}
                        onChange={(e) => setChoice((c) => ({ ...c, [p.id]: e.target.value }))}
                      >
                        {variants.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    )}
                    {soldOut ? (
                      <button type="button" className="btn btn-ghost btn-sm" disabled>
                        Ausverkauft
                      </button>
                    ) : session ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          addToCart(p.id, variants.length ? (choice[p.id] ?? variants[0]) : "");
                          setAdded(p.id);
                          setTimeout(() => setAdded((a) => (a === p.id ? null : a)), 1800);
                        }}
                      >
                        {added === p.id ? "Hinzugefügt ✓" : "Zur Anfrage hinzufügen"}
                      </button>
                    ) : session === undefined ? (
                      <button type="button" className="btn btn-primary btn-sm" disabled>
                        Einloggen zum Anfragen
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setGate(true)}>
                        Einloggen zum Anfragen
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">Aktuell sind keine Produkte verfügbar.</div>
      )}
      {gate && (
        <Modal title="Nur für Mitglieder" text="Der Shop ist für Mitglieder. Logge dich ein oder frage einen Zugang an." onClose={() => setGate(false)}>
          <div className="m-actions">
            <Link className="btn btn-primary" href="/mitglieder/login?next=/shop" onClick={() => setGate(false)}>
              Einloggen
            </Link>
            <Link className="btn btn-ghost" href="/#kontakt" onClick={() => setGate(false)}>
              Zugang anfragen
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
