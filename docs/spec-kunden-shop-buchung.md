# Spezifikation: Kunden-Dashboard, Kursbuchung, Shop

Stand 19.10.2026. Verbindlicher Vertrag zwischen `server.py`, Website (`site/`) und Admin (`admin/`).

Entscheidungen (mit MPT abgestimmt):
- Shop: Bestellen + Abholung im Studio, Bezahlung vor Ort. Keine Online-Zahlung, kein Versand.
- Kunden-Login: E-Mail + Passwort. Coach legt Kunden im Admin an, Kunde setzt sein Passwort über einen Einladungslink.
- Trainingswerte (WH/kg) und Messungen trägt **nur der Coach** im Admin ein. Kunden sehen alles nur an.
- Kursbuchung ersetzt Wix Spaces: Kurse dauern immer 1 h, Buchung einmalig oder als Serie (jede Woche, N Wochen), Warteliste, Stornieren.

## 1. Datenhaltung

`data/site.json` ist **öffentlich** (GET /api/site). Dort nur Inhalte und Konfiguration, **keine Personendaten**.
Personendaten liegen in eigenen Dateien unter `data/` (vom Webserver blockiert):

| Datei | Inhalt |
|---|---|
| `data/members.json` | Kunden inkl. Passwort-Hash, Pläne, Trainingslogs, Messungen |
| `data/bookings.json` | Kursbuchungen |
| `data/orders.json` | Shop-Bestellungen |

`collections.members` in site.json entfällt (Migration siehe 6.).

### 1.1 Kunde (`data/members.json` → `{"members": [...]}`)
```json
{
  "id": "m_ab12cd", "name": "Till P.", "email": "till@example.org", "phone": "",
  "createdAt": "2026-09-01T10:00:00", "active": true, "notes": "",
  "pw": {"salt": "...", "hash": "..."},
  "invite": {"token": "...", "exp": 1790000000},
  "plans": [Plan], "measurements": [Messung]
}
```
`pw` und `invite` verlassen den Server **nie** (weder Admin- noch Kunden-API). Stattdessen liefert die API `hasPassword: bool`, `invitePending: bool`.

### 1.2 Plan
```json
{
  "id": "pl_x1", "title": "Till P. ①", "status": "active",
  "start": "2026-09-25", "end": null, "goal": "", "note": "",
  "days": [{
    "id": "d_x1", "name": "Einheit 1",
    "exercises": [
      {"id": "e_x1", "group": "A1", "name": "Klimmzug an Ringen", "sets": 4, "reps": "1-3", "tempo": "4110", "rest": 60, "note": ""}
    ]
  }],
  "logs": [{
    "id": "lg_x1", "dayId": "d_x1", "date": "2026-09-25", "note": "",
    "sets": {"e_x1": [{"reps": 3, "kg": 10}, {"reps": 3, "kg": 10}, {"reps": 3, "kg": 12.5}, {"reps": 2, "kg": 15}]}
  }]
}
```
- `status`: `active` | `done` (abgeschlossen bzw. abgelaufen). Ein Kunde kann mehrere aktive Pläne haben.
- `group` ist die „Einheit"-Spalte vom Papierbogen (A1/A2 = Supersatz).
- `reps` ist Text: „6-8", „12-15", „30s".
- `tempo` ist Text: „4010", „30X0", „–".
- `rest` ist in Sekunden.
- `kg` darf 0 (Körpergewicht) oder eine Dezimalzahl sein. Leere Sätze werden als `null` gespeichert oder weggelassen.

### 1.3 Messung
```json
{
  "id": "ms_x1", "date": "2026-09-25", "weight": 82.4, "bodyfat": 14.1,
  "skinfolds": {"kinn": 8, "wange": 10, "bauch": 18},
  "girths": {"bauch": 84, "huefte": 98},
  "note": ""
}
```
- Hautfalten in mm, Umfänge in cm.
- `bodyfat` (%) trägt der Coach selbst ein (Ergebnis seiner Methode). Die Software rechnet keinen Körperfettwert aus, sie zeigt zusätzlich nur die **Σ Hautfalten**.
- Die Messpunkte sind konfigurierbar, siehe `settings.measure`.

