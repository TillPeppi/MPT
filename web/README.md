# MPT Website (Next.js)

Öffentliche Website von Metsch Personal Training. Etappe 3 von 3: Website, Kundenbereich, Kursbuchung, Shop-Anfrage und Admin-Bereich. Die Daten kommen aus einer Mock-API (Route-Handler + JSON-Dateien).

## Starten

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Produktions-Build (statisch + stündliche Revalidierung)
npm run lint
```

Vom Repo-Root: `npm --prefix web run dev`.

## Struktur

```
app/
  layout.tsx            Root-Layout: Fonts (next/font), Theme-Skript (vor dem Zeichnen), globale CSS
  page.tsx              Startseite
  [slug]/page.tsx       training, kurse, shop, golf, team, firmen, blog, mitglieder (Platzhalter)
  blog/[slug]/page.tsx  Blog-Artikel
  api/site, api/contact Mock-Routen, spiegeln die künftige REST-API
components/
  blocks/               ein Block-Typ = eine Komponente (render-block.tsx wählt nach `type`)
  client/               interaktive Teile ("use client"): Header/Burger, Theme, Kursplan, Shop, Formular, Modals …
  layout/, shared/      Seitenrahmen, Footer, Rich-Text, Links, Modal
hooks/                  use-session (Stub), use-now
lib/api.ts              Datenzugriff (server-only), einzige Stelle mit Datenquelle
lib/                    href (#/kurse → /kurse), hours, format, seo, contact (Validierung)
styles/                 tokens.css (alle Farben, hell/dunkel) + portierte CSS-Dateien
data/site.json          Inhalte (Einstellungen, Seiten → Blöcke, Sammlungen)
types/site.ts           Datenmodell
```

Die Seitenstruktur ist durch die Blockliste in `data/site.json` fest vorgegeben. Das Admin kann später nur Inhalte (Texte, Bilder, Preise) ändern, nicht das Layout.

## Theme

Alle Farben stehen in `styles/tokens.css` (`:root[data-theme="dark"|"light"]`). Standard ist `prefers-color-scheme`; der Schalter im Header und im mobilen Menü speichert die Wahl in `localStorage` (`mpt-theme`). Ein kleines Inline-Skript im `<head>` setzt das Theme vor dem ersten Zeichnen.

## Datenschicht: Wechsel auf die Go-API

Alles läuft über `lib/api.ts`:

| Funktion | heute | später |
| --- | --- | --- |
| `getSite()`, `getPage()`, `getPost()` … | liest `data/site.json` | `GET {API_URL}/site` |
| `createInquiry()` | hängt an `data/inquiries.json` an | `POST {API_URL}/contact` |

Setze `API_URL` (z. B. `API_URL=http://localhost:8080/api` in `.env.local`), dann wird die Go-API verwendet, ohne Änderung an Seiten oder Komponenten. Die Route-Handler `app/api/site` und `app/api/contact` entfallen dann oder werden zu Proxys.

Laufzeitdaten (`data/inquiries.json` u. a.) sind in `.gitignore` eingetragen.

## Etappe 2: Kundenbereich, Buchung, Shop-Anfrage

### Demo-Zugänge

| Zugang | Daten |
| --- | --- |
| Kunde mit Plänen, Messungen, Buchungen | `demo@mpt.de` / `mpt-demo-2026` (Tarif `kleingruppe`, Gruppe `golf`) |
| Offene Einladung (Passwort setzen) | `/mitglieder/einladung?token=demo-einladung-2026` (Lena Berger, Tarif `pt`) |

Zurücksetzen: Laufzeitdateien löschen (`rm data/{members,bookings,orders,appointments,recaps,sessions}.json`), sie werden beim nächsten Zugriff aus `data/seed/` neu angelegt. Beim Kopieren werden Buchungen, Termine und Recaps um ganze Wochen auf „heute“ verschoben.

### Seiten

`/mitglieder` (Übersicht), `/buchen` (Kleingruppe, PT & Check-up, Meine Buchungen), `/training`, `/messungen`, `/recap`, `/anfragen`, `/profil`, dazu `/mitglieder/login` und `/mitglieder/einladung?token=`. `proxy.ts` leitet ohne Cookie zum Login; die echte Prüfung macht `requireSession()` in jeder Seite. Header: Vorname + Warenkorb-Icon bei Login. Kursplan (`/kurse`) und Shop nutzen die echte Sitzung.

### Endpunkte (Mock = künftige Go-API, Fehler immer `{ "error": "…" }`)

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `/api/slots?from=&days=` | Belegung (nur Zähler); mit Sitzung zusätzlich `mine`, `allowed` |
| POST | `/api/order` | Shop-Anfrage (nur Login, Preise serverseitig) |
| POST | `/api/member/login`, `/logout` | Cookie `mpt_member` (HttpOnly, Lax, 14 Tage, Secure in Produktion); 5 Fehlversuche / 5 min / IP |
| GET | `/api/member/session` | leichte Sitzungsabfrage (`{session:null}` für Gäste) |
| GET/POST | `/api/member/invite`, `/activate` | Einladung prüfen / Passwort (mind. 8 Zeichen) setzen |
| GET | `/api/member/me` | Profil, Buchungen, Termine, Anfragen, Pläne, Messungen, Recap |
| POST | `/api/member/profile`, `/password` | Telefon ändern, Passwort ändern |
| POST | `/api/member/book`, `/cancel` | Einzel/Serie, Warteliste; Storno bis `cancelHours`, Nachrücken automatisch |
| GET/POST | `/api/member/appointments` | PT/Check-up anfragen |
| POST | `/api/member/appointments/respond` | Gegenvorschlag `accept`/`decline` |
| GET/POST | `/api/member/recap` | Fragen + Verlauf / einmal je ISO-Woche absenden |
| GET | `/api/member/shop`, `/api/member/orders` | Preisliste, eigene Anfragen |

### Datendateien (`data/`, Laufzeit gitignored, Seeds unter `data/seed/`)

`members.json` (inkl. Hash/Einladung, Pläne, Messungen), `bookings.json`, `orders.json`, `appointments.json`, `recaps.json`, `sessions.json` (Token nur als SHA-256). Konfiguration in `site.json` → `settings.recap` (Fragen, Skala ohne 7, Gewichte, `maxSessions`), `settings.appointments`, `settings.measure`, Kurs-Feld `allowed` (B-7: `tariffs`, `groups`, `memberIds`). Datei-I/O ausschließlich in `lib/mock-db.ts` (Mutex-Transaktionen), Regeln in `lib/mock-backend.ts`.

### Beim Wechsel auf die Go-API

`API_URL` setzen: `lib/api.ts` exportiert `backend` dann als `lib/remote-backend.ts` (REST gegen dieselben Pfade, Cookie wird durchgereicht; noch nicht gegen ein echtes Backend getestet). `lib/mock-db.ts`, `lib/mock-backend.ts` und `data/seed/` entfallen; die Route-Handler unter `app/api/` werden Proxys oder entfallen. Die Go-API muss die Regeln aus `mock-backend.ts` übernehmen (Buchung, Warteliste, B-7, Score-Formel in `lib/recap.ts`).

### Bewusst vereinfacht

- Keine Mails (Buchung, Nachrücken, Anfrage); die Admin-Endpunkte dafür gibt es seit Etappe 3 (siehe unten).
- Buchung für mehrere Personen (B-4) fehlt; `Booking.participants` ist optional vorgesehen.
- Anwesenheit = vergangene gebuchte Termine und eingetragene Trainings.
- Newsletter-Feld im Footer und Rechtstexte bleiben Platzhalter.

## Etappe 3: Admin-Bereich

### Zugang

`/admin/login`, Benutzer `admin`, Passwort `admin` (Seed aus `data/seed/admins.json`). Solange das Startpasswort nicht geändert ist, zeigt jede Admin-Seite eine Warnleiste (Einstellungen > Mein Passwort). Weitere Konten: Einstellungen > Admin-Konten (anlegen, deaktivieren, Passwort zurücksetzen). Der Admin hat ein eigenes Cookie `mpt_admin` (HttpOnly, SameSite=Strict, 12 h), getrennt vom Kunden-Cookie: ein Kunden-Cookie öffnet weder `/admin/*` noch `/api/admin/*`. Prüfung: `proxy.ts` (Cookie vorhanden?) + `requireAdmin()` in jeder Seite + Sitzungsprüfung in JEDER Methode von `lib/mock-admin-backend.ts`; Login: scrypt, 5 Fehlversuche / 5 min / IP; schreibende Anfragen prüfen die Herkunft.

Zurücksetzen der Admin-Daten: `rm data/admins.json data/adminSessions.json` (werden beim nächsten Zugriff aus dem Seed neu angelegt). Inhalte: `data/site.json` ist versioniert und wird vom Admin direkt überschrieben (Git zeigt die Änderungen); zurück mit `git checkout data/site.json`. Hochgeladene Bilder liegen in `public/uploads/` (gitignored, JPG/PNG/WebP bis 5 MB, Magic-Bytes geprüft) und werden zusätzlich über `app/uploads/[name]/route.ts` ausgeliefert, weil `next start` nachträglich angelegte Dateien in `public/` sonst nicht kennt.

### Bereiche

| Pfad | Inhalt |
| --- | --- |
| `/admin` | heute, offene Terminanfragen, neue Shop-Anfragen, fällige Messungen |
| `/admin/inhalte[/seite[/abschnitt]]` | feste Seiten und Abschnitte: nur Daten bearbeiten, Abschnitt ausblenden, Seiten-SEO |
| `/admin/sammlungen/[name]` | team, reviews, stories, posts (Blog/Ernährung, Entwurf), events, challenges (+ Ergebnisse), products, news, courses |
| `/admin/buchungen` | Wochenansicht je Termin: Teilnehmer, Warteliste, Anwesenheit, Plätze freigeben, Kunden eintragen/stornieren |
| `/admin/termine` | PT-/Check-up-Anfragen bestätigen, ablehnen, Gegenvorschlag; Termin direkt anlegen |
| `/admin/kunden[/id]` | Tabs Stammdaten, Pläne (+ Logs), Messungen, Check-up, Übersicht |
| `/admin/anfragen` | Shop-Anfragen: neu, bestätigt, bereit, abgeholt, abgelehnt + interne Notiz |
| `/admin/einstellungen?tab=` | studio, hours, seo, forms, legal, booking, appointments, recap, checkup, konten, passwort |

Neu öffentlich: `/impressum`, `/datenschutz`, `/agb`, `/widerruf` (Texte aus Einstellungen > Rechtstexte, Footer verlinkt).

### Admin-Endpunkte (alle mit Cookie `mpt_admin`, Fehler `{ "error": "…" }`, 401 ohne gültige Admin-Sitzung)

| Methode | Pfad | Zweck |
| --- | --- | --- |
| POST | `/api/admin/login`, `/logout` | Anmeldung (`{username, pass}`) / Abmeldung |
| GET | `/api/admin/session`, `/dashboard`, `/site` | Sitzung, Kennzahlen, komplette Site-Daten (inkl. Entwürfe, Preise, News) |
| POST | `/api/admin/password` | eigenes Passwort ändern |
| GET/POST | `/api/admin/accounts` | Konten listen / anlegen |
| PATCH | `/api/admin/accounts/:id` | Name, aktiv, Passwort zurücksetzen |
| PUT | `/api/admin/pages/:pageId/blocks/:blockId` | `{props?, hidden?}`, erneuert die öffentlichen Seiten |
| PUT | `/api/admin/pages/:pageId/seo` | Seiten-SEO |
| POST / DELETE | `/api/admin/collections/:name[/:id]` | Eintrag anlegen/ändern (mit `id`) bzw. löschen |
| PUT | `/api/admin/settings/:section` | studio, hours, seo, forms, legal, booking, appointments, recap, checkup |
| POST | `/api/admin/upload` | Bild (multipart `file`) → `{path}` |
| GET/POST | `/api/admin/bookings` | Wochenansicht (`?from=`) / Buchung im Namen eines Kunden (`force` = über Kapazität) |
| POST | `/api/admin/bookings/:id/cancel`, `/attendance`, `/promote` | stornieren (auch nach Frist), Anwesenheit (`attended`/`noshow`/`open`), Nachrücken |
| POST | `/api/admin/slots/spots` | Plätze für einen Termin ändern (`null` = Standard), Warteliste rückt nach (wenn aktiv) |
| GET/POST | `/api/admin/appointments`, `/api/admin/appointments/:id` | Liste / direkt anlegen; `confirm`, `decline`, `counter` |
| GET/POST | `/api/admin/members` | Kundenliste / anlegen |
| GET/PUT/DELETE | `/api/admin/members/:id` | Detail / Stammdaten / löschen (DSGVO) |
| POST | `/api/admin/members/:id/invite` | Einladungs-/Reset-Link (Token nur in dieser Antwort) |
| GET | `/api/admin/members/:id/export` | DSGVO-Auskunft (JSON-Download) |
| POST / DELETE | `/api/admin/members/:id/(plans\|measurements\|checkups\|logs)[/:itemId]` | Pläne, Messungen, Check-ups, Trainingslogs (Logs: `planId`, Löschen mit `?plan=`) |
| GET / PATCH | `/api/admin/orders[/:id]` | Shop-Anfragen, Status und `internalNote` |

### Datenmodell (neu)

`data/admins.json`, `data/adminSessions.json`; `bookings.json` bekommt `overrides` (Plätze je Termin); Kunden: `birthday`, `goal`, `trialStart/End`, `checkups` (intern); Shop-Anfrage: `internalNote`; Termin: `adminNote` (intern); `site.json`: `collections.news`, `settings.legal`, `settings.checkup.points`, `settings.booking.waitlistAutoPromote`, `social.whatsapp`, `seo.image`, `status` an Beiträgen, `pricePrefix` an Preiskarten. `notes`, `internalNote`, `adminNote` und Check-ups werden von keinem Kunden-Endpunkt ausgeliefert. Anwesenheit: `attended: true` zählt, `false` (nicht erschienen) zählt nie, ohne Eintrag zählt die vergangene Buchung weiter als Fallback.

### Bewusst vereinfacht

Keine Mails/Pushes, kein Audit-Log, Akzentfarbe/Logo/Standard-Theme nicht im Admin, Schutz vor Datenverlust deckt Schließen, Neuladen und Link-Klicks ab (nicht den Zurück-Button), Löschen eines Kunden entfernt Buchungen, Termine, Recaps und Pläne, Shop-Anfragen bleiben anonymisiert.
