import type { ContactRequest, FormDef } from "@/types/site";

/** Erlaubte Formularfelder (Schlüssel = deutsche Feldbezeichnung) mit maximaler Länge */
const FIELD_LIMITS: Record<string, number> = {
  Name: 120,
  "E-Mail": 200,
  Telefon: 60,
  Unternehmen: 160,
  Mitarbeitende: 30,
  Wunschtermin: 20,
  Uhrzeit: 10,
  Betreff: 200,
  Nachricht: 5000,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ValidationResult =
  | { ok: true; value: ContactRequest }
  | { ok: false; error: string };

export function validateContact(body: unknown, forms: FormDef[]): ValidationResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Ungültige Anfrage." };
  const b = body as Record<string, unknown>;
  const formId = typeof b.formId === "string" ? b.formId : "";
  if (!forms.some((f) => f.id === formId)) return { ok: false, error: "Unbekanntes Formular." };
  if (b.consent !== true) return { ok: false, error: "Bitte stimme der Datenschutzerklärung zu." };
  if (typeof b.fields !== "object" || b.fields === null) return { ok: false, error: "Ungültige Anfrage." };

  const fields: Record<string, string> = {};
  for (const [key, raw] of Object.entries(b.fields as Record<string, unknown>)) {
    const limit = FIELD_LIMITS[key];
    if (!limit || typeof raw !== "string") continue;
    const v = raw.trim();
    if (v) fields[key] = v.slice(0, limit);
  }
  if (!fields.Name) return { ok: false, error: "Bitte gib deinen Namen an." };
  if (!fields["E-Mail"] || !EMAIL.test(fields["E-Mail"])) return { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse an." };

  return {
    ok: true,
    value: {
      formId,
      fields,
      consent: true,
      website: typeof b.website === "string" ? b.website : "",
    },
  };
}