### 1.4 Buchung (`data/bookings.json` → `{"bookings": [...]}`)
```json
{
  "id": "bk_x1", "courseId": "c3", "date": "2026-10-20", "start": "17:00", "title": "Functional Athletik",
  "memberId": "m_ab12cd", "name": "Till P.", "email": "till@example.org",
  "status": "booked", "seriesId": "s_x1", "createdAt": "...", "cancelledAt": null, "by": "member"
}
```
- `status`: `booked` | `waitlist` | `cancelled`.
- `by`: `member` | `admin`. Der Admin kann auch Gäste ohne `memberId` eintragen.

### 1.5 Bestellung (`data/orders.json` → `{"orders": [...]}`)
```json
{
  "id": "o_x1", "no": "MPT-1001", "createdAt": "...", "status": "neu",
  "customer": {"name": "", "email": "", "phone": "", "note": ""},
  "items": [{"productId": "p1", "name": "MPT Whey Protein", "variant": "Schoko", "qty": 2, "price": 34.9, "sum": 69.8}],
  "total": 69.8, "mailed": false
}
```
`status`: `neu` | `bereit` (liegt zur Abholung bereit) | `abgeholt` | `storniert`.

## 2. site.json-Erweiterungen (öffentlich)

```json
"settings": {
  "booking": {"weeksAhead": 8, "maxSeries": 12, "cancelHours": 12, "recipients": "info@metsch-personaltraining.de"},
  "shop": {"recipients": "info@metsch-personaltraining.de", "pickupNote": "Abholung & Bezahlung im Studio (bar, EC, PayPal).", "currency": "EUR"},
  "measure": {
    "skinfolds": [{"key": "kinn", "label": "Kinn"}, {"key": "wange", "label": "Wange"}, {"key": "brust", "label": "Brust"},
                  {"key": "trizeps", "label": "Trizeps"}, {"key": "subskapular", "label": "Schulterblatt"}, {"key": "achsel", "label": "Mittlere Achsel"},
                  {"key": "suprailiakal", "label": "Hüfte (Suprailiakal)"}, {"key": "bauch", "label": "Bauch (Nabel)"}, {"key": "knie", "label": "Knie"},
                  {"key": "wade", "label": "Wade"}, {"key": "oberschenkel", "label": "Oberschenkel vorne"}, {"key": "hamstring", "label": "Oberschenkel hinten"}],
    "girths": [{"key": "brust", "label": "Brust"}, {"key": "bauch", "label": "Bauch"}, {"key": "huefte", "label": "Hüfte"},
               {"key": "oberarm", "label": "Oberarm"}, {"key": "oberschenkel", "label": "Oberschenkel"}]
  }
},
"collections": {
  "products": [{"id": "p1", "name": "MPT Whey Protein", "category": "Protein", "price": 34.9, "unit": "1 kg",
                "image": "", "desc": "", "variants": "Schoko\nVanille\nErdbeere", "badge": "Bestseller", "active": true, "soldOut": false}]
}
```
- Kurse (`collections.courses`): `booked` ist nur noch ein Fallback ohne Server. Die echte Belegung kommt aus `/api/slots`. Kurse dauern 1 h, `end` = `start` + 1 h als Default.
- Neue Seite `shop` (Slug `shop`, im Menü) mit einem kompakten Hero und dem Block `shop`.

## 3. API

Alle Antworten sind JSON. Fehler kommen als `{"error": "deutscher Text"}` mit passendem Status. Nicht im Pfad abgebildete Felder werden ignoriert.

### 3.1 Öffentlich
| Methode | Pfad | Body / Query | Antwort |
|---|---|---|---|
| GET | `/api/slots` | `?from=YYYY-MM-DD&days=14` (max. 70) | `{"slots":[{"courseId","date","start","spots","booked","waitlist","past":bool,"bookable":bool}]}` – nur Zähler, keine Namen |
| POST | `/api/order` | `{"items":[{"productId","variant","qty"}],"customer":{"name","email","phone","note"},"consent":true}` | `{"ok":true,"no":"MPT-1001","total":69.8}` |

