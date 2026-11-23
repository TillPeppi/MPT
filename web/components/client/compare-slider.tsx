"use client";

import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cssVars } from "@/lib/style";

/** Vorher/Nachher-Regler: Ziehen mit Maus/Finger, Pfeiltasten für Tastaturbedienung. */
export function CompareSlider({ children, label }: { children: ReactNode; label: string }) {
  const [pos, setPos] = useState(50);

  const setFrom = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
    else return;
    e.preventDefault();
  };
  const style: CSSProperties = cssVars({ "--pos": `${pos}%` });

  return (
    <div
      className="cmp"
      style={style}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFrom(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFrom(e);
      }}
    >
      {children}
      <div className="handle" />
    </div>
  );
}
