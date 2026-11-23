"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Pill } from "@/components/member/ui";
import { TARIFFS, type FieldDef } from "@/lib/admin-schema";
import type { AdminMember } from "@/types/admin";
import { adminApi, errMsg } from "./api";
import { EditForm } from "./edit-form";
import { useToast } from "./toast";

export function MemberProfile({ member }: { member: AdminMember }) {
  const router = useRouter();
  const toast = useToast();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const fields = useMemo<FieldDef[]>(
    () => [
      { k: "name", t: "text", l: "Name", req: true, max: 120 },
      { k: "email", t: "text", l: "E-Mail (eindeutig)", req: true },
      { k: "phone", t: "text", l: "Telefon", max: 30 },
      { k: "birthday", t: "date", l: "Geburtsdatum" },
      { k: "goal", t: "text", l: "Ziel", max: 300 },
      { k: "active", t: "toggle", l: "Aktiv (darf sich anmelden)", h: "Inaktive Kunden sind abgemeldet und können sich nicht einloggen." },
      { k: "tariff", t: "select", l: "Tarif", o: { ...TARIFFS, ...(member.tariff in TARIFFS ? {} : { [member.tariff]: member.tariff }) } },
      { k: "groups", t: "strings", l: "Gruppen", h: "Eine pro Zeile, z. B. golf. Wird für Kurs-Beschränkungen genutzt." },
      { k: "trialStart", t: "date", l: "Testphase: Beginn" },
      { k: "trialEnd", t: "date", l: "Testphase: Ende" },
      { k: "notes", t: "textarea", l: "Notizblock (intern)", rows: 7, max: 10_000, h: "Nur für das Team sichtbar. Wird nie an Kunden-Endpunkte ausgeliefert." },
    ],
    [member.tariff],
  );

  const initial = {
    name: member.name,
    email: member.email,
    phone: member.phone,
    birthday: member.birthday ?? "",
    goal: member.goal,
    active: member.active,
    tariff: member.tariff,
    groups: member.groups,
    trialStart: member.trialStart ?? "",
    trialEnd: member.trialEnd ?? "",
    notes: member.notes,
  };

  async function invite() {
    setBusy(true);
    try {
      const res = await adminApi<{ token: string; expiresAt: number }>("POST", `/api/admin/members/${member.id}/invite`, {});
      setLink(`${window.location.origin}/mitglieder/einladung?token=${encodeURIComponent(res.token)}`);
      toast.success("Link erzeugt. Er ist 7 Tage gültig und funktioniert nur einmal.");
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link kopiert.");
    } catch {
      toast.error("Kopieren nicht möglich. Bitte markiere den Link und kopiere ihn von Hand.");
    }
  }

  async function del() {
    const typed = window.prompt(`Alle Daten von ${member.name} werden unwiderruflich gelöscht (Buchungen, Pläne, Messungen, Recaps). Zur Bestätigung den Namen eintippen:`);
    if (typed === null) return;
    if (typed.trim() !== member.name) return toast.error("Der Name stimmt nicht überein. Es wurde nichts gelöscht.");
    setBusy(true);
    try {
      await adminApi("DELETE", `/api/admin/members/${member.id}`);
      toast.success("Kunde gelöscht.");
      router.replace("/admin/kunden");
      router.refresh();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="adm-split rev">
      <EditForm
        fields={fields}
        initial={initial}
        onSave={async (v) => {
          await adminApi("PUT", `/api/admin/members/${member.id}`, {
            ...v,
            birthday: v.birthday || null,
            trialStart: v.trialStart || null,
            trialEnd: v.trialEnd || null,
          });
          router.refresh();
        }}
      />
      <div className="adm-listed" style={{ gap: 18 }}>
        <section className="adm-card">
          <header>
            <h3>Zugang</h3>
            <Pill tone={member.hasPassword ? "ok" : "warn"}>{member.hasPassword ? "Passwort gesetzt" : "Noch kein Passwort"}</Pill>
          </header>
          <p className="muted">Der Link dient als Einladung und als Passwort-Reset. Bei einem Reset werden bestehende Anmeldungen des Kunden beendet.</p>
          {member.inviteOpen && !link && <p className="hint">Es gibt einen offenen Link. Ein neuer macht den alten ungültig.</p>}
          <button type="button" className="btn btn-primary adm-b" disabled={busy} onClick={invite}>
            {member.hasPassword ? "Reset-Link erzeugen" : "Einladungslink erzeugen"}
          </button>
          {link && (
            <div className="adm-link" role="status">
              <span style={{ flex: "1 1 200px" }}>{link}</span>
              <button type="button" className="btn btn-ghost adm-b sm" onClick={copy}>
                Kopieren
              </button>
            </div>
          )}
        </section>
        <section className="adm-card">
          <header>
            <h3>Datenschutz</h3>
          </header>
          <a className="btn btn-ghost adm-b" href={`/api/admin/members/${member.id}/export`} download>
            Daten exportieren (JSON)
          </a>
          <button type="button" className="btn danger adm-b" disabled={busy} onClick={del}>
            Kunde löschen
          </button>
        </section>
      </div>
    </div>
  );
}
