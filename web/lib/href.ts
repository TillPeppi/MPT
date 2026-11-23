import type { Page } from "@/types/site";

/** Anker-IDs, die ein Block auf seiner Seite setzt */
const ANCHORS: Partial<Record<Page["blocks"][number]["type"], string>> = {
  contact: "kontakt",
  schedule: "kursplan",
  pricing: "preise",
  events: "events",
  shop: "shop",
};

export function anchorsOf(page: Page): Set<string> {
  const set = new Set<string>();
  for (const b of page.blocks) {
    const a = ANCHORS[b.type];
    if (a && !b.hidden) set.add(a);
  }
  return set;
}

/**
 * Mappt Inhalts-Links des Prototyps auf echte Pfade:
 * `#/kurse` → `/kurse`, `#/` → `/`, `#kontakt` bleibt In-Page-Anker (existiert der Anker auf der
 * aktuellen Seite nicht, wird `#kontakt` zu `/#kontakt`, also zum Formular der Startseite).
 */
export function resolveHref(href: string | undefined, anchors?: Set<string>): string {
  const h = (href ?? "").trim();
  if (!h) return "/";
  if (h.startsWith("#/")) return h.length === 2 ? "/" : `/${h.slice(2).replace(/\/$/, "")}`;
  if (h.startsWith("#")) {
    const id = h.slice(1);
    if (anchors && id === "kontakt" && !anchors.has(id)) return "/#kontakt";
    return h;
  }
  return h;
}

export const isExternal = (href: string): boolean => /^(https?:)?\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
