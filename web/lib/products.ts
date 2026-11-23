import type { Product, PublicProduct } from "@/types/site";

/** Entfernt den Preis: Gäste dürfen ihn weder sehen noch im Seitenquelltext finden. */
export function toPublicProduct(product: Product): PublicProduct {
  const rest: PublicProduct = { ...product };
  delete rest.price;
  return rest;
}