Regeln für `/api/order`:
- Der Preis kommt **immer** aus site.json, nie vom Client.
- Nur Produkte mit `active` und ohne `soldOut`.
- `qty` 1–20, `variant` muss in `variants` stehen, sofern Varianten existieren.
- Name, E-Mail und `consent` sind Pflicht.
- Mail an `settings.shop.recipients` (sofern SMTP konfiguriert).

### 3.2 Kunde (Cookie `mpt_member`, HttpOnly, SameSite=Lax, 14 Tage)
| Methode | Pfad | Body | Antwort |
|---|---|---|---|
| POST | `/api/member/login` | `{email, pass}` | `{ok}` + Cookie. Fehlversuche wie beim Admin begrenzt (5 in 5 min pro IP) |
| POST | `/api/member/logout` | – | `{ok}` |
| GET | `/api/member/invite` | `?token=` | `{name, email}`, sonst 400 „Einladung ungültig oder abgelaufen" |
| POST | `/api/member/activate` | `{token, pass}` (mind. 8 Zeichen) | setzt das Passwort, löscht `invite`, loggt ein |
| GET | `/api/member/me` | – | Kunde ohne `pw`/`invite` + `"bookings": [eigene Buchungen ab heute −60 Tage]`, sortiert |
| POST | `/api/member/book` | `{courseId, date, weeks}` | `{"ok":true,"created":[{id,date,status}],"skipped":[{date,reason}]}` |
| POST | `/api/member/cancel` | `{id, series:bool}` | `{"ok":true,"cancelled":n}` |
| POST | `/api/member/password` | `{current, new}` | `{ok}` |

Buchungsregeln:
- `date` muss auf `course.day` fallen und darf nicht in der Vergangenheit liegen (Kursbeginn > jetzt).
- Das erste Datum liegt innerhalb von `weeksAhead`. `weeks` ist 1–`maxSeries`.
- Folgetermine sind jeweils +7 Tage. Eine Serie bekommt eine gemeinsame `seriesId`.
- Bereits gebuchte Termine (gleicher Kunde, Kurs, Datum, Status ≠ cancelled) → `skipped` mit „bereits gebucht".
- Termine an Ausnahmetagen mit `closed` in `settings.hours.exceptions` → `skipped` mit „Studio geschlossen".
- Kurs voll → Status `waitlist`.
- Stornieren ist nur bis `cancelHours` vor Kursbeginn möglich, sonst 400 mit Hinweis.
- `series:true` storniert alle **zukünftigen** Termine dieser Serie, die noch stornierbar sind.
- Nach jeder Stornierung rückt der älteste `waitlist`-Eintrag desselben Kurs+Datum auf `booked` (Mail an ihn, sofern SMTP).
- Mail an `settings.booking.recipients` bei Buchung/Storno (optional, sofern SMTP).

### 3.3 Admin (bestehendes Cookie `mpt_session`)
| Methode | Pfad | Body | Antwort |
|---|---|---|---|
| GET | `/api/admin/members` | – | `[{id,name,email,active,hasPassword,invitePending,activePlans,donePlans,lastMeasurement,lastLog}]` |
| GET | `/api/admin/member` | `?id=` | Kunde komplett ohne `pw`/`invite` + `hasPassword`, `invitePending` |
| POST | `/api/admin/member` | `{member}` | Neu, wenn ohne `id`. Der Server behält `pw`/`invite`/`createdAt`. E-Mail muss eindeutig sein (case-insensitive). → gespeicherter Kunde |
| POST | `/api/admin/member/delete` | `{id}` | `{ok}` (Buchungen des Kunden bleiben, `memberId` wird geleert) |
| POST | `/api/admin/member/invite` | `{id}` | `{"ok":true,"link":"/?invite=TOKEN#/mitglieder","expires":ts,"mailed":bool}` (7 Tage gültig; überschreibt alte Einladung; auch zum Passwort-Zurücksetzen) |
| GET | `/api/admin/bookings` | `?from=&to=` | `{"bookings":[...]}` |
| POST | `/api/admin/bookings` | `{"action":"create","courseId","date","memberId"?,"name"?,"email"?,"weeks"?}` oder `{"action":"cancel","id"}` oder `{"action":"status","id","status"}` | `{ok,...}` (Admin darf über Kapazität buchen) |
| GET | `/api/admin/orders` | – | `{"orders":[...]}` neueste zuerst |
| POST | `/api/admin/orders` | `{id,status}` oder `{id,delete:true}` | `{ok}` |

