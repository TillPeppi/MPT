import type { CSSProperties } from "react";

/** Hintergrundbild als Inline-Style (die Bilder liegen unter /public/assets/img) */
export const bg = (url?: string): CSSProperties | undefined =>
  url ? { backgroundImage: `url('${url}')` } : undefined;

/** Inline-Style mit CSS-Variablen (z. B. `--img`, `--cols`) */
export const cssVars = (vars: Record<string, string | number>): CSSProperties => vars as CSSProperties;
