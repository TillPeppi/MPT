"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 30_000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Auf die Minute gerundet, damit der Snapshot zwischen Ticks stabil bleibt */
const snapshot = (): number => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = (): null => null;

/**
 * Aktuelle Zeit (ms), aktualisiert alle 30 s. Auf dem Server und beim ersten Client-Render `null`,
 * damit es keine Hydration-Abweichung durch die Uhrzeit gibt.
 */
export function useNow(): number | null {
  return useSyncExternalStore<number | null>(subscribe, snapshot, serverSnapshot);
}
