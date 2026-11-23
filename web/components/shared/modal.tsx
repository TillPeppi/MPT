"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  text?: string;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * Modaler Dialog auf Basis von <dialog>: Fokus-Falle, Esc zum Schließen und Hintergrund-Inertness
 * liefert der Browser. Wird nur bei Bedarf gerendert (`{open && <Modal …/>}`).
 */
export function Modal({ title, text, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.classList.add("noscroll");
    return () => {
      document.body.classList.remove("noscroll");
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="box">
        <button type="button" className="x" aria-label="Schließen" onClick={onClose}>
          ×
        </button>
        <div className="mh">
          <h3 id={titleId}>{title}</h3>
          {text && <p>{text}</p>}
        </div>
        {children}
      </div>
    </dialog>
  );
}
