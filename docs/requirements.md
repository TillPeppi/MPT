# MPT – Requirements Website & App

Stand 23.11.2026. Quelle: Notizen aus dem Gespräch mit MPT. Entwurfsnummern beziehen sich auf `designs/app-entwuerfe.html` (1 = Bold Athletic, 2 = Light Studio, 3 = Performance Lab).

Prioritäten: **P1** = erster Release, **P2** = kurz danach, **P3** = später/Idee.

---

## Teil A – Requirements

### 1. Website (öffentlich)

| ID | Anforderung | Prio |
|---|---|---|
| W-1 | Preise: Für Neukunden genau **zwei Einstiegsangebote** zeigen, sonst keine Mitgliedschaftspreise:<br>• 3 Monate Testphase Kleingruppe, **125 € / Monat**<br>• 3 Monate Testphase **Personal Training 1:1, ab 240 € / Monat**<br>Unter beiden steht, was enthalten ist („Was bekommst du?"). Inhalte vorerst als Platzhalter gewählt, von MPT zu bestätigen. | P1 |
| W-2 | Hintergrund etwas heller **bzw.** Light- und Dark-Mode (Umschalter, Standard nach Systemeinstellung). | P1 |
| W-3 | Shop nur im angemeldeten Bereich. Legt ein Gast etwas in den Warenkorb, kommt die Aufforderung zum Login bzw. zur Zugangsanfrage. | P1 |
| W-4 | Shop = **Anfrage**, keine Online-Zahlung (Bezahlung/Abholung im Studio). Produktpreise sichtbar (Website im Login-Bereich + App). | P1 |
| W-5 | Blog „Ernährung" (Tipps, Wissen) als Blog-Einträge. | P2 |
| W-6 | Analysetool für Admin (siehe B-6). | P2 |

### 2. App – Navigation & Home

| ID | Anforderung | Prio |
|---|---|---|
| N-1 | Tabbar: **Home · Statistik · Buchen · Mehr**. Aktiver Tab orange. | P1 |
| N-2 | Oben rechts: **Glocke** (Neuigkeiten) neben **Profil**. Glocke enthält MPT-News und private Push-Nachrichten. | P1 |
| N-3 | Home zeigt: letzte News (mit „Alle anzeigen"), letzten **MPT Score**, letzte Trainingseinheiten bzw. letzte Buchungen, Kachel „Meine Supps". | P1 |
| N-4 | Unter „Mehr": alle News, Supplements, Shop, Umfragen, Profil usw. | P1 |
| N-5 | Mitgliederprofil mit Details. | P1 |

### 3. Buchung (Design: eher Entwurf 2)

| ID | Anforderung | Prio |
|---|---|---|
| B-1 | Buchungsarten: **Kleingruppentraining** (feste Slots), **Personal Training** und **Check-up-Termin**. | P1 |
| B-2 | PT und Check-up: Kunde schlägt Uhrzeit vor → Admin bestätigt oder schlägt andere Uhrzeit vor (→ Kunde bestätigt). | P1 |
| B-3 | Einzel- und **Serienbuchung**. | P1 (existiert) |
| B-4 | Buchung **für mehrere Personen**. | P2 |
| B-5 | **Automatische Warteliste**: Ist der Slot voll, landet man auf der Warteliste. Nachrücken automatisch bei Absage oder wenn der Admin Plätze freigibt. | P1 (teilweise vorhanden) |
| B-6 | Admin-Analyse: an welchen Tagen/zu welchen Zeiten ist es voll (Auslastung, Heatmap). | P2 |
| B-7 | Buchungen auf Teilnehmer beschränken (z. B. Kurs nur für bestimmte Mitglieder/Tarife). | P1 |
| B-8 | Inaktivitäts-Tracker: Admin sieht, wer länger nicht da war; Kunde bekommt Hinweis/Erinnerung. | P2 |

### 4. Training & Messungen

| ID | Anforderung | Prio |
|---|---|---|
| T-1 | Übungen tracken **nur der Admin** (vorerst). Kunden sehen alles, können nichts eintragen. | P1 (existiert) |
| T-2 | Übungsparameter: Wiederholungen, Gewicht, Zeit (z. B. Planks), Distanz (m), Kalorien. | P1 |
| T-3 | Körperparameter: Gewicht, Lean Mass, Körperfettanteil, Hautfaltensumme. | P1 |
| T-4 | Kundenstammdaten im Admin wie bisher auf Website/App. | P1 |
| T-5 | **AI-Foto-Scan** des Papierplans nach Planende → Werte werden übernommen; Vergleich aktueller Plan vs. vorherige Ergebnisse. | P2 |
| T-6 | Statistik-Tab im Design von **Entwurf 1**. | P1 |

### 5. Check-up (macht MPT im Termin)

| ID | Anforderung | Prio |
|---|---|---|
| C-1 | Check-up besteht aus: Messung, Planübersicht, Gelenk-Screen, Notizblock (nur Admin). | P1 |
| C-2 | Screen „Überkopfkniebeuge" mit Checkbox auffällig/unauffällig + Notiz je Punkt:<br>• Fußgelenk – 3 Punkte<br>• Hüfte – 3 Punkte<br>• Schulter – 3 Punkte<br>• Symmetrie – 1 Punkt | P1 |
| C-3 | Push „Messung steht an" vor fälligem Check-up. | P1 |

### 6. Wochenrecap & MPT Performance Score (Button-Design: Entwurf 1)

| ID | Anforderung | Prio |
|---|---|---|
| R-1 | Wöchentliche Umfrage:<br>• Schlaf: 3 Ja/Nein-Fragen (für Check-up) + Skala 1–10<br>• Energielevel 1–10<br>• Zufriedenheit Essverhalten 1–10<br>• Skala **ohne 7** (zwingt zur Entscheidung)<br>• Freitext-Notiz | P1 |
| R-2 | **MPT Performance Score** pro Woche aus allen Werten: Training (inkl. „Wie gut fandest du das Training?"), Schlaf, Ernährung, Energie. Letzter Score auf Home. | P1 |

### 7. Benachrichtigungen

| ID | Anforderung | Prio |
|---|---|---|
| P-1 | Push: Messung steht an, Trainingserinnerung, Streak/Gamification, Studio-News, Supplement bald leer. | P1 |
| P-2 | Studio-News; WhatsApp-Kanal anschauen (ggf. verlinken statt doppelt pflegen). | P1 |

### 8. Gamification

| ID | Anforderung | Prio |
|---|---|---|
| G-1 | Punkte: Streak-Punkte bis zu 3× pro Woche, Meilensteine (z. B. 50. Einheit), Challenges. | P2 |
| G-2 | Badges. | P2 |
| G-3 | Challenges mit Bestenliste/Ranking. | P2 |

### 9. Supplements

| ID | Anforderung | Prio |
|---|---|---|
| S-1 | Supplement-Seite + Home-Kachel „Meine Supps": wer bekommt welche Supps. | P2 |
| S-2 | Push an Kunde, wenn bald leer; Erinnerung auch an Admin. | P2 |
| S-3 | Zukunft: Supplement-Protokoll im Check-up (Bewegungsanalyse → Messung → einfache Fragen zu Schlafqualität, Energie, Frühstück → Empfehlung **ohne Mengenangabe**), evtl. auch im Termin-Recap. | P3 |

### 10. Shop & Umfragen

| ID | Anforderung | Prio |
|---|---|---|
| SH-1 | Shop in App und Website: Produkt anfragen statt bezahlen (siehe W-3/W-4). | P1 |
| U-1 | Mitgliederumfragen (Trainingszeiten, Lust auf Neues …). Pflicht zum Ausfüllen; danach als erledigte Kachel unten bzw. ausgeblendet, **nicht mehr änderbar**. | P2 |

### 11. Später

- Video-Bibliothek: Übungen in ≤ 1 Minute technisch erklärt (P3)

### 12. Rahmenbedingungen

- Aktuelle Live-Website auf **Wix**, Domain bei **Dynadot**.
- Körperdaten, Gelenk-Screen, Schlaf und Supplements sind **Gesundheitsdaten** (Art. 9 DSGVO): Hosting in der EU, AV-Verträge, Einwilligung, Zugriff nur Admin + betroffener Kunde.

### 13. Offene Fragen an MPT

1. „Sonst keine Preise": Gilt das nur für Mitgliedschaften? Produktpreise sollen ja sichtbar sein (W-4).
2. Stimmen die Platzhalter unter „Was bekommst du?" (Check-up zum Start, Trainingsplan, max. 6 Personen bzw. 1:1, App-Buchung, Recap & Score bzw. Ernährungs-/Supplement-Tipps, Re-Check nach 3 Monaten)?
3. „Buchungen beschränken auf Teilnehmer": nach Tarif, Gruppe oder pro Person?
4. Buchung für mehrere Personen: Müssen die anderen Personen Mitglieder sein?
5. Gewichtung im MPT Score: alles gleich oder Training stärker?
6. Wie viele Tage vor Fälligkeit „Messung steht an"? Wie oft Trainingserinnerungen?
7. App-Tab „Statistik": nur Kundenwerte oder auch Ranking?
8. Golf-Simulator-Preise (45 € / 5er- und 10er-Karte) bleiben sichtbar, da keine Mitgliedschaft. Passt das?

---

## Teil B – Umbau des Frontends nach Next.js

Entscheidung 23.11.2026: Der Prototyp (`index.html`, `site/`, `admin/`, `server.py`) wird nicht weiterentwickelt. Website, Kundenbereich und Admin werden in **Next.js** (`web/`) neu gebaut. Bis das Go-Backend steht, liefert eine **Mock-API in Next.js** die Daten (Route-Handler mit JSON-Dateien, gleiche Endpunkte wie die spätere Go-API). Danach wird nur die API-Adresse umgestellt.

**Drag & Drop im Admin entfällt.** Das Layout der Seiten ist fest im Code. Im Admin werden nur noch Daten gepflegt: Texte, Bilder, Preise, Listen-Einträge.

| Etappe | Inhalt |
|---|---|
| 1 – Website | Alle öffentlichen Seiten portieren; Preise nur Testphasen-Angebote (W-1); Light/Dark-Mode (W-2); Shop: Gäste sehen Produkte ohne Preise, Anfrage nur mit Login (W-3/W-4); „Anfrage" statt „Bestellung" |
| 2 – Kundenbereich & Buchung | Login, Dashboard, Pläne/Messungen (inkl. Lean Mass, KFA, Hautfalten; Übungen mit Zeit/Distanz/kcal), Kursbuchung mit Serie und Warteliste, Shop-Anfrage |
| 3 – Admin | Formulare zum Bearbeiten der Inhalte und Kundendaten (Teil D), ohne Layout-Editor |

Danach: Go-Backend (Teil C), dann App (Expo).

---|---|---|
| 1 | Preisbereich umbauen: nur die zwei Testphasen-Angebote (125 € / ab 240 €) mit „Was bekommst du?"-Liste; übrige Preise auf „Auf Anfrage"/ausblenden | `data/site.json` (Preiskarten), `site/app.js` |
| 2 | Light/Dark-Mode: zweites Token-Set in `:root`, Umschalter im Header, Dark-Hintergrund etwas aufhellen | `site/styles.css`, `site/app.js` |
| 3 | Shop hinter Login: Produktliste/Preise nur eingeloggt, „In den Warenkorb" als Gast → Login/Zugang anfragen | `site/app.js`, `server.py` (`/api/order` nur mit Kunden-Session) |
| 4 | Bestellung als „Anfrage" benennen (Texte, Mail, Admin) | `site/app.js`, `admin/` |
| 5 | Messwerte erweitern: Lean Mass, KFA, Hautfaltensumme; Übungsparameter Zeit/Distanz/kcal | `admin/schema.js`, `admin/admin.js`, Spec 1.2/1.3 |
| 6 | Demo-API und Seed nachziehen | `site/demo-api.js`, `tools/build_demo.py` |

### Nicht mehr im Prototyp, sondern im neuen Stack

PT-/Check-up-Terminvorschläge, Gelenk-Screen, Wochenrecap & Score, Push, Gamification, Supplements, AI-Foto-Scan, Auslastungsanalyse, Inaktivitäts-Tracker, Umfragen, Buchung für mehrere Personen.

---

## Teil C – Zielarchitektur, Hosting & Kosten

### C.1 Entscheidungen

| Baustein | Entscheidung | Status |
|---|---|---|
| Backend | **Go** (chi oder Gin), REST-API mit OpenAPI-Spezifikation | entschieden |
| Datenbank | **PostgreSQL** (ersetzt die JSON-Dateien) | entschieden |
| Website + Admin + Kundenbereich (Web) | **Next.js** (öffentliche Seiten statisch/ISR für SEO) | entschieden |
| App (iOS + Android) | **Expo** (React Native) | Empfehlung |
| API-Client | Aus OpenAPI generierte TypeScript-Typen, geteilt zwischen Next.js und App | Empfehlung |
| Push | Expo Push (leitet an APNs/FCM weiter), Versand-Jobs als Cron im Go-Backend | Empfehlung |
| Dateien (Fotos, Plan-Scans) | S3-kompatibler Object Storage in der EU | Empfehlung |
| AI-Foto-Scan | Vision-LLM über API; Ergebnis muss der Admin bestätigen, bevor es gespeichert wird | Empfehlung |
| Mails | EU-Anbieter für Transaktionsmails (z. B. Brevo) | Empfehlung |

Ist-Zustand zum Vergleich: statisches HTML/JS + `server.py` (Python-Standardbibliothek) mit JSON-Dateien, Demo auf GitHub Pages, Live-Seite auf Wix.

### C.2 Warum Expo statt React Native ohne Framework

Expo ist ein Framework auf React Native, geschrieben wird in beiden Fällen dasselbe React Native. Der Unterschied ist das Drumherum:

| | Expo | React Native ohne Expo |
|---|---|---|
| Native Projekte (Xcode/Android Studio) | Werden erzeugt, kaum Pflege | Selbst pflegen |
| Builds & Store-Upload | EAS Build/Submit in der Cloud | Selbst über Xcode/Gradle |
| Push | `expo-notifications` + Expo Push | APNs/FCM selbst anbinden |
| Updates ohne Store-Review | OTA über EAS Update | Selbst lösen |
| Eigener nativer Code | Über Config-Plugins / Dev-Builds | Volle Freiheit |

Eine reine Web-App (PWA) scheidet aus: kein App-Store-Eintrag, und Push auf dem iPhone geht nur, wenn die Seite auf dem Home-Bildschirm installiert ist.

### C.3 OTA-Updates (EAS Update)

- Kostenlos im Free-Tarif bis ca. **1.000 monatlich aktive Nutzer**. Für die Mitgliederzahl von MPT reicht das. Darüber ab ca. 19 $/Monat (Starter). Vor dem Start auf expo.dev/pricing prüfen.
- OTA ändert nur den JavaScript-Teil (Texte, Layout, Logik, Bilder). Neue native Funktionen (z. B. Kamera, neue Berechtigungen) brauchen einen Store-Build.

### C.4 Hosting

Alle Daten in der **EU**, weil Körperwerte, Gelenk-Screen, Schlaf und Supplements Gesundheitsdaten nach Art. 9 DSGVO sind.

**Entscheidung: Selbsthosting auf Hetzner Cloud** (Nürnberg/Falkenstein) mit **Coolify**. Auf einem Server laufen Go-API, Next.js und Postgres als Container. Coolify baut bei jedem Git-Push neu und stellt die HTTPS-Zertifikate aus. Dazu Hetzner Object Storage und tägliche Backups. Domain bleibt bei Dynadot (nur DNS umstellen), Wix wird gekündigt.

Alternative für Next.js: **Vercel**.

| | Hetzner (selbst) | Vercel |
|---|---|---|
| Kosten | 0 € extra (Server läuft ohnehin) | Pro-Tarif ca. 20 $/Monat pro Person, die deployt. Hobby ist für kommerzielle Projekte nicht erlaubt |
| Betrieb | Server-Updates und Monitoring selbst (mit Coolify überschaubar) | Kein Serverbetrieb fürs Frontend |
| Vorschau | Möglich, aber Aufwand | Automatisch eine Vorschau-URL pro Pull Request |
| Datenschutz | Ein deutscher Anbieter, ein AV-Vertrag | Zusätzlicher US-Anbieter. Vertretbar, weil Gesundheitsdaten nur im Go-Backend liegen |
| Ausfall | Server weg = Website und App weg | Website bleibt erreichbar, Daten trotzdem weg |

Begründung: MPT hat wenig Traffic, das CDN von Vercel bringt kaum etwas. Hetzner spart ca. 240 $/Jahr und hält alles bei einem Anbieter. Vercel erst, wenn Vorschau-Links pro PR gebraucht werden oder niemand den Server betreuen soll.

### C.5 Laufende Kosten (Richtwerte, vor Abschluss prüfen)

| Posten | ca. Kosten |
|---|---|
| Hetzner Cloud Server (4 vCPU / 8 GB): Go-API + Next.js + Postgres | 10–15 €/Monat |
| Server-Backups | 2–3 €/Monat |
| Hetzner Object Storage | ~5 €/Monat |
| Domain (Dynadot) | ~10–15 €/Jahr |
| Transaktionsmails (Free-Tier) | 0 € |
| Expo Push, EAS Build und EAS Update (Free-Tier) | 0 € |
| Apple Developer Program | 99 $/Jahr |
| Google Play Konto | 25 $ einmalig |
| AI-Foto-Scan (wenige Cent pro Scan) | < 5 €/Monat |
| **Summe laufend** | **~25–35 €/Monat** |

Wix fällt weg (je nach Tarif ca. 15–35 €/Monat), unterm Strich also ungefähr gleich teuer wie heute. Optional: Vercel Pro (+20 $/Monat), EAS Starter (+19 $/Monat).

---

## Teil D – Admin-Requirements

Was der Admin (MPT-Team) einstellen, eintragen und freigeben kann, je Seite in Website und App. „existiert" = im Prototyp (`admin/`) schon vorhanden und wird übernommen.

### D.0 Grundsätze

| ID | Anforderung | Prio |
|---|---|---|
| AD-0.1 | Ein Admin für Website **und** App (Next.js, im Browser, auch auf dem Tablet bedienbar). | P1 |
| AD-0.2 | Zwei Rollen: **Admin** (alles, mehrere Admin-Konten möglich) und **Kunde** (nur eigene Daten sehen, buchen, Recap ausfüllen, anfragen). Gesundheitsdaten sehen nur Admins und der betroffene Kunde. | P1 |
| AD-0.3 | Änderungsprotokoll: wer hat wann was an Kundendaten geändert. | P2 |
| AD-0.4 | Alle Texte, Bilder und Preise, die Kunden sehen, sind im Admin pflegbar, nichts fest im Code. | P1 |

### D.1 Globale Einstellungen

| ID | Einstellbar | Prio |
|---|---|---|
| AD-1.1 | Studio-Stammdaten: Name, Adresse, Telefon, E-Mail, Social-Links, WhatsApp-Kanal-Link (existiert) | P1 |
| AD-1.2 | Öffnungszeiten + Ausnahmen/Schließtage (existiert) | P1 |
| AD-1.3 | Design: Akzentfarbe, Logo, Standard-Theme Light/Dark | P1 |
| AD-1.4 | SEO-Grunddaten: Titel, Beschreibung, Vorschaubild (existiert) | P1 |
| AD-1.5 | Mail-Empfänger je Formular/Anfrageart (existiert) | P1 |
| AD-1.6 | Rechtstexte: Impressum, Datenschutz, AGB | P1 |
| AD-1.7 | Weitere Admin-Konten anlegen, deaktivieren, Passwort zurücksetzen | P1 |

### D.2 Website

Das Layout jeder Seite ist fest (kein Drag & Drop, keine neuen Seiten oder Blöcke per Admin). Der Admin bearbeitet je Abschnitt nur die Daten: Texte, Bilder, Buttons, Listen-Einträge, und kann einen Abschnitt aus-/einblenden. Je Seite:

| Seite | Admin kann | Prio |
|---|---|---|
| **Home** | Hero, Vorteile, Angebote, Teaser zu Kursen/Blog/Shop pflegen (existiert) | P1 |
| **Preise / Angebote** | Die zwei Einstiegsangebote pflegen: Name, Preis, „ab"-Kennzeichen, Laufzeit (3 Monate), Liste „Was bekommst du?", Button-Ziel. Weitere Angebote anlegen, aber ausblenden. | P1 |
| **Training / Kurse** | Kurskalender (siehe D.4); Texte zu Kleingruppe, PT, Check-up | P1 |
| **Team** | Trainer: Foto, Name, Rolle, Bio, Tags (existiert) | P1 |
| **Golf** | Events, Ligen, Challenges (existiert) | P2 |
| **Firmen** | Texte, Anfrageformular (existiert) | P2 |
| **Blog / Ernährung** | Beiträge: Titel, Slug, Titelbild, Kurztext, Inhalt, Tags (z. B. „Ernährung"), Lesezeit, SEO-Titel/-Beschreibung, Veröffentlichungsdatum, Entwurf/Veröffentlicht. Erscheint auch in der App. | P2 |
| **Shop** (nur eingeloggt) | Produkte siehe D.9; Text für Gäste („Bitte einloggen / Zugang anfragen") | P1 |
| **Mitgliederbereich (Web)** | Begrüßungstext; welche Kacheln sichtbar sind (gleiche wie App-Home) | P2 |
| **Kontakt / Formulare** | Formularfelder an/aus, Betreff-Auswahl, Empfänger (existiert) | P1 |
| **Bewertungen, Erfolgsgeschichten, Instagram** | Einträge pflegen (existiert) | P2 |

### D.3 App

| Seite | Admin kann | Prio |
|---|---|---|
| **Home** | Reihenfolge und Sichtbarkeit der Kacheln festlegen (News, MPT Score, letzte Einheiten/Buchungen, Meine Supps, Wochenrecap-Button, Challenge); Begrüßungstext | P2 |
| **News / Glocke** | News anlegen: Titel, Text, Bild, Link, Veröffentlichungszeitpunkt (sofort oder geplant), Zielgruppe (alle, Gruppe, einzelne Mitglieder), „zusätzlich als Push senden" an/aus | P1 |
| **Statistik** | Welche Kennzahlen Kunden sehen (Körperwerte, Übungen, Score-Verlauf); Ranking an/aus | P2 |
| **Buchen** | Siehe D.4; Hinweistexte (Stornoregeln, Warteliste) | P1 |
| **Wochenrecap** | Siehe D.6 | P1 |
| **Supplements** | Siehe D.7 | P2 |
| **Shop** | Gleiche Produkte wie Website (D.9) | P1 |
| **Umfragen** | Siehe D.8 | P2 |
| **Challenges / Punkte / Badges** | Siehe D.10 | P2 |
| **Mehr** | Menüpunkte ein-/ausblenden und sortieren; externe Links (WhatsApp-Kanal, Instagram) | P2 |
| **Profil** | Welche Felder Kunden selbst ändern dürfen (z. B. Telefon, Foto, Push-Einstellungen) und welche nur der Admin | P1 |
| **Push-Vorlagen** | Texte und Zeitpunkte der automatischen Pushes: Messung fällig (X Tage vorher), Trainingserinnerung, Streak, Supps bald leer, Inaktivität, Warteliste nachgerückt, Terminvorschlag beantwortet | P1 |
| **App-Version** | Mindestversion festlegen (ältere Apps werden zum Update aufgefordert) | P2 |

### D.4 Buchung & Kalender

| ID | Einstellbar / eintragbar | Prio |
|---|---|---|
| AD-4.1 | **Kleingruppe**: Slots pro Wochentag, Uhrzeit, Dauer (Standard 1 h), Trainer, Kategorie, max. Plätze (existiert) | P1 |
| AD-4.2 | **Teilnehmer-Beschränkung** pro Slot: offen für alle, nur bestimmte Tarife/Gruppen, nur ausgewählte Mitglieder | P1 |
| AD-4.3 | Plätze kurzfristig erhöhen/sperren („Plätze freigeben") → Warteliste rückt automatisch nach | P1 |
| AD-4.4 | Regeln: Stornofrist (Stunden), max. Serienlänge, Buchungsfenster (wie weit im Voraus), max. offene Buchungen pro Mitglied, Buchung für mehrere Personen an/aus und max. Personenzahl (teilweise existiert) | P1 |
| AD-4.5 | Warteliste: automatisch nachrücken an/aus, Frist zum Bestätigen nach Nachrücken | P1 |
| AD-4.6 | **PT & Check-up**: verfügbare Zeitfenster je Trainer, Dauer je Terminart, Puffer zwischen Terminen | P1 |
| AD-4.7 | Terminanfragen bearbeiten: bestätigen, ablehnen oder Gegenvorschlag mit neuer Uhrzeit | P1 |
| AD-4.8 | Buchung im Namen eines Kunden anlegen, verschieben, stornieren (auch nach Stornofrist) | P1 |
| AD-4.9 | Schließtage/Ferien → betroffene Buchungen automatisch absagen + Push | P2 |
| AD-4.10 | Anwesenheit abhaken (war da / nicht erschienen) → zählt für Streak, Punkte, Inaktivität | P1 |

### D.5 Kunden (Mitgliederverwaltung)

| ID | Einstellbar / eintragbar | Prio |
|---|---|---|
| AD-5.1 | Stammdaten: Name, E-Mail, Telefon, Geburtsdatum, Foto, Ziel, aktiv/inaktiv (existiert teilweise) | P1 |
| AD-5.2 | Tarif/Vertrag: Kleingruppe, PT, Testphase mit Start-/Enddatum, Gruppenzugehörigkeit (für Buchungsbeschränkung) | P1 |
| AD-5.3 | Einladung zur App/Website senden, Zugang sperren, Passwort-Reset auslösen (existiert) | P1 |
| AD-5.4 | **Trainingspläne**: Plan anlegen (Titel, Start, Ende, Ziel, Einheiten mit Übungen: Gruppe A1/A2, Sätze, Wdh, Tempo, Pause, Notiz), Plan abschließen (existiert) | P1 |
| AD-5.5 | **Trainingslogs** je Einheit und Satz: Wdh, Gewicht, Zeit, Distanz (m), Kalorien | P1 |
| AD-5.6 | **AI-Foto-Scan**: Foto des Papierplans hochladen → erkannte Werte als Vorschlag, Admin korrigiert und bestätigt → Vergleich mit vorherigem Plan | P2 |
| AD-5.7 | **Messungen**: Datum, Gewicht, Lean Mass, Körperfettanteil, Hautfaltensumme (+ bestehende Werte), nächste Messung fällig am | P1 |
| AD-5.8 | **Check-up** (siehe D.5a) | P1 |
| AD-5.9 | **Interne Notizen** (Notizblock), für Kunden unsichtbar | P1 |
| AD-5.10 | Übersicht pro Kunde: letzte Buchungen, Anwesenheit, Wochenrecaps, Score-Verlauf, Supps, Punkte | P1 |
| AD-5.11 | Inaktivitäts-Liste: Kunden ohne Training seit X Tagen (X einstellbar), mit Aktion „Erinnerung senden" | P2 |
| AD-5.12 | Kunde löschen / Daten exportieren (DSGVO-Auskunft) | P1 |

#### D.5a Check-up-Formular

| ID | Eintragbar | Prio |
|---|---|---|
| AD-5a.1 | Messung (wie AD-5.7) direkt im Check-up | P1 |
| AD-5a.2 | Planübersicht: aktueller Plan + Ergebnisse zum Vorplan | P1 |
| AD-5a.3 | Screen Überkopfkniebeuge: je Punkt Checkbox „auffällig" + Notiz. Fußgelenk 3, Hüfte 3, Schulter 3, Symmetrie 1 | P1 |
| AD-5a.4 | Die Screen-Punkte (Bezeichnungen, Anzahl) sind im Admin konfigurierbar | P2 |
| AD-5a.5 | Antworten aus den Wochenrecaps seit dem letzten Check-up (Schlaf-Ja/Nein-Fragen) werden angezeigt | P1 |
| AD-5a.6 | Später: Supplement-Protokoll mit Empfehlung ohne Menge (S-3) | P3 |

### D.6 Wochenrecap & MPT Score

| ID | Einstellbar | Prio |
|---|---|---|
| AD-6.1 | Fragen pflegen: Text, Typ (Ja/Nein, Skala 1–10 ohne 7, Freitext), Reihenfolge, Pflicht/optional | P1 |
| AD-6.2 | Zeitpunkt: an welchem Wochentag/ab welcher Uhrzeit der Recap freigeschaltet wird, Erinnerungs-Push | P1 |
| AD-6.3 | Gewichtung der Score-Bestandteile (Training, Selbsteinschätzung Training, Schlaf, Ernährung, Energie) | P1 |
| AD-6.4 | Antworten aller Kunden einsehen, filtern, auffällige Werte markieren | P1 |

### D.7 Supplements

| ID | Einstellbar / eintragbar | Prio |
|---|---|---|
| AD-7.1 | Supplement-Katalog: Name, Bild, Beschreibung, Packungsgröße, Verbrauch pro Tag (für „bald leer") | P2 |
| AD-7.2 | Zuordnung Kunde ↔ Supplement mit Startdatum (= Packung ausgegeben) | P2 |
| AD-7.3 | „Bald leer" X Tage vorher: Push an Kunde und Erinnerung im Admin | P2 |
| AD-7.4 | Verknüpfung zum Shop-Produkt (direkt nachbestellen/anfragen) | P2 |

### D.8 Mitgliederumfragen

| ID | Einstellbar | Prio |
|---|---|---|
| AD-8.1 | Umfrage anlegen: Titel, Fragen (Auswahl, Mehrfachauswahl, Skala, Freitext), Zielgruppe, Zeitraum | P2 |
| AD-8.2 | Pflicht-Umfrage an/aus. Nach Absenden nicht mehr änderbar, Kachel wandert nach unten bzw. verschwindet | P2 |
| AD-8.3 | Auswertung: Ergebnisse als Diagramm, Export als CSV | P2 |

### D.9 Shop & Anfragen

| ID | Einstellbar / eintragbar | Prio |
|---|---|---|
| AD-9.1 | Produkte: Name, Kategorie, Preis, Einheit, Bild, Beschreibung, Varianten, Badge, aktiv, ausverkauft (existiert) | P1 |
| AD-9.2 | Sichtbarkeit: nur eingeloggt (Standard) | P1 |
| AD-9.3 | Anfragen-Liste: Status (neu, bestätigt, abholbereit, abgeholt, abgelehnt), Notiz, Kunde benachrichtigen (existiert teilweise) | P1 |

### D.10 Gamification

| ID | Einstellbar | Prio |
|---|---|---|
| AD-10.1 | Punkte-Regeln: Punkte pro Einheit, max. 3 gewertete Einheiten pro Woche, Bonus für Meilensteine (z. B. 50. Einheit), Punkte für Wochenrecap | P2 |
| AD-10.2 | Badges: Name, Icon, Bedingung (z. B. 10 Wochen Streak) | P2 |
| AD-10.3 | Challenges: Titel, Zeitraum, Messgröße, Einheit, Sortierung, Ergebnisse eintragen, Bestenliste öffentlich/nur App (existiert für Golf) | P2 |
| AD-10.4 | Punkte manuell gutschreiben/abziehen mit Begründung | P2 |

### D.11 Analyse (Dashboard)

| ID | Anzeige | Prio |
|---|---|---|
| AD-11.1 | Auslastung: Heatmap Wochentag × Uhrzeit, volle Slots, Wartelisten-Länge | P2 |
| AD-11.2 | Mitglieder: aktiv, neu, Testphasen (laufend/endend), inaktiv | P2 |
| AD-11.3 | Durchschnitt MPT Score und Recap-Quote pro Woche | P2 |
| AD-11.4 | Website: Seitenaufrufe, Anfragen (datensparsam, ohne Cookie-Banner-Pflicht, z. B. selbst gehostetes Plausible/Umami) | P2 |
| AD-11.5 | Zeitraum wählbar, Export als CSV | P2 |