Alle `/api/admin/*` liefern ohne Admin-Session 401.

## 4. Website (`site/app.js`, `site/styles.css`)

### 4.1 Kursplan-Block (`schedule`)
- Lädt `/api/slots` für die angezeigte Woche. Wochen-Navigation: „Diese Woche / ‹ › / Datum".
- Zeigt pro Kurs freie Plätze, „ausgebucht · Warteliste" oder „vorbei". Ohne Server oder im Editor gilt der Fallback `spots - booked`.
- Klick auf einen Kurs öffnet ein Modal:
  - **Eingeloggt:** Datum (der angeklickte Termin), Wahl „Nur diesen Termin" oder „Jede Woche · [N] Wochen" (2–maxSeries), Hinweis zur Warteliste, Button „Verbindlich buchen". Danach Ergebnisliste (gebucht / Warteliste / übersprungen + Grund).
  - **Nicht eingeloggt:** Login-Formular im Modal (E-Mail + Passwort), danach direkt weiter zur Buchung. Darunter „Noch kein Mitglied? Probetraining anfragen" (bestehendes Formular `formId`).

### 4.2 Mitgliederbereich (Block `member`, Seite `/mitglieder`)
- Login mit E-Mail + Passwort gegen `/api/member/login`.
- `?invite=TOKEN`: „Willkommen {name}, lege dein Passwort fest" → `/api/member/activate`.
- „Passwort vergessen?" → Hinweis „Melde dich beim Studio, du bekommst einen neuen Link." (Reset läuft über eine neue Einladung durch den Coach.)
- Dashboard mit Tabs:
  1. **Übersicht:**
     - Kennzahlen: Gewicht, Körperfett, Σ Hautfalten (jeweils mit Δ seit erster Messung), Trainings im aktuellen Monat.
     - Nächste 3 Buchungen.
     - Aktive Pläne als Karten.
     - Challenges-Platzierung wie bisher.
  2. **Pläne:**
     - Aktive Pläne. Je Plan die Tage, je Tag eine Tabelle wie der Papierbogen: Einheit · Übung · Sätze · WH · Tempo · Pause, dahinter die letzten Trainings als Spalten (Datum oben, je Satz „WH × kg"). Auf dem Handy horizontal scrollbar mit fixierter Übungsspalte.
     - Pro Übung eine Mini-Statistik: bestes Gewicht, geschätztes 1RM (Epley: kg × (1 + WH/30)) als Sparkline über die Trainings, Volumen der letzten Einheit.
     - „Abgeschlossene Pläne" eingeklappt darunter.
  3. **Messungen:**
     - Verlauf Gewicht, Körperfett und Σ Hautfalten (SVG-Linien).
     - Tabelle aller Messpunkte (Zeilen) × Messdaten (Spalten) mit Δ erste → letzte, grün bei Abnahme.
     - Umfänge analog.
  4. **Buchungen:** kommende Buchungen mit „Stornieren" (bei Serien: „Nur diesen" / „Ganze Serie"), Status Warteliste sichtbar, vergangene eingeklappt.
  5. **Konto:** Passwort ändern, Abmelden.
- Im Editor (`?edit=1`) wird statt echter Daten ein **eingebautes Demo-Objekt** gezeigt, keine API-Aufrufe.

### 4.3 Shop
- Neuer Block `shop`, Varianten `grid` (Raster) und `rows` (Liste kompakt). Props: `eyebrow`, `title`, `text`, `category` (optional Filter), `limit`.
- Produktkarte:
  - Bild oder gestalteter Platzhalter (Kategorie-Icon/Initialen im Bold-Stil).
  - Name, Einheit, Preis (de-DE, „34,90 €"), Badge.
  - Varianten-Select, Menge, Button „In den Warenkorb". Bei `soldOut` „Ausverkauft".
- Kategorie-Filterchips, wenn es mehrere Kategorien gibt.
- Warenkorb:
  - Schwebender Button (Anzahl) sobald nicht leer.
  - Drawer mit Positionen (Menge ±, entfernen), Summe.
  - Formular Name/E-Mail/Telefon/Notiz/Datenschutz, Hinweis `pickupNote`.
  - „Verbindlich bestellen" → `/api/order` → Bestätigung mit Bestellnummer.
- Warenkorb in `localStorage` (`mpt-cart`, in try/catch).
- Im Editor: „In den Warenkorb" deaktiviert.

## 5. Admin (`admin/`)

- `schema.js`:
  - Block `shop` (Bibliothek, Kategorie „Kontakt" oder neue Kategorie „Shop").
  - Collection `products` (Felder wie 2., `price` als Zahl, `variants` Textarea „eine pro Zeile").
  - Collection `members` **entfernen**.
  - Block `member`: Feld-Info „Kunden pflegst du im Bereich Kunden".
- Einstellungen: Abschnitte „Kursbuchung" (weeksAhead, maxSeries, cancelHours, recipients), „Shop" (recipients, pickupNote), „Messpunkte" (Listen der Hautfalten/Umfänge: Label + Key, hinzufügen/entfernen/sortieren).
- Neue Rail-Tabs:
  - **Kunden:** Der Arbeitsbereich ersetzt die Vorschau (Iframe ausblenden, `#workspace` zeigen). Links die Kundenliste mit Suche und „+ Neuer Kunde", rechts/mittig der Editor:
    - Stammdaten: Name, E-Mail, Telefon, aktiv, Notizen. Button „Einladungslink erstellen" → Link anzeigen + kopieren. Status „Passwort gesetzt / Einladung offen".
    - Pläne:
      - Liste aktiv/abgeschlossen. „+ Neuer Plan", „Duplizieren" (Kopie ohne Logs, als neuer aktiver Plan), „Abschließen"/„Reaktivieren", „Löschen".
      - Plan-Editor: Titel, Start, Ende, Ziel, Notiz; Tage (hinzufügen, umbenennen, löschen); Übungstabelle mit Einheit/Übung/Sätze/WH/Tempo/Pause/Notiz (Zeile hinzufügen, löschen, ↑↓).
    - Training eintragen: Tag + Datum wählen → Raster: je Übung so viele Satz-Zeilen wie `sets` mit WH- und kg-Eingabe, vorbelegt mit den Werten des letzten Trainings als Platzhalter. Liste der bisherigen Trainings (bearbeiten/löschen).
    - Messungen: Tabelle Datum, Gewicht, KF %, je Messpunkt mm, Umfänge cm, Notiz; hinzufügen/bearbeiten/löschen; Σ Hautfalten automatisch.
    - Speichern über `POST /api/admin/member` (Button „Speichern" + Hinweis „ungespeichert"). Das läuft **unabhängig** vom Entwurf/Veröffentlichen der Website.
  - **Buchungen:** Wochenansicht (Woche wählbar). Je Kurstermin Belegung „4/6" mit Teilnehmerliste, Warteliste und „Stornieren". „+ Teilnehmer" (Kunde wählen oder Gastname, optional Serie).
  - **Bestellungen:** Liste (neueste oben) mit Positionen, Summe und Kunde, Status-Buttons neu → bereit → abgeholt, stornieren. Zähler-Badge für neue Bestellungen in der Rail.

## 6. Migration & Demo-Daten (beim Serverstart)

- Fehlt `data/members.json`: aus `site.json.collections.members` übernehmen (Freitext-Plan → Plan mit Tagen/Übungen, `progress` → Messungen), danach `collections.members` aus site.json entfernen (`_rev` +1, Backup).
- Demo-Kunde (E-Mail `demo@mpt.de`) erhält die beiden Papierpläne „Till P. ①" und „Till P. ②" (Werte siehe unten), einen abgeschlossenen älteren Plan und 4 Messungen (Abstand je ca. 4 Wochen, sinkende Hautfalten).
- Demo-Passwort für `demo@mpt.de`: in README unter „Demo-Zugänge" dokumentieren.

### Papierplan „Till P. ①" (Einheit 1), Training am 25.09.2026
| Einheit | Übung | Sätze | WH | Tempo | Pause | 25.09. (WH × kg) |
|---|---|---|---|---|---|---|
| A1 | Klimmzug an Ringen | 4 | 1-3 | 4110 | 60 | 3×10 · 3×10 · 3×12,5 · 2×15 |
| A2 | LH Military Press | 4 | 6-8 | 4010 | 90 | 8×20 · 8×30 · 8×30 · 8×35 |
| B1 | KH Ausfallschritte vorne erhöht | 4 | 6-8 | 4010 | 60 | 8×0 · 8×5 · 8×10 |
| B2 | Rudern Seil zum Hals | 4 | 6-8 | 3012 | 90 | 8×32 · 8×32 · 8×36 · 8×36 |
| C1 | Wadenheben | 4 | 12-15 | 2020 | 60 | 13×40 · 12×50 · 11×60 |
| C2 | Überkopf-Trizepsstrecken | 4 | 12-15 | 2020 | 90 | 13×22,5 · 12×22,5 · 12×22,5 |

### Papierplan „Till P. ②" (Einheit 2), noch ohne Training
| Einheit | Übung | Sätze | WH | Tempo | Pause |
|---|---|---|---|---|---|
| A1 | KH Schrägbank neutral eng | 4 | 6-8 | 4010 | 60 |
| A2 | LH Wolverine Squat | 4 | 1-3 | 7610 | 90 |
| B1 | SZ Curls supiniert | 4 | 6-8 | 3020 | 60 |
| B2 | Rack Deadlift | 4 | 6-8 | 4010 | 90 |
| C1 | Glute Ham Raises | 4 | 6-8 | 30X0 | 60 |
| C2 | Iso Curls | 4 | 30s | – | 60 |
| C3 | Garhammer Raise | 4 | 12-15 | – | 90 |

Hinweis: Übungsnamen und Tempi sind von handschriftlichen Fotos abgelesen und müssen mit MPT gegengeprüft werden („LH Wolverine Squat", Tempo „7610").

### Demo-Produkte (Preise sind Platzhalter)
| Produkt | Kategorie | Einheit | Preis | Varianten |
|---|---|---|---|---|
| MPT Whey Protein | Protein | 1 kg | 34,90 € | Schoko, Vanille, Erdbeere |
| MPT Vegan Protein | Protein | 1 kg | 36,90 € | Schoko, Neutral |
| Magnesium Bisglycinat | Supplements | 120 Kapseln | 19,90 € | – |
| Kreatin Monohydrat | Supplements | 500 g | 24,90 € | – |
| Omega-3 | Supplements | 120 Kapseln | 22,90 € | – |
| Blackroll Standard | Equipment | 45 cm | 32,90 € | Schwarz, Orange |
| Blackroll Duoball | Equipment | 12 cm | 17,90 € | – |
| MPT Shaker | Equipment | 700 ml | 9,90 € | – |

## 7. Sicherheit
- Alle neuen Dateien unter `data/`, die bestehende `BLOCKED`-Regel greift.
- Kunden-Sessions getrennt von Admin-Sessions. Ein Kunden-Cookie öffnet nie `/api/admin/*`, `/admin`, `/api/site` POST.
- Passwörter: PBKDF2 wie beim Admin. Einladungs-Token: `secrets.token_urlsafe(24)`, 7 Tage gültig, einmalig.
- Ausgaben im Frontend immer über `esc()`. Keine Personendaten in URLs außer dem Einladungs-Token.
- Schreibzugriffe auf JSON-Dateien über einen Lock (`threading.Lock`), weil der Server mehrere Threads hat.
