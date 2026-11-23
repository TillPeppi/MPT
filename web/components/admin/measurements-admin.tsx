"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDate, num } from "@/lib/format";
import { skinSum } from "@/lib/member-view";
import type { Measurement } from "@/types/member";
import type { MeasurePoint } from "@/types/site";
import { adminApi, errMsg } from "./api";
import { EditForm } from "./edit-form";
import { blankMeasure, MeasureFields, measureToDraft, measureToPayload, type MeasureDraft } from "./measure-fields";
import { useToast } from "./toast";
import { useUnsavedGuard } from "./use-unsaved";

const NEW = "__new__";

function MeasureForm({ memberId, initial, config, onDone }: { memberId: string; initial: MeasureDraft; config: { skinfolds: MeasurePoint[]; girths: MeasurePoint[] }; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [base] = useState(() => JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(value) !== base;
  useUnsavedGuard(dirty);

  async function save() {
    setBusy(true);
    try {
      await adminApi("POST", `/api/admin/members/${memberId}/measurements`, measureToPayload(value));
      toast.success("Messung gespeichert.");
      router.refresh();
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function del() {
    if (!value.id || !window.confirm("Messung wirklich löschen?")) return;
    setBusy(true);
    try {
      await adminApi("DELETE", `/api/admin/members/${memberId}/measurements/${value.id}`);
      toast.success("Messung gelöscht.");
      router.refresh();
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="adm-form wide">
      <MeasureFields idp="ms" value={value} onChange={setValue} skinfolds={config.skinfolds} girths={config.girths} />
      <div className="adm-bar">
        <button type="button" className="btn btn-primary adm-b" disabled={busy || !dirty} onClick={save}>
          {busy ? "Speichert …" : "Messung speichern"}
        </button>
        <button type="button" className="btn btn-ghost adm-b" disabled={busy} onClick={() => { if (!dirty || window.confirm("Eingaben verwerfen?")) onDone(); }}>
          Abbrechen
        </button>
        {dirty && <span className="dirty" role="status">Ungespeicherte Änderungen</span>}
        <span className="spacer" />
        {value.id && (
          <button type="button" className="btn danger adm-b" disabled={busy} onClick={del}>
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}

export function MeasurementsAdmin({ memberId, measurements, due, config }: { memberId: string; measurements: Measurement[]; due: string | null; config: { skinfolds: MeasurePoint[]; girths: MeasurePoint[] } }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const current = editing && editing !== NEW ? measurements.find((m) => m.id === editing) : undefined;

  return (
    <div className="adm-listed" style={{ gap: 22 }}>
      <section className="adm-card" style={{ maxWidth: 760 }}>
        <header>
          <h2>Nächste Messung</h2>
        </header>
        <EditForm
          fields={[{ k: "nextMeasurementDue", t: "date", l: "Fällig am", h: "Leer = keine Erinnerung. Der Kunde sieht den Termin in seiner Übersicht." }]}
          initial={{ nextMeasurementDue: due ?? "" }}
          saveLabel="Termin speichern"
          onSave={async (v) => {
            await adminApi("PUT", `/api/admin/members/${memberId}`, { nextMeasurementDue: v.nextMeasurementDue || null });
            router.refresh();
          }}
        />
      </section>

      <section className="adm-card">
        <header>
          <h2>Messungen</h2>
          {editing === null && (
            <button type="button" className="btn btn-primary adm-b" onClick={() => setEditing(NEW)}>
              + Neue Messung
            </button>
          )}
        </header>
        {editing !== null ? (
          <MeasureForm key={editing} memberId={memberId} initial={current ? measureToDraft(current) : blankMeasure()} config={config} onDone={() => setEditing(null)} />
        ) : measurements.length ? (
          <div className="tscroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th className="num">Gewicht</th>
                  <th className="num">Lean Mass</th>
                  <th className="num">Körperfett</th>
                  <th className="num">Σ Hautfalten</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id}>
                    <td>{fmtDate(m.date)}</td>
                    <td className="num">{m.weight != null ? `${num(m.weight)} kg` : "–"}</td>
                    <td className="num">{m.leanMass != null ? `${num(m.leanMass)} kg` : "–"}</td>
                    <td className="num">{m.bodyfat != null ? `${num(m.bodyfat)} %` : "–"}</td>
                    <td className="num">{skinSum(m) != null ? `${num(skinSum(m) ?? 0)} mm` : "–"}</td>
                    <td className="num">
                      <button type="button" className="btn btn-ghost adm-b sm" onClick={() => setEditing(m.id)}>
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-empty">Noch keine Messung.</p>
        )}
      </section>
    </div>
  );
}
