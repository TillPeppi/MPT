# MPT Kunden-App (Expo)

Native Kunden-App für Metsch Personal Training. Umsetzung der Klickdemo
`designs/app-demo.html` mit den gewählten Varianten:

- **Home** „4 · Studio" mit Foto-Hero (nächstes Training mit Details/Absagen bzw. „Training buchen"),
  darunter Score · Streak · Punkte, Umfragen, Monats-Challenge, Supplements, „Noch offen", Studio News
- **Wochenrecap ist Pflicht**: solange offen, kommt er vor Home als Vollbild ohne Tabbar und ohne Zurück
- **Mehr** Variante D: Level-Hero, „Für dich" 2×2, gruppierte Listen „Alles" und „Konto"
- Buchen, Statistik und alle übrigen Screens der Demo

Admin-Funktionen (Analyse, Übungen eintragen, AI-Plan-Scan) gehören nicht in diese App.

## Starten

Voraussetzungen: Node **22.13+ oder 24** (Expo SDK 58 / React Native 0.88 laufen nicht mit Node 20),
Xcode mit iOS-Simulator.

```bash
cd app
npm install
npx expo run:ios        # baut den Dev-Client und startet ihn im Simulator
```

Danach reicht `npx expo start` und im Simulator „i". Expo Go reicht nicht, weil die App native
Module nutzt (Reanimated, Gesture Handler, Blur …), es braucht den Development Build.

Login: `lena.meyer@demo.mpt`, Passwort egal. Demo-Datum ist Mittwoch, 25.11.2026.

Prüfen:

```bash
npx tsc --noEmit
npx expo lint
```

`.npmrc` setzt `legacy-peer-deps`, weil expo-router für Web `react-dom@19.3.1` als Peer zieht,
während React Native 0.88 `react@19.3.0` festlegt. Für iOS/Android spielt das keine Rolle.

## Aufbau

```
src/
  app/                    Routen (expo-router)
    _layout.tsx           Fonts, Theme, Sheets, Toast/Push; Login → Pflicht-Recap → App (Stack.Protected)
    login.tsx             Login mit Demo-User
    gate.tsx              Pflicht-Wochenrecap + Ergebnis
    (app)/(tabs)/         Home (index), Statistik, Buchen, Mehr – eigene Tabbar mit Blur
    (app)/*.tsx           Stack-Screens: Termine, Neuigkeiten, Profil, Supps, Shop, Belohnungen,
                          Challenges, Ernährung, Artikel, News, Umfragen, Umfrage, Videos, Übung, Recap
  components/             Screen-Gerüst (großer Titel → Blur-Leiste), Tabbar, Tap (Drück-Skalierung),
                          UI-Bausteine, SVG-Diagramme (Ring, Linie), Overlays (Toast, Push-Banner)
  features/               Bottom-Sheets, Wochenrecap-Ablauf, gemeinsame Zeilen
  services/               Service-Schicht: api.ts (Interface), mock.ts (Demo-Daten), index.ts (Auswahl)
  store/                  zustand: app.ts (persistiert in AsyncStorage), ui.ts (flüchtig)
  data/                   Typen, Demo-Daten (COURSES, PRODUCTS, BODY … SEED), Bildzuordnung
  lib/                    Datum/Zahlen (Demo-Datum), abgeleitete Werte (openUnits, slotsFor …), Navigation
  theme/                  Tokens aus .screen / .screen[data-theme=light], useTheme()
```

### Daten und Backend

Die App spricht nur über das Interface `MptApi` (`src/services/api.ts`). Heute steckt dahinter
`mockApi` mit den Demo-Daten. Ein echtes Backend wird als zweite Implementierung ergänzt
(z. B. `services/http.ts`) und in `services/index.ts` ausgewählt. Passende Endpunkte gibt es in
`server.py` schon:

