import { NextResponse } from "next/server";
import { createInquiry, getSite } from "@/lib/api";
import { validateContact } from "@/lib/contact";

/** POST /api/contact: validiert die Anfrage und legt sie ab (Mock: data/inquiries.json). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const site = await getSite();
  const result = validateContact(body, site.forms);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  // Honeypot: Bots füllen das versteckte Feld. Wir tun so, als wäre alles gut, speichern aber nichts.
  if (result.value.website) return NextResponse.json({ ok: true });

  try {
    await createInquiry(result.value);
  } catch (err) {
    console.error("Anfrage konnte nicht gespeichert werden", err);
    return NextResponse.json({ ok: false, error: "Die Anfrage konnte nicht gespeichert werden. Bitte versuche es später erneut." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
