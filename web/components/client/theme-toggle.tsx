"use client";

import { THEME_KEY } from "@/lib/theme";

/** Schaltet zwischen hellem und dunklem Theme um und merkt sich die Wahl. */
export function toggleTheme(): void {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* Speicher blockiert (z. B. privater Modus): Wahl gilt nur für diese Sitzung */
  }
}

const Sun = () => (
  <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const Moon = () => (
  <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

/** Das gezeigte Icon steuert reines CSS über data-theme, daher keine Hydration-Abweichung. */
export function ThemeToggle() {
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Zwischen hellem und dunklem Design wechseln">
      <Sun />
      <Moon />
    </button>
  );
}
