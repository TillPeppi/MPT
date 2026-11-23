"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { FieldDef } from "@/lib/admin-schema";
import { errMsg } from "./api";
import { FieldEditor, type FieldCtx, type Obj } from "./fields";
import { useToast } from "./toast";
import { useUnsavedGuard } from "./use-unsaved";

interface Props {
  fields: FieldDef[];
  initial: Obj;
  /** Speichert; Rückgabe (optional) ist der Stand nach dem Speichern (z. B. mit neuer ID) */
  onSave: (value: Obj) => Promise<Obj | void>;
  ctx?: FieldCtx;
  saveLabel?: string;
  successText?: string;
  onDelete?: () => Promise<void>;
  deleteLabel?: string;
  /** Zusätzliche Felder/Inhalte oberhalb der Felder */
  before?: ReactNode;
  after?: ReactNode;
  wide?: boolean;
}

/** Formular mit Dirty-Tracking, Schutz vor Datenverlust, Toasts und fixierter Speicherleiste (tablettauglich). */
export function EditForm({ fields, initial, onSave, ctx, saveLabel = "Speichern", successText = "Gespeichert.", onDelete, deleteLabel = "Löschen", before, after, wide }: Props) {
  const toast = useToast();
  const [value, setValue] = useState<Obj>(initial);
  const [base, setBase] = useState(() => JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(value) !== base;
  useUnsavedGuard(dirty);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await onSave(value);
      const next = saved ?? value;
      setValue(next);
      setBase(JSON.stringify(next));
      toast.success(successText);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!onDelete || !window.confirm("Wirklich löschen? Das lässt sich nicht rückgängig machen.")) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form className={`adm-form ${wide ? "wide" : ""}`} onSubmit={submit} noValidate>
      {before}
      <FieldEditor fields={fields} value={value} onChange={setValue} ctx={ctx} />
      {after}
      <div className="adm-bar">
        <button type="submit" className="btn btn-primary adm-b" disabled={busy || !dirty}>
          {busy ? "Speichert …" : saveLabel}
        </button>
        {dirty ? <span className="dirty" role="status">Ungespeicherte Änderungen</span> : <span className="hint">Alles gespeichert.</span>}
        <span className="spacer" />
        {onDelete && (
          <button type="button" className="btn danger adm-b" disabled={busy} onClick={del}>
            {deleteLabel}
          </button>
        )}
      </div>
    </form>
  );
}
