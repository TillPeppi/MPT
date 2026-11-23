"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { MemberContext, type MemberContextValue } from "@/hooks/use-session";
import { clearCart, getCartServerSnapshot, getCartSnapshot, subscribeCart } from "@/lib/cart";
import type { Session, ShopProduct } from "@/types/member";
import { CartModal } from "./cart-modal";

interface Props {
  shop: { pickupNote?: string; currency?: string };
  children: ReactNode;
}

async function fetchSession(): Promise<Session | null> {
  try {
    const res = await fetch("/api/member/session", { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { session: Session | null }).session;
  } catch {
    return null;
  }
}

/** Hält die Sitzung (GET /api/member/session), die Preisliste und den Anfrage-Warenkorb für die ganze Seite. */
export function MemberProvider({ shop, children }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartServerSnapshot);

  const refreshSession = useCallback(async () => {
    const s = await fetchSession();
    setSession(s);
    if (!s) {
      setProducts(null);
      clearCart();
    }
    return s;
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchSession().then((s) => {
      if (alive) setSession(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const memberId = session?.memberId;
  useEffect(() => {
    if (!memberId) return;
    let alive = true;
    void fetch("/api/member/shop", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ products: ShopProduct[] }>) : null))
      .then((d) => {
        if (alive && d) setProducts(d.products);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [memberId]);

  const value = useMemo<MemberContextValue>(
    () => ({ session, refreshSession, products: memberId ? products : null, cart, openCart: () => setCartOpen(true), shop }),
    [session, refreshSession, memberId, products, cart, shop],
  );

  return (
    <MemberContext.Provider value={value}>
      {children}
      {cartOpen && session && <CartModal onClose={() => setCartOpen(false)} />}
    </MemberContext.Provider>
  );
}
