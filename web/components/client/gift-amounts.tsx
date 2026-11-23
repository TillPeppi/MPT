"use client";

import { useState } from "react";

export function GiftAmounts({ amounts }: { amounts: string[] }) {
  const [sel, setSel] = useState(Math.min(1, amounts.length - 1));
  return (
    <div className="amounts" role="group" aria-label="Gutschein-Betrag">
      {amounts.map((a, i) => (
        <button key={a} type="button" className={i === sel ? "on" : ""} aria-pressed={i === sel} onClick={() => setSel(i)}>
          {a}
        </button>
      ))}
    </div>
  );
}
