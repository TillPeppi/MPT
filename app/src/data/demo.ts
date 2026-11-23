/** Demo-Daten 1:1 aus designs/app-demo.html (COURSES, PRODUCTS, BODY, EXERCISES, CHECKUP, NEWS, ARTICLES, BADGES, RANKING, SEED). */
import type { MemberState, StudioContent } from './types';

export const CONTENT: StudioContent = {
  coaches: ['Marc-Luca', 'Lukas'],
  courses: [
    { id: 'co1', day: 1, start: '16:00', end: '17:00', title: 'Semi-Personal', coach: 'Marc-Luca', base: 4 },
    { id: 'co2', day: 1, start: '17:00', end: '18:00', title: 'Functional Athletik', coach: 'Marc-Luca', base: 6 },
    { id: 'co3', day: 1, start: '18:00', end: '19:00', title: 'Semi-Personal', coach: 'Lukas', base: 3 },
    { id: 'co4', day: 1, start: '19:00', end: '20:00', title: 'Mobility & Reha', coach: 'Lukas', base: 2 },
    { id: 'co5', day: 2, start: '16:00', end: '17:00', title: 'Semi-Personal', coach: 'Marc-Luca', base: 4 },
    { id: 'co6', day: 2, start: '17:30', end: '18:30', title: 'Golf-Athletik', coach: 'Marc-Luca', base: 3, restricted: 'Nur für Teilnehmer:innen der Golf-Gruppe' },
    { id: 'co7', day: 2, start: '19:00', end: '20:00', title: 'Kraft & Kondition', coach: 'Lukas', base: 4 },
    { id: 'co8', day: 3, start: '16:00', end: '17:00', title: 'Semi-Personal', coach: 'Lukas', base: 2 },
    { id: 'co9', day: 3, start: '18:00', end: '19:00', title: 'Functional Athletik', coach: 'Marc-Luca', base: 5 },
    { id: 'co10', day: 3, start: '19:30', end: '20:30', title: 'Semi-Personal', coach: 'Marc-Luca', base: 6 },
    { id: 'co11', day: 4, start: '16:00', end: '17:00', title: 'Mobility & Reha', coach: 'Lukas', base: 1 },
    { id: 'co12', day: 4, start: '17:00', end: '18:00', title: 'Semi-Personal', coach: 'Marc-Luca', base: 3 },
    { id: 'co13', day: 4, start: '18:30', end: '19:30', title: 'Golf-Athletik', coach: 'Marc-Luca', base: 2, restricted: 'Nur für Teilnehmer:innen der Golf-Gruppe' },
    { id: 'co14', day: 5, start: '16:00', end: '17:00', title: 'Semi-Personal', coach: 'Lukas', base: 3 },
    { id: 'co15', day: 5, start: '17:00', end: '18:00', title: 'Kraft & Kondition', coach: 'Marc-Luca', base: 5 },
    { id: 'co16', day: 0, start: '10:00', end: '11:00', title: 'Semi-Personal', coach: 'Marc-Luca', base: 4 },
    { id: 'co17', day: 0, start: '11:30', end: '12:30', title: 'Mobility & Reha', coach: 'Lukas', base: 2 },
  ],
  products: [
    { id: 'p1', name: 'MPT Whey Protein', cat: 'Protein', price: 34.9, unit: '1 kg', variants: ['Schoko', 'Vanille', 'Erdbeere'], badge: 'Bestseller' },
    { id: 'p2', name: 'MPT Vegan Protein', cat: 'Protein', price: 36.9, unit: '1 kg', variants: ['Schoko', 'Neutral'], badge: 'Vegan' },
    { id: 'p3', name: 'Magnesium Bisglycinat', cat: 'Supplements', price: 19.9, unit: '120 Kapseln' },
    { id: 'p4', name: 'Kreatin Monohydrat', cat: 'Supplements', price: 24.9, unit: '500 g' },
    { id: 'p5', name: 'Omega-3', cat: 'Supplements', price: 22.9, unit: '120 Kapseln' },
    { id: 'p6', name: 'Blackroll Standard', cat: 'Equipment', price: 32.9, unit: '45 cm', variants: ['Schwarz', 'Orange'] },
    { id: 'p7', name: 'Blackroll Duoball', cat: 'Equipment', price: 17.9, unit: '12 cm' },
    { id: 'p8', name: 'MPT Shaker', cat: 'Equipment', price: 9.9, unit: '700 ml' },
  ],
  body: {
    dates: ['08.06.', '06.07.', '03.08.', '31.08.', '28.09.', '26.10.'],
    metrics: {
      kfa: { l: 'Körperfett', u: '%', v: [23.3, 22.2, 21.5, 20.4, 19.4, 18.6], good: -1 },
      weight: { l: 'Gewicht', u: 'kg', v: [71.2, 70.6, 70.1, 69.5, 68.9, 68.4], good: -1 },
      lean: { l: 'Lean Mass', u: 'kg', v: [54.6, 54.9, 55.0, 55.3, 55.5, 55.7], good: 1 },
      skin: { l: 'Hautfalten Σ', u: 'mm', v: [88, 82, 77, 72, 68, 64], good: -1 },
    },
  },
  exercises: [
    { id: 'e1', n: 'Kniebeuge', p: 'Gewicht · 5 Wdh', u: 'kg', v: [50, 57.5, 67.5, 80] },
    { id: 'e2', n: 'Rumänisches Kreuzheben', p: 'Gewicht · 8 Wdh', u: 'kg', v: [40, 50, 60, 70] },
    { id: 'e3', n: 'Bankdrücken', p: 'Gewicht · 6 Wdh', u: 'kg', v: [30, 32.5, 37.5, 42.5] },
    { id: 'e4', n: 'Klimmzug mit Band', p: 'Wiederholungen', u: 'Wdh', v: [2, 3, 5, 8] },
    { id: 'e5', n: 'Plank', p: 'Zeit', u: 'time', v: [50, 70, 85, 105] },
    { id: 'e6', n: 'Rudern 2.000 m', p: 'Distanz · Zeit', u: 'time', v: [548, 525, 506, 492], lower: true },
    { id: 'e7', n: 'Assault Bike', p: 'Kalorien · 2 min', u: 'kcal', v: [22, 25, 28, 32] },
    { id: 'e8', n: "Farmer's Walk", p: 'Distanz · 2×24 kg', u: 'm', v: [20, 30, 40, 60] },
  ],
  checkup: {
    date: '26.10.2026',
    prev: 7,
    joints: [
      { n: 'Fußgelenk', items: [['Ferse bleibt am Boden', true], ['Füße zeigen nach vorn', true], ['Knie bleiben über dem Fuß', false]], note: 'Knie fallen rechts leicht nach innen. Sprunggelenk-Mobility ins Warm-up.' },
      { n: 'Hüfte', items: [['Tiefe unter parallel', true], ['Becken bleibt neutral', true], ['Gewicht mittig', true]], note: 'Unauffällig.' },
      { n: 'Schulter', items: [['Arme bleiben über Kopf', false], ['Kein Hohlkreuz zum Ausgleich', true], ['Ellbogen bleiben gestreckt', true]], note: 'Arme fallen am tiefsten Punkt nach vorn. Brustwirbelsäule mobilisieren.' },
      { n: 'Symmetrie', items: [['Beide Seiten gleich', true]], note: 'Unauffällig.' },
    ],
  },
  news: [
    { id: 'nw1', date: '22.11.', tag: 'Studio', t: 'Neue Golf-Sim-Zeiten ab Dezember', img: 'golf-simulator', x: 'Ab 1. Dezember ist der Golfsimulator zusätzlich samstags von 9 bis 14 Uhr buchbar. Mitglieder melden sich wie gewohnt im Studio oder über die Website.' },
    { id: 'nw2', date: '20.11.', tag: 'Challenge', t: 'Dezember-Challenge: Ruderduell 2.000 m', img: 'studio-bikes', x: 'Im Dezember rudern alle 2.000 m auf Zeit. Deine beste Zeit trägt dein Coach ein, die Bestenliste siehst du in der App. Wer sich verbessert, bekommt +150 Punkte.' },
    { id: 'nw3', date: '18.11.', tag: 'Info', t: 'Öffnungszeiten über Weihnachten', x: 'Vom 24. bis 26.12. und am 31.12. und 1.1. ist das Studio geschlossen. Zwischen den Jahren laufen die Kurse nach Sonderplan. Der Plan kommt Anfang Dezember hier in die App.' },
    { id: 'nw4', date: '10.11.', tag: 'Kurse', t: 'Mobility & Reha jetzt auch donnerstags', img: 'trainer-bench', x: 'Wegen der großen Nachfrage gibt es Mobility & Reha mit Lukas jetzt auch donnerstags um 16 Uhr.' },
  ],
  articles: [
    { id: 'a1', tag: 'Wissen', min: 4, t: 'Wie viel Protein brauchst du wirklich?', img: 'trainer-bench', x: ['Wer regelmäßig Krafttraining macht, profitiert von mehr Protein als der Durchschnitt. Ein guter Richtwert sind 1,6 bis 2 g pro Kilogramm Körpergewicht am Tag.', 'Wichtiger als die exakte Zahl ist, dass du es verteilst: 3 bis 4 Mahlzeiten mit jeweils 25 bis 40 g Protein.', 'Gute Quellen sind Magerquark, Skyr, Eier, Hülsenfrüchte, Fisch und mageres Fleisch. Ein Shake hilft, wenn es im Alltag knapp wird.'] },
    { id: 'a2', tag: 'Tipps', min: 3, t: '5 Frühstücks-Ideen mit 30 g Protein', img: 'group', x: ['1. Skyr mit Beeren und Haferflocken. 2. Rührei aus drei Eiern mit Vollkornbrot. 3. Overnight Oats mit Proteinpulver.', '4. Hüttenkäse-Brot mit Tomate. 5. Ein Shake mit Banane und Erdnussmus, wenn es schnell gehen muss.', 'Faustregel: Jedes Frühstück braucht eine Proteinquelle, eine Kohlenhydratquelle und etwas Obst oder Gemüse.'] },
    { id: 'a3', tag: 'Tipps', min: 2, t: 'Trinken im Winter: unterschätzt', x: ['Im Winter haben viele weniger Durst und trinken zu wenig. Das merkst du an Leistung, Konzentration und Erholung.', 'Stell dir morgens eine Flasche hin und trink vor jedem Training ein großes Glas Wasser. Tee zählt mit.'] },
    { id: 'a4', tag: 'Wissen', min: 5, t: 'Kreatin: Mythen und Fakten', img: 'studio-gym', x: ['Kreatin ist eines der am besten untersuchten Supplements. Es hilft bei kurzen, intensiven Belastungen wie Krafttraining und Sprints.', 'Eine Ladephase braucht es nicht. Entscheidend ist die regelmäßige Einnahme. Ob morgens oder abends, ist zweitrangig.', 'Kreatin bindet etwas Wasser im Muskel. Das kann auf der Waage 1 bis 2 kg ausmachen. Das ist kein Fett.', 'Sprich die Einnahme mit deinem Coach ab, vor allem bei Vorerkrankungen.'] },
  ],
  badges: [
    { n: 'Erste Einheit', i: 'star', got: true, d: 'Deine erste Einheit bei MPT.' },
    { n: '4-Wochen-Streak', i: 'flame', got: true, d: '4 Wochen in Folge mindestens 2 Einheiten.' },
    { n: 'Checkup-Profi', i: 'pulse', got: true, d: '3 Checkups absolviert.' },
    { n: 'Recap ×10', i: 'poll', got: true, d: '10 Wochenrecaps ausgefüllt.' },
    { n: '50. Einheit', i: 'target', got: false, d: 'Noch 2 Einheiten bis zur 50. (+250 Punkte).' },
    { n: 'Frühaufsteher', i: 'clock', got: false, d: '10 Einheiten vor 9 Uhr.' },
    { n: '12-Wochen-Streak', i: 'flame', got: false, d: '12 Wochen in Folge. Du stehst bei 7.' },
    { n: 'Challenge-Sieg', i: 'trophy', got: false, d: 'Platz 1 in einer Monats-Challenge.' },
  ],
  challenge: {
    id: 'hyrox-nov',
    month: 'November',
    title: 'Hyrox Sim',
    sub: 'Halbe Distanz · 4 km Laufen, 8 Stationen',
    daysLeft: 5,
    ends: '30.11.',
    participants: 23,
    metric: 'time',
    lowerIsBetter: true,
    reward: '+200 Punkte fürs Podest, +100 für jede neue Bestzeit',
    board: [['Jonas K.', 2045], ['Sarah W.', 2200], ['Tim B.', 2250], ['Lena M.', 2292, true], ['Anna S.', 2330], ['Max R.', 2402], ['Julia H.', 2475], ['Paul D.', 2610]],
  },
};

