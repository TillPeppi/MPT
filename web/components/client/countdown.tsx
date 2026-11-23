"use client";

import { useNow } from "@/hooks/use-now";

/** Restzeit bis zum Monatsende der Challenge (`month` = YYYY-MM). */
export function Countdown({ month }: { month: string }) {
  const now = useNow();
  const [y, mo] = month.split("-").map(Number);
  const end = new Date(y, mo, 1).getTime();
  const ms = now === null ? null : Math.max(0, end - now);
  const v = ms === null ? ["–", "–", "–"] : [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60];
  const labels = ["Tage", "Std.", "Min."];
  return (
    <div className="countdown">
      {v.map((x, i) => (
        <div key={labels[i]}>
          <b>{x}</b>
          <span>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
