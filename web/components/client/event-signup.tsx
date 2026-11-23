"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/modal";
import { fmtDate } from "@/lib/format";
import type { FormDef, GolfEvent } from "@/types/site";
import { ContactForm } from "./contact-form";

interface Props {
  event: GolfEvent;
  form: FormDef;
  free: number;
  /** Beschriftung, wenn noch Plätze frei sind */
  label?: string;
}

export function EventSignup({ event, form, free, label = "Anmelden" }: Props) {
  const [open, setOpen] = useState(false);
  const hasSpots = free > 0;
  return (
    <>
      <button
        type="button"
        className={`btn ${hasSpots ? "btn-primary" : "btn-ghost"} btn-sm`}
        disabled={!hasSpots}
        onClick={() => setOpen(true)}
      >
        {hasSpots ? label : "Ausgebucht"}
      </button>
      {open && (
        <Modal title={event.title} text={`${fmtDate(event.date)} · ${event.time} Uhr · ${event.price}`} onClose={() => setOpen(false)}>
          <ContactForm form={form} presetSubject={`Anmeldung: ${event.title} (${fmtDate(event.date)})`} />
        </Modal>
      )}
    </>
  );
}
