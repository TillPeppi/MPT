"use client";

/* Anfrage-Warenkorb (Shop): localStorage `mpt-cart`, über useSyncExternalStore an React angebunden. */

export interface CartItem {
  productId: string;
  variant: string;
  qty: number;
}

const KEY = "mpt-cart";
const MAX_QTY = 20;
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function parse(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data.filter(
      (x): x is CartItem =>
        !!x && typeof x.productId === "string" && typeof x.variant === "string" && Number.isInteger(x.qty) && x.qty > 0,
    );
  } catch {
    return EMPTY;
  }
}

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* Speicher gesperrt: leerer Warenkorb */
  }
  if (raw !== cache.raw) cache = { raw, items: parse(raw) };
  return cache.items;
}

function write(items: CartItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignorieren */
  }
  listeners.forEach((l) => l());
}

export function subscribeCart(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
export const getCartSnapshot = (): CartItem[] => read();
export const getCartServerSnapshot = (): CartItem[] => EMPTY;

export function addToCart(productId: string, variant: string, qty = 1): void {
  const items = [...read()];
  const i = items.findIndex((x) => x.productId === productId && x.variant === variant);
  if (i >= 0) items[i] = { ...items[i], qty: Math.min(MAX_QTY, items[i].qty + qty) };
  else items.push({ productId, variant, qty: Math.min(MAX_QTY, qty) });
  write(items);
}

export function setCartQty(productId: string, variant: string, qty: number): void {
  const items = read()
    .map((x) => (x.productId === productId && x.variant === variant ? { ...x, qty: Math.min(MAX_QTY, qty) } : x))
    .filter((x) => x.qty > 0);
  write(items);
}

export const clearCart = (): void => write(EMPTY);
export const cartCount = (items: CartItem[]): number => items.reduce((s, x) => s + x.qty, 0);
