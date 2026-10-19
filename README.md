# MPT – Website & Admin (Demo)

Website im Design „Bold Athletic" und ein Admin-Panel mit Drag & Drop. Alle Inhalte liegen in `data/site.json`.

## Starten

```bash
python3 server.py
```

- Website: http://127.0.0.1:5173/
- Admin: http://127.0.0.1:5173/admin/
- Entwürfe (Runde 1 & 2): http://127.0.0.1:5173/entwuerfe.html

Nur Python-Standardbibliothek, keine Installation nötig.

## Admin-Login

Standard-Zugang beim ersten Start: Benutzer `admin`, Passwort `admin`. Das Admin zeigt einen Warnhinweis, bis du ihn unter **Einstellungen → Konto** änderst (mind. 8 Zeichen).

- Passwort wird gehasht in `data/admin.json` gespeichert (PBKDF2, nicht über den Webserver abrufbar)
- Sitzung per HttpOnly-Cookie, 12 Stunden, nach 5 Fehlversuchen 5 Minuten Sperre
- Passwort vergessen: `data/admin.json` löschen, dann gilt wieder der Standard-Zugang

## Struktur

| Pfad | Inhalt |
|---|---|
| `index.html`, `site/app.js`, `site/styles.css` | Website-Renderer: Seiten → Blöcke → Stil-Varianten |
| `admin/` | Admin-Panel (`schema.js` definiert Blöcke, Felder, Inhalte) |
| `data/site.json` | Alle öffentlichen Inhalte (Seiten, Blöcke, Kurse, Produkte, Team, Blog …), **keine Personendaten** |
| `data/members.json` | Kunden inkl. Passwort-Hash, Trainingspläne, Trainingslogs, Messungen |
| `data/bookings.json` | Kursbuchungen (inkl. Warteliste) |
| `data/orders.json` | Shop-Bestellungen (MPT-1001 …) |
| `server.py` | API: Inhalte speichern, Bild-Upload, Formulare, Kunden-Login, Kursbuchung, Shop |
| `assets/img/` | Bilder der alten Website · Uploads landen in `assets/uploads/` |

## Kunden, Buchung, Shop

Verbindlicher Vertrag: `docs/spec-kunden-shop-buchung.md`.

- **Datenhaltung:** `data/members.json`, `bookings.json`, `orders.json` sind über den Webserver nicht abrufbar (`/data/` ist gesperrt, auch bei `%64ata`, `//data`, Groß-/Kleinschreibung). Schreibzugriffe laufen über einen gemeinsamen Lock. Beim ersten Start migriert der Server `collections.members` aus `site.json` nach `data/members.json` (Backup in `data/backups/`) und legt Demo-Daten an. Danach enthält `site.json` keine Kunden mehr.
- **Kunden-Login:** Der Coach legt Kunden im Admin an und erzeugt einen Einladungslink (7 Tage gültig, einmalig). Der Kunde setzt damit sein Passwort (mind. 8 Zeichen, PBKDF2). Cookie `mpt_member` (HttpOnly, SameSite=Lax, 14 Tage), getrennt von der Admin-Session `mpt_session`; ein Kunden-Cookie öffnet nie `/api/admin/*`. 5 Fehlversuche in 5 Minuten pro IP sperren den Login.
- **Kursbuchung:** `GET /api/slots` liefert Belegungszähler, `POST /api/member/book` bucht einmalig oder als Serie (jede Woche, bis `maxSeries`), volle Kurse gehen auf die Warteliste, Stornieren bis `cancelHours` vor Kursbeginn, danach rückt die Warteliste nach. Einstellungen unter `settings.booking`, Schließtage aus `settings.hours.exceptions`.
- **Shop:** Produkte in `collections.products`, Bestellung über `POST /api/order` (Preise immer serverseitig). Abholung und Bezahlung im Studio. Bestellungen verwaltet der Coach im Admin, Mail an `settings.shop.recipients` bei konfiguriertem SMTP.
- **Admin-API** (nur mit Admin-Session, sonst 401): `/api/admin/members`, `/member`, `/member/delete`, `/member/invite`, `/bookings`, `/orders`.

## Demo-Zugänge

| Bereich | Zugang |
|---|---|
| Admin | Benutzer `admin`, Passwort `admin` (Standard, bitte ändern) |
| Kunde (Mitgliederbereich, Buchung) | E-Mail `demo@mpt.de`, Passwort `mpt-demo-2026` |

Der Demo-Kunde hat zwei aktive Papierpläne („Till P. ①/②"), einen abgeschlossenen Plan, vier Messungen und drei Buchungen. Vor dem Livegang löschen oder Passwort ändern.

## Online-Demo (GitHub Pages)

Die Demo läuft ohne Server unter https://tillpeppi.github.io/MPT/ (Admin: `/MPT/admin/`, gleiche Zugänge wie oben).

- `site/demo-api.js` ist das erste Skript auf Website, Admin und Login. Es ist nur auf `*.github.io` oder mit `?demo=1` aktiv (wird in der Sitzung gemerkt, `?demo=0` schaltet ab) und ersetzt `fetch('/api/…')` durch einen Browser-Mock, der `server.py` nachbildet (gleiche Pfade, Statuscodes, Fehlertexte, Buchungsregeln, Bestellungen, Admin-/Kunden-Login).
- Zustand liegt in `localStorage` (`mpt-demo-state`) und ist zwischen Website, Admin und Vorschau geteilt. Unten links erscheint ein Hinweis mit **Zurücksetzen**.
- Startdaten kommen aus `demo/seed.json`. Das erzeugt `python3 tools/build_demo.py` aus `data/` (ohne Passwort-Hashes); der Workflow `.github/workflows/pages.yml` führt es bei jedem Push auf `main` aus und veröffentlicht `index.html`, `site/`, `admin/`, `assets/` (ohne `assets/original`), `designs/`, `demo/`. `server.py` und `data/` bleiben draußen. Nach Änderungen an `data/` einmal `python3 tools/build_demo.py` ausführen und `demo/seed.json` mit committen.
- Buchungen im Seed werden beim ersten Laden um ganze Wochen in die nächsten 1–14 Tage verschoben. Bildpfade (`/assets/…`) bleiben in den Daten unverändert und werden zur Laufzeit auf den Unterpfad umgeschrieben. Uploads werden als Data-URL im Browser gespeichert.
- Alle Daten bleiben im Browser der besuchenden Person; es werden keine Mails verschickt.

## E-Mail-Versand

Anfragen werden immer im Admin unter „Anfragen" gespeichert. Für echten Versand SMTP setzen:

```bash
SMTP_HOST=smtp.example.de SMTP_USER=… SMTP_PASS=… SMTP_FROM=… python3 server.py
```

## Vor dem Livegang offen

- HTTPS beim Hosting (Cookie dann zusätzlich mit `Secure`)
- Demo-Kunde und Demo-Passwort entfernen, Standard-Adminpasswort ändern
- Online-Zahlung (Shop ist Abholung im Studio), Simulator/Gutschein-Buchung, Google-Places- und Instagram-API
- Rechtstexte, Cookie-Banner, Fonts lokal hosten, serverseitiges Rendern für SEO
