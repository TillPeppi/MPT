"use client";

import { createContext, useContext } from "react";
import type { Session } from "@/types/member";
import type { CartItem } from "@/lib/cart";
import type { ShopProduct } from "@/types/member";

export type { Session };

export interface MemberContextValue {
  /** `undefined` solange die Sitzung noch geladen wird, `null` = Gast */
  session: Session | null | undefined;
  refreshSession: () => Promise<Session | null>;
  /** Produkte mit Preisen (nur mit Sitzung, sonst `null`) */
  products: ShopProduct[] | null;
  cart: CartItem[];
  openCart: () => void;
  shop: { pickupNote?: string; currency?: string };
}

export const MemberContext = createContext<MemberContextValue | null>(null);

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember braucht den MemberProvider (app/layout.tsx).");
  return ctx;
}

/** Aktuelle Mitglieder-Sitzung: `Session` (eingeloggt) oder `null` (Gast bzw. noch nicht geladen). */
export function useSession(): Session | null {
  return useMember().session ?? null;
}
