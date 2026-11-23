"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  kind: "ok" | "err";
  text: string;
}
interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast braucht den ToastProvider (app/admin/layout.tsx).");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === "err" ? 8000 : 4000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (t) => push("ok", t), error: (t) => push("err", t) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`adm-toast ${t.kind === "err" ? "err" : ""}`} role={t.kind === "err" ? "alert" : "status"}>
            <span>{t.text}</span>
            <button type="button" aria-label="Meldung schließen" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}>
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