| MptApi                         | server.py                                  |
| ------------------------------ | ------------------------------------------ |
| `login`, `logout`              | `POST /api/member/login`, `/logout`        |
| `getSlotCounts(from, days)`    | `GET /api/slots?from=&days=`               |
| `bookCourse` (auch Serien)     | `POST /api/member/book {courseId,date,weeks}` |
| `cancel`, `cancelSeries`       | `POST /api/member/cancel {id, series}`     |
| `sendShopRequest`              | `POST /api/order`                          |
| Profil, Pläne, Messungen       | `GET /api/member/me`                       |

Noch ohne Gegenstück im Server: Warteliste, PT/Checkup-Anfrage mit Coach-Vorschlag, Recap,
Umfragen. Ereignisse vom Studio (nachgerückt, Coach hat bestätigt) kommen über
`subscribe()`; im Mock per Timer (7 s bzw. 6 s), später über Push oder WebSocket.

### Design

- Dark ist Standard, Hell und System im Profil umschaltbar; Orange `#F2611D`, Anton + Inter
- Abstände 20 Rand / 16 innen / 14 zwischen Karten
- Großer Titel im Inhalt, beim Scrollen erscheint eine halbtransparente Leiste mit Blur und kleinem Titel
- Tabbar transparent mit Blur, aktiver Tab orange; Glocke und Profil oben rechts
- Elemente skalieren beim Drücken leicht; Bottom-Sheets lassen sich am Griff nach unten wegziehen
  (Schwung entscheidet, Gummiband nach oben, Tap auf den Hintergrund schließt)
- „Bewegung reduzieren" wird beachtet (keine Drück-Skalierung, keine Sheet-Einblendanimation,
  Layout-Animationen folgen der Systemeinstellung)
- Haptik nur bei: Buchung bestätigt (auch PT-Vorschlag angenommen), Nachrücken von der Warteliste,
  Coach-Bestätigung, freigeschaltetes Badge

## Abweichungen von der Demo und Entscheidungen

- **Bottom-Sheet selbst gebaut** (`src/features/sheets.tsx`) statt `@gorhom/bottom-sheet`:
  Version 5.2.14 (neueste) übergibt noch die alten `Gesture.Pan()`-Objekte, SDK 58 bringt aber
  react-native-gesture-handler 3 mit neuem `GestureDetector`. Ergebnis: `present()` zeigt nichts.
  Das eigene Sheet nutzt Reanimated und `usePanGesture` (RNGH 3). Sobald gorhom RNGH 3 unterstützt,
  lässt es sich wieder einsetzen, die Sheet-Inhalte bleiben gleich.
- **Statusleiste** wird über die Stack-Option `statusBarStyle` gesteuert (react-native-screens
  übernimmt sie, `expo-status-bar` allein wirkt dort nicht). Über dem Foto-Hero setzt Home ein
  Override im UI-Store.

- **Umfragen sind nicht Pflicht**: Die Demo nennt die Umfrage „Pflicht"; laut Vorgabe ist nur der
  Wochenrecap Pflicht. Die Umfrage steht als Liste in der Home-Kachel und unter Mehr → Umfragen,
  ausgefüllte sind gesperrt.
- **Layout-Varianten** und die Seitenleiste der Demo (Direkt springen, Simulieren) gibt es nicht.
  Zum Testen stehen im Profil unter „Demo": Recap & Umfrage wieder öffnen, Inaktivität simulieren,
  Push „Messung steht an", Demo zurücksetzen.
- **Darstellung** hat zusätzlich „System".
- **WhatsApp-Kanal** zeigt wie in der Demo nur einen Hinweis (Link fehlt noch).
  **Kontakt zum Studio** ruft die Nummer per `tel:` an (im Simulator kommt der Hinweis).
- **Push-Benachrichtigungen** sind In-App-Banner; echte Pushes (expo-notifications) kommen mit dem Backend.
- **Nachbestellen** bei Supplements legt das Produkt in den Warenkorb und öffnet Shop + Warenkorb.
- Statusleiste: über dem Foto-Hero hell, nach dem Scrollen passend zum Theme.
