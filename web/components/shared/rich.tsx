import { Fragment, type ReactNode } from "react";

const TOKEN = /(\*\*.+?\*\*|\*.+?\*)/g;

/**
 * Inline-Auszeichnung aus dem CMS-Text:
 *   *Wort*   → orange hervorgehoben
 *   **Wort** → fett
 *   \n       → Zeilenumbruch
 *   &shy;    → weicher Trennstrich
 */
export function rich(input: string | undefined | null): ReactNode {
  if (!input) return null;
  const text = String(input).replaceAll("&shy;", "­");
  return text.split("\n").map((line, li) => (
    <Fragment key={li}>
      {li > 0 && <br />}
      {line.split(TOKEN).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <span key={i} className="acc">{part.slice(1, -1)}</span>;
        return part;
      })}
    </Fragment>
  ));
}
