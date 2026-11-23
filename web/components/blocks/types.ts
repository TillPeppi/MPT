import type { Block, SiteData } from "@/types/site";

/** Kontext, den jeder Block bekommt (nur serverseitig genutzt) */
export interface BlockCtx {
  site: SiteData;
  /** Anker-IDs der aktuellen Seite (für die Auflösung von #kontakt & Co.) */
  anchors: Set<string>;
}

export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

export interface BlockProps<T extends Block["type"]> {
  block: BlockOf<T>;
  ctx: BlockCtx;
}