export const SEED = (): MemberState => ({
  inactive: false,
  user: {
    first: 'Lena', name: 'Lena Meyer', ini: 'LM', mail: 'lena.meyer@demo.mpt', phone: '0151 23456789', birth: '14.06.1994',
    since: 'März 2025', contract: 'Semi-Personal Monats-Abo · bis 3×/Woche', coach: 'Marc-Luca', goal: 'Körperfett senken, kräftiger werden',
    units: 48, monthUnits: 9, streak: 7, weekDone: 2,
  },
  points: 1240,
  bookings: [
    { id: 'b1', type: 'group', date: '2026-11-26', time: '17:00', end: '18:00', title: 'Semi-Personal', coach: 'Marc-Luca', status: 'confirmed', sid: 's1', persons: 1 },
    { id: 'b2', type: 'group', date: '2026-12-03', time: '17:00', end: '18:00', title: 'Semi-Personal', coach: 'Marc-Luca', status: 'confirmed', sid: 's1', persons: 1 },
    { id: 'b3', type: 'group', date: '2026-12-01', time: '16:00', end: '17:00', title: 'Semi-Personal', coach: 'Marc-Luca', status: 'confirmed', sid: 's2', persons: 1 },
    { id: 'b4', type: 'group', date: '2026-12-08', time: '16:00', end: '17:00', title: 'Semi-Personal', coach: 'Marc-Luca', status: 'confirmed', sid: 's2', persons: 1 },
    { id: 'b5', type: 'checkup', date: '2026-11-27', time: '08:00', end: '08:45', title: 'Checkup', coach: 'Marc-Luca', status: 'confirmed', persons: 1 },
    { id: 'b6', type: 'pt', date: '2026-11-30', time: '15:00', end: '16:00', title: 'Personal Training', coach: 'Marc-Luca', status: 'proposed', prop: '14:30', persons: 1 },
    { id: 'b7', type: 'group', date: '2026-11-25', time: '19:30', end: '20:30', title: 'Semi-Personal', coach: 'Marc-Luca', status: 'waitlist', wait: 3, persons: 1 },
  ],
  history: [
    { date: '2026-11-24', time: '16:00', title: 'Semi-Personal', coach: 'Marc-Luca', ok: true },
    { date: '2026-11-23', time: '17:00', title: 'Functional Athletik', coach: 'Marc-Luca', ok: true },
    { date: '2026-11-20', time: '17:00', title: 'Kraft & Kondition', coach: 'Marc-Luca', ok: true },
    { date: '2026-11-19', time: '17:00', title: 'Semi-Personal', coach: 'Marc-Luca', ok: true },
    { date: '2026-11-17', time: '16:00', title: 'Semi-Personal', coach: 'Marc-Luca', ok: true },
    { date: '2026-11-13', time: '17:00', title: 'Kraft & Kondition', coach: 'Marc-Luca', ok: false },
    { date: '2026-11-12', time: '17:00', title: 'Semi-Personal', coach: 'Marc-Luca', ok: true },
    { date: '2026-11-10', time: '16:00', title: 'Semi-Personal', coach: 'Marc-Luca', ok: true },
  ],
  scores: [
    { kw: 42, s: 71, t: 7, sl: 6, n: 7, e: 8 }, { kw: 43, s: 74, t: 8, sl: 6, n: 7, e: 8 }, { kw: 44, s: 70, t: 6, sl: 7, n: 7, e: 8 },
    { kw: 45, s: 76, t: 8, sl: 7, n: 7, e: 8 }, { kw: 46, s: 79, t: 8, sl: 7, n: 8, e: 9 }, { kw: 47, s: 83, t: 9, sl: 7, n: 8, e: 9 },
  ],
  recapDone: false,
  survey: null,
  cart: [],
  requests: [{ id: 'r1', date: '12.11.', items: [['MPT Whey Protein · Schoko', 1, 34.9]], status: 'Abgeholt' }],
  supps: [
    { pid: 'p4', name: 'Kreatin Monohydrat', when: 'täglich, Zeitpunkt egal', days: 18, of: 100 },
    { pid: 'p3', name: 'Magnesium Bisglycinat', when: 'abends', days: 4, of: 60 },
    { pid: 'p5', name: 'Omega-3', when: 'zu einer Mahlzeit', days: 26, of: 60 },
    { pid: null, name: 'Vitamin D3', when: 'morgens · Oktober bis März', days: 40, of: 90 },
  ],
  notifs: [
    { id: 'n1', k: 'me', i: 'clock', t: 'Neuer Terminvorschlag', x: 'Marc-Luca schlägt für dein Personal Training am Mo 30.11. 14:30 statt 15:00 vor.', at: 'vor 20 Min.', go: 'proposal', read: false },
    { id: 'n2', k: 'me', i: 'users', t: 'Du stehst auf der Warteliste', x: 'Platz 3 für heute 19:30 Semi-Personal. Wird ein Platz frei, rückst du automatisch nach.', at: 'vor 1 Std.', go: 'mybookings', read: false },
    { id: 'n3', k: 'me', i: 'pill', t: 'Magnesium bald leer', x: 'Dein Vorrat reicht noch ca. 4 Tage. Jetzt im Studio nachbestellen?', at: 'heute, 08:00', go: 'supps', read: false },
    { id: 'n6', k: 'news', i: 'mega', t: 'Neue Golf-Sim-Zeiten ab Dezember', x: 'Samstags zusätzlich von 9 bis 14 Uhr.', at: '22.11.', go: 'news|nw1', read: false },
    { id: 'n4', k: 'me', i: 'pulse', t: 'Messung steht an', x: 'Checkup am Fr 27.11. um 08:00: Messung, Planübersicht und Gelenk-Screen.', at: 'gestern', go: 'stats-checkup', read: true },
    { id: 'n5', k: 'me', i: 'flame', t: 'Noch 1 Einheit für deinen Streak', x: 'Eine Einheit fehlt diese Woche für Wochen-Streak Nr. 8.', at: 'gestern', go: 'book-group', read: true },
    { id: 'n7', k: 'news', i: 'trophy', t: 'Dezember-Challenge: Ruderduell', x: '2.000 m auf Zeit. Bestenliste in der App.', at: '20.11.', go: 'challenge', read: true },
    { id: 'n8', k: 'news', i: 'mega', t: 'Öffnungszeiten über Weihnachten', x: '24. bis 26.12. sowie 31.12. und 1.1. geschlossen.', at: '18.11.', go: 'news|nw3', read: true },
  ],
  push: { training: true, streak: true, measure: true, news: true, supps: true, booking: true },
  challengeJoin: false,
});

/** Umfrage „Trainingszeiten 2027" */
export const SURVEY = {
  id: 'times2027',
  title: 'Trainingszeiten 2027',
  due: '06.12.',
  times: ['Früh (6–9 Uhr)', 'Vormittag', 'Mittag', 'Nachmittag', 'Abend (17–20 Uhr)', 'Spät (ab 20 Uhr)'],
  neu: ['Golf-Athletik', 'Lauf-Gruppe', 'Mobility-Workshop', 'Ernährungs-Workshop', 'Nichts Neues'],
};

export const PT_TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
/** Recap-Skala ohne 7 */
export const SCALE = [1, 2, 3, 4, 5, 6, 8, 9, 10];
