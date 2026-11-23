"use client";

import { useEffect } from "react";

const MSG = "Du hast ungespeicherte Änderungen. Seite trotzdem verlassen?";

/**
 * Schutz vor Datenverlust: Browser-Warnung beim Schließen/Neuladen und Rückfrage bei Klick auf interne Links,
 * solange `dirty` gesetzt ist. (Der Zurück-Button des Browsers wird nicht abgefangen.)
 */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (!window.confirm(MSG)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
