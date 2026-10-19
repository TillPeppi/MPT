/* Block-, Inhalts- und Einstellungs-Schema für das MPT-Admin.
   Jeder Block: label, icon, cat (Bibliotheks-Gruppe), desc, variants {key: Label}, defaults (props), fields (Inspector). */
window.SCHEMA = (function () {
  const head = [
    { k: 'eyebrow', t: 'text', l: 'Überzeile' },
    { k: 'title', t: 'textarea', l: 'Titel', h: '*Wort* = orange, Zeilenumbruch = neue Zeile' },
    { k: 'text', t: 'textarea', l: 'Text' }
  ];
  const cta = n => [{ k: `cta${n}Label`, t: 'text', l: `Button ${n} Text` }, { k: `cta${n}Href`, t: 'link', l: `Button ${n} Link` }];

  const blocks = {
    hero: {
      label: 'Hero', icon: '▣', cat: 'Basis', desc: 'Großer Einstieg mit Titel, Bild & Buttons',
      variants: { fullbleed: 'Vollbild', split: 'Geteilt', poster: 'Poster', compact: 'Kompakt (Unterseite)' },
      defaults: { eyebrow: 'Überzeile', title: 'Neuer *Titel.*', text: 'Kurzer Einleitungstext.', image: '/assets/img/studio-gym.jpg', cta1Label: 'Termin anfragen', cta1Href: '#kontakt', cta2Label: '', cta2Href: '', showStatus: false },
      fields: [...head, { k: 'image', t: 'image', l: 'Bild' }, ...cta(1), ...cta(2), { k: 'showStatus', t: 'toggle', l: 'Live-Öffnungsstatus anzeigen' }]
    },
    marquee: {
      label: 'Laufband', icon: '⇉', cat: 'Basis', desc: 'Oranges Laufband mit Schlagworten',
      variants: { tilted: 'Schräg', flat: 'Gerade' },
      defaults: { items: ['Muskelaufbau', 'Gewichtsabnahme', 'Reha-Sport'] },
      fields: [{ k: 'items', t: 'strings', l: 'Begriffe' }]
    },
    usp: {
      label: 'Vorteile', icon: '✦', cat: 'Basis', desc: 'Nummerierte Vorteile / Leistungsversprechen',
      variants: { grid: 'Raster', list: 'Liste' },
      defaults: { eyebrow: 'Vorteile', title: 'Warum *MPT?*', text: '', items: [{ title: 'Vorteil', text: 'Beschreibung' }] },
      fields: [...head, { k: 'items', t: 'list', l: 'Punkte', item: { title: 'Neuer Punkt', text: '' }, fields: [{ k: 'title', t: 'text', l: 'Titel' }, { k: 'text', t: 'textarea', l: 'Text' }] }]
    },
    offers: {
      label: 'Angebote', icon: '▦', cat: 'Basis', desc: 'Leistungen als Bild-Kacheln',
      variants: { bento: 'Bento', cards: 'Karten' },
      defaults: { eyebrow: 'Angebot', title: 'Unsere *Leistungen.*', text: '', items: [{ title: 'Leistung', text: 'Beschreibung', meta: 'ab 0 €', image: '', tag: '', href: '#kontakt' }] },
      fields: [...head, { k: 'items', t: 'list', l: 'Kacheln', item: { title: 'Neue Leistung', text: '', meta: '', image: '', tag: '', href: '#kontakt' }, fields: [{ k: 'title', t: 'text', l: 'Titel' }, { k: 'text', t: 'textarea', l: 'Text' }, { k: 'meta', t: 'text', l: 'Preis / Info' }, { k: 'tag', t: 'text', l: 'Badge' }, { k: 'image', t: 'image', l: 'Bild' }, { k: 'href', t: 'link', l: 'Link' }] }]
    },
    schedule: {
      label: 'Kurskalender', icon: '▤', cat: 'Training', desc: 'Wochenplan Mo–So mit Kursen & freien Plätzen',
      variants: { week: 'Wochenraster', agenda: 'Tages-Tabs' },
      defaults: { eyebrow: 'Kursplan', title: 'Deine *Woche.*', text: 'Klick auf einen Kurs, um einen Platz anzufragen.', days: [1, 2, 3, 4, 5], category: '', formId: 'probetraining' },
      fields: [...head, { k: 'days', t: 'days', l: 'Angezeigte Tage' }, { k: 'category', t: 'category', l: 'Nur Kategorie (optional)' }, { k: 'formId', t: 'form', l: 'Buchungs-Formular' }, { t: 'collection', c: 'courses', l: 'Kurse bearbeiten' }]
    },
    pricing: {
      label: 'Preisplan', icon: '€', cat: 'Training', desc: 'Beliebig viele Preis-Kacheln mit Features',
      variants: { tiles: 'Kacheln', compact: 'Liste' },
      defaults: { eyebrow: 'Preise', title: 'Preis&shy;pläne.', text: '', items: [{ name: 'Basis', price: '49 €', unit: '/ Monat', old: '', badge: '', features: 'Feature 1\nFeature 2', ctaLabel: 'Buchen', ctaHref: '#kontakt', highlight: false }], note: '', codes: [] },
      fields: [...head, { k: 'items', t: 'list', l: 'Preis-Kacheln', item: { name: 'Neuer Tarif', price: '0 €', unit: '', old: '', badge: '', features: '', ctaLabel: 'Buchen', ctaHref: '#kontakt', highlight: false }, fields: [{ k: 'name', t: 'text', l: 'Name' }, { k: 'price', t: 'text', l: 'Preis' }, { k: 'unit', t: 'text', l: 'Einheit (z. B. / Std.)' }, { k: 'old', t: 'text', l: 'Alter Preis' }, { k: 'badge', t: 'text', l: 'Badge' }, { k: 'features', t: 'textarea', l: 'Features (eine pro Zeile)' }, { k: 'ctaLabel', t: 'text', l: 'Button' }, { k: 'ctaHref', t: 'link', l: 'Link' }, { k: 'highlight', t: 'toggle', l: 'Hervorheben' }] },
        { k: 'codes', t: 'list', l: 'Rabattcodes', item: { code: 'CODE10', text: '10 € Rabatt' }, fields: [{ k: 'code', t: 'text', l: 'Code' }, { k: 'text', t: 'text', l: 'Beschreibung' }] }, { k: 'note', t: 'textarea', l: 'Hinweis' }]
    },
    team: {
      label: 'Coach & Team', icon: '☺', cat: 'Vertrauen', desc: 'Trainer*innen-Profile aus „Inhalte → Team"',
      variants: { cards: 'Karten', spotlight: 'Spotlight (Head Coach)' },
      defaults: { eyebrow: 'Team', title: 'Dein *Team.*', text: '', limit: 12 },
      fields: [...head, { k: 'limit', t: 'number', l: 'Max. Anzahl' }, { t: 'collection', c: 'team', l: 'Team bearbeiten' }]
    },
    reviews: {
      label: 'Google-Bewertungen', icon: '★', cat: 'Vertrauen', desc: 'Bewertungs-Kachel mit Schnitt & Stimmen',
      variants: { grid: 'Raster', slider: 'Slider', badge: 'Badge + 3' },
      defaults: { eyebrow: 'Bewertungen', title: 'Das sagen *Kund*innen.*', link: '' },
      fields: [{ k: 'eyebrow', t: 'text', l: 'Überzeile' }, { k: 'title', t: 'textarea', l: 'Titel' }, { k: 'link', t: 'link', l: 'Link zum Google-Profil' }, { t: 'info', l: 'Live-Anbindung: Google Places API (Place-ID) – Bewertungen werden dann automatisch geladen. Bis dahin unter Inhalte → Bewertungen pflegen.' }, { t: 'collection', c: 'reviews', l: 'Bewertungen bearbeiten' }]
    },
    hours: {
      label: 'Öffnungszeiten', icon: '◷', cat: 'Basis', desc: 'Zeiten mit Live-Status „jetzt geöffnet"',
      variants: { card: 'Karte', banner: 'Tages-Banner' },
      defaults: { eyebrow: 'Öffnungszeiten', title: 'Komm *vorbei.*' },
      fields: [{ k: 'eyebrow', t: 'text', l: 'Überzeile' }, { k: 'title', t: 'textarea', l: 'Titel' }, { t: 'settings', s: 'hours', l: 'Öffnungszeiten bearbeiten' }]
    },
    stories: {
      label: 'Vorher / Nachher', icon: '◐', cat: 'Vertrauen', desc: 'Erfolgsgeschichten mit Vergleichs-Regler',
      variants: { compare: 'Vergleichs-Regler', cards: 'Karten' },
      defaults: { eyebrow: 'Erfolgsgeschichten', title: 'Sichtbare *Entwicklung.*', text: '', limit: 3 },
      fields: [...head, { k: 'limit', t: 'number', l: 'Max. Anzahl' }, { t: 'collection', c: 'stories', l: 'Geschichten bearbeiten' }]
    },
    instagram: {
      label: 'Instagram-Feed', icon: '◎', cat: 'Social', desc: 'Posts & Reels als Raster oder Reel-Leiste',
      variants: { grid: 'Raster', reels: 'Reels' },
      defaults: { eyebrow: '@metsch.personal.training', title: 'Folge dem *Prozess.*', link: 'https://www.instagram.com/metsch.personal.training/', items: [{ image: '/assets/img/studio-bikes.jpg', caption: 'Studio Tour', type: 'reel' }] },
      fields: [{ k: 'eyebrow', t: 'text', l: 'Überzeile' }, { k: 'title', t: 'textarea', l: 'Titel' }, { k: 'link', t: 'link', l: 'Profil-Link' }, { k: 'items', t: 'list', l: 'Beiträge', item: { image: '', caption: 'Neuer Beitrag', type: 'post', href: '' }, fields: [{ k: 'image', t: 'image', l: 'Bild' }, { k: 'caption', t: 'text', l: 'Titel' }, { k: 'type', t: 'select', l: 'Typ', o: { post: 'Post', reel: 'Reel' } }, { k: 'href', t: 'link', l: 'Link zum Beitrag (leer = Profil)' }] }, { t: 'info', l: 'Live: Instagram Graph API (Business-Konto) lädt die neuesten Posts automatisch – nach Cookie-Zustimmung.' }]
    },
    contact: {
      label: 'Kontaktformular', icon: '✉', cat: 'Kontakt', desc: 'Formular mit eigener E-Mail-Weiterleitung',
      variants: { split: 'Mit Infos', center: 'Zentriert' },
      defaults: { eyebrow: 'Kontakt', title: 'Schreib *uns.*', text: '', formId: 'allgemein', showHours: true, showInfo: true },
      fields: [...head, { k: 'formId', t: 'form', l: 'Formular' }, { k: 'showHours', t: 'toggle', l: 'Öffnungszeiten zeigen' }, { k: 'showInfo', t: 'toggle', l: 'Adresse & Kontakt zeigen' }, { t: 'settings', s: 'forms', l: 'Formulare & E-Mail-Empfänger' }]
    },
    member: {
      label: 'Mitgliederbereich', icon: '⚿', cat: 'Training', desc: 'Login, Trainingsplan, Fortschritt, Buchungen',
      variants: { dashboard: 'Dashboard' },
      defaults: { title: 'Mitglieder&shy;bereich', text: 'Trainingspläne, Fortschritt und Buchungen an einem Ort.' },
      fields: [{ k: 'title', t: 'textarea', l: 'Titel' }, { k: 'text', t: 'textarea', l: 'Text' }, { t: 'info', l: 'Kunden, Pläne und Messungen pflegst du im Bereich Kunden.' }, { t: 'tab', s: 'members', l: 'Bereich Kunden öffnen' }]
    },
    blog: {
      label: 'Blog / Wissen', icon: '✎', cat: 'Social', desc: 'SEO-Beiträge als Raster oder Featured',
      variants: { grid: 'Raster', featured: 'Featured' },
      defaults: { eyebrow: 'Wissen', title: 'Aus dem *Studio.*', limit: 3, tag: '' },
      fields: [{ k: 'eyebrow', t: 'text', l: 'Überzeile' }, { k: 'title', t: 'textarea', l: 'Titel' }, { k: 'limit', t: 'number', l: 'Anzahl Beiträge' }, { k: 'tag', t: 'text', l: 'Nur Tag (optional)' }, { t: 'collection', c: 'posts', l: 'Beiträge bearbeiten' }]
    },
    events: {
      label: 'Golf-Ligen & Events', icon: '⛳', cat: 'Golf', desc: 'Ligen, Turniere, Events mit Anmeldung',
      variants: { cards: 'Karten', list: 'Liste' },
      defaults: { eyebrow: 'Events', title: 'Ligen & *Events.*', text: '', type: '', formId: 'golf' },
      fields: [...head, { k: 'type', t: 'select', l: 'Nur Typ', o: { '': 'Alle', Liga: 'Liga', Turnier: 'Turnier', Event: 'Event' } }, { k: 'formId', t: 'form', l: 'Anmelde-Formular' }, { t: 'collection', c: 'events', l: 'Events bearbeiten' }]
    },
    leaderboard: {
      label: 'Leaderboard & Challenges', icon: '♛', cat: 'Golf', desc: 'Monats-Challenges als Kacheln, Podium oder Tabelle',
      variants: { tiles: 'Kacheln (mehrere)', mini: 'Mini-Kacheln (Startseite)', podium: 'Podium (eine)', table: 'Tabelle (eine)' },
      defaults: { eyebrow: 'Challenges des Monats', title: 'Wer holt *Platz 1?*', challengeIds: [], topN: 3, challengeId: 'current' },
      fields: [{ k: 'eyebrow', t: 'text', l: 'Überzeile' }, { k: 'title', t: 'textarea', l: 'Titel' },
        { k: 'challengeIds', t: 'challenges', l: 'Kacheln: angezeigte Challenges', h: 'Nichts ausgewählt = automatisch alle Challenges des aktuellen Monats' },
        { k: 'topN', t: 'number', l: 'Kacheln: Plätze pro Kachel' },
        { k: 'challengeId', t: 'challenge', l: 'Podium / Tabelle: Challenge' },
        { t: 'collection', c: 'challenges', l: 'Challenges & Ergebnisse bearbeiten' }]
    },
    shop: {
      label: 'Shop', icon: '🛒', cat: 'Shop', desc: 'Produkte mit Warenkorb – Abholung & Bezahlung im Studio',
      variants: { grid: 'Raster', rows: 'Liste (kompakt)' },
      defaults: { eyebrow: 'Shop', title: 'Unser *Shop.*', text: 'Bestellen und im Studio abholen. Bezahlt wird vor Ort.', category: '', limit: 12 },
      fields: [...head, { k: 'category', t: 'pcategory', l: 'Nur Kategorie (optional)' }, { k: 'limit', t: 'number', l: 'Max. Anzahl' }, { t: 'collection', c: 'products', l: 'Produkte bearbeiten' }]
    },
    textmedia: {
      label: 'Text + Bild', icon: '◧', cat: 'Basis', desc: 'Text mit Bild, Stichpunkten und Button',
      variants: { split: 'Bild rechts', 'split-rev': 'Bild links', overlay: 'Bild im Hintergrund' },
      defaults: { eyebrow: 'Überzeile', title: 'Titel', text: 'Text', image: '/assets/img/studio-gym.jpg', bullets: [], ctaLabel: '', ctaHref: '' },
      fields: [...head, { k: 'image', t: 'image', l: 'Bild' }, { k: 'bullets', t: 'strings', l: 'Stichpunkte' }, { k: 'ctaLabel', t: 'text', l: 'Button' }, { k: 'ctaHref', t: 'link', l: 'Link' }]
    },
    steps: {
      label: 'Ablauf / Schritte', icon: '①', cat: 'Basis', desc: 'Prozess in Schritten',
      variants: { numbers: 'Nummern', timeline: 'Timeline' },
      defaults: { eyebrow: 'Ablauf', title: 'So *funktioniert\'s.*', items: [{ title: 'Schritt', text: '', meta: '' }] },
      fields: [{ k: 'eyebrow', t: 'text', l: 'Überzeile' }, { k: 'title', t: 'textarea', l: 'Titel' }, { k: 'items', t: 'list', l: 'Schritte', item: { title: 'Neuer Schritt', text: '', meta: '' }, fields: [{ k: 'title', t: 'text', l: 'Titel' }, { k: 'text', t: 'textarea', l: 'Text' }, { k: 'meta', t: 'text', l: 'Label' }] }]
    },
    gift: {
      label: 'Gutschein', icon: '🎁', cat: 'Kontakt', desc: 'Gutschein-Verkauf mit Beträgen',
      variants: { orange: 'Orange', dark: 'Dunkel' },
      defaults: { title: 'Verschenke Stärke.', text: 'Der MPT-Wertgutschein.', image: '/assets/img/giftcard.jpg', amounts: ['50 €', '100 €', '150 €'], ctaLabel: 'Gutschein kaufen' },
      fields: [{ k: 'title', t: 'textarea', l: 'Titel' }, { k: 'text', t: 'textarea', l: 'Text' }, { k: 'image', t: 'image', l: 'Bild' }, { k: 'amounts', t: 'strings', l: 'Beträge' }, { k: 'ctaLabel', t: 'text', l: 'Button' }]
    },
    cta: {
      label: 'Call-to-Action', icon: '➜', cat: 'Kontakt', desc: 'Auffälliger Abschnitt mit Button',
      variants: { orange: 'Orange', outline: 'Box' },
      defaults: { title: 'Starte jetzt.', text: 'Dein erster Schritt dauert eine Minute.', ctaLabel: 'Termin anfragen', ctaHref: '#kontakt' },
      fields: [{ k: 'title', t: 'textarea', l: 'Titel' }, { k: 'text', t: 'textarea', l: 'Text' }, { k: 'ctaLabel', t: 'text', l: 'Button' }, { k: 'ctaHref', t: 'link', l: 'Link' }]
    },
    gallery: {
      label: 'Galerie', icon: '▩', cat: 'Basis', desc: 'Drei Bilder als Mosaik (Studio)',
      variants: { mosaic: 'Mosaik' },
      defaults: { eyebrow: 'Das Studio', title: 'Alles, was du *brauchst.*', text: '', images: ['/assets/img/studio-gym.jpg', '/assets/img/studio-bikes.jpg', '/assets/img/trainer-bench.jpg'] },
      fields: [...head, { k: 'images', t: 'images', l: 'Bilder (3)' }]
    }
  };

  const collections = {
    courses: { label: 'Kursplan', icon: '▤', note: 'Die Belegung kommt live aus den Buchungen (Tab Buchungen). Hier legst du nur Zeiten und Plätze fest. Kurse dauern 1 Stunde: Beim Ändern der Startzeit wird „Ende" automatisch auf Start + 1 h gesetzt.', title: c => `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][c.day]} ${c.start} · ${c.title}`, sort: (a, b) => (((a.day + 6) % 7) - ((b.day + 6) % 7)) || a.start.localeCompare(b.start),
      item: () => ({ day: 1, start: '16:00', end: '17:00', title: 'Neuer Kurs', trainer: '', category: 'Kraft', spots: 6, booked: 0 }),
      fields: [{ k: 'title', t: 'text', l: 'Kursname' }, { k: 'day', t: 'select', l: 'Tag', o: { 1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag', 0: 'Sonntag' }, num: true }, { k: 'start', t: 'time', l: 'Start' }, { k: 'end', t: 'time', l: 'Ende' }, { k: 'trainer', t: 'text', l: 'Trainer*in' }, { k: 'category', t: 'text', l: 'Kategorie', list: ['Kraft', 'Athletik', 'Reha', 'Golf'] }, { k: 'spots', t: 'number', l: 'Plätze' }, { k: 'booked', t: 'number', l: 'Gebucht (nur Fallback ohne Server)' }] },
    team: { label: 'Team', icon: '☺', title: c => c.name,
      item: () => ({ name: 'Neues Mitglied', role: 'Trainer*in', bio: '', image: '', fit: 'contain', focus: '20%', tags: '', hiring: false }),
      fields: [{ k: 'name', t: 'text', l: 'Name' }, { k: 'role', t: 'text', l: 'Rolle' }, { k: 'image', t: 'image', l: 'Foto' }, { k: 'fit', t: 'select', l: 'Bildausschnitt', o: { contain: 'Ganzes Bild zeigen (Text im Bild bleibt lesbar)', cover: 'Kachel füllen (wird zugeschnitten)' } }, { k: 'focus', t: 'select', l: 'Fokus beim Füllen', o: { '0%': 'Oben', '20%': 'Oberes Drittel', '50%': 'Mitte', '100%': 'Unten' } }, { k: 'bio', t: 'textarea', l: 'Bio' }, { k: 'tags', t: 'textarea', l: 'Schwerpunkte (eine pro Zeile)' }, { k: 'hiring', t: 'toggle', l: 'Als offene Stelle anzeigen' }] },
    reviews: { label: 'Bewertungen', icon: '★', title: c => `${'★'.repeat(c.rating)} ${c.name}`,
      item: () => ({ name: 'Name', rating: 5, text: '', date: new Date().toISOString().slice(0, 10), source: 'Google' }),
      fields: [{ k: 'name', t: 'text', l: 'Name' }, { k: 'rating', t: 'select', l: 'Sterne', o: { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }, num: true }, { k: 'text', t: 'textarea', l: 'Text' }, { k: 'date', t: 'date', l: 'Datum' }, { k: 'source', t: 'select', l: 'Quelle', o: { Google: 'Google', Website: 'Website', Instagram: 'Instagram' } }] },
    stories: { label: 'Erfolgsgeschichten', icon: '◐', title: c => c.name,
      item: () => ({ name: 'Name, Alter', goal: 'Ziel', duration: '12 Wochen', quote: '', beforeImg: '', afterImg: '', stats: '' }),
      fields: [{ k: 'name', t: 'text', l: 'Name, Alter' }, { k: 'goal', t: 'text', l: 'Ziel' }, { k: 'duration', t: 'text', l: 'Dauer' }, { k: 'beforeImg', t: 'image', l: 'Vorher-Foto' }, { k: 'afterImg', t: 'image', l: 'Nachher-Foto' }, { k: 'quote', t: 'textarea', l: 'Zitat' }, { k: 'stats', t: 'textarea', l: 'Ergebnisse (eine pro Zeile)' }, { t: 'info', l: 'Nur mit schriftlicher Einwilligung der Person veröffentlichen.' }] },
    posts: { label: 'Blog-Beiträge', icon: '✎', title: c => c.title, sort: (a, b) => String(b.date).localeCompare(a.date),
      item: () => ({ slug: 'neuer-beitrag-' + Date.now().toString(36), title: 'Neuer Beitrag', excerpt: '', cover: '', date: new Date().toISOString().slice(0, 10), tags: '', readMin: 3, seoTitle: '', seoDesc: '', body: '' }),
      fields: [{ k: 'title', t: 'text', l: 'Titel' }, { k: 'slug', t: 'text', l: 'URL-Slug', h: 'wird zu /#/blog/slug' }, { k: 'cover', t: 'image', l: 'Titelbild' }, { k: 'excerpt', t: 'textarea', l: 'Kurzbeschreibung' }, { k: 'body', t: 'textarea', l: 'Inhalt', h: '## Zwischenüberschrift · **fett** · Leerzeile = neuer Absatz', rows: 12 }, { k: 'date', t: 'date', l: 'Datum' }, { k: 'tags', t: 'textarea', l: 'Tags (eine pro Zeile)' }, { k: 'readMin', t: 'number', l: 'Lesezeit (Min.)' }, { k: 'seoTitle', t: 'text', l: 'SEO-Titel', max: 60 }, { k: 'seoDesc', t: 'textarea', l: 'SEO-Beschreibung', max: 160 }] },
    events: { label: 'Golf-Events', icon: '⛳', title: c => `${c.date} · ${c.title}`, sort: (a, b) => a.date.localeCompare(b.date),
      item: () => ({ type: 'Event', title: 'Neues Event', date: new Date().toISOString().slice(0, 10), time: '18:00', desc: '', price: '', spots: 12, booked: 0, image: '' }),
      fields: [{ k: 'title', t: 'text', l: 'Titel' }, { k: 'type', t: 'select', l: 'Typ', o: { Liga: 'Liga', Turnier: 'Turnier', Event: 'Event' } }, { k: 'date', t: 'date', l: 'Datum' }, { k: 'time', t: 'time', l: 'Uhrzeit' }, { k: 'desc', t: 'textarea', l: 'Beschreibung' }, { k: 'price', t: 'text', l: 'Preis' }, { k: 'spots', t: 'number', l: 'Plätze' }, { k: 'booked', t: 'number', l: 'Angemeldet' }, { k: 'image', t: 'image', l: 'Bild' }] },
    challenges: { label: 'Challenges', icon: '♛', title: c => `${c.icon || '🏆'} ${c.month} · ${c.title} (${(c.entries || []).length})`, sort: (a, b) => b.month.localeCompare(a.month),
      item: () => ({ month: new Date().toISOString().slice(0, 7), title: 'Neue Challenge', icon: '🏆', category: '', desc: '', metric: 'Wert', format: 'number', unit: '', sort: 'desc', entries: [] }),
      fields: [{ k: 'title', t: 'text', l: 'Titel' }, { k: 'icon', t: 'text', l: 'Icon (Emoji)', list: ['🔥', '🏃', '🏋️', '💪', '⛓️', '⏱️', '⛳', '🚴', '🥇', '❤️'] }, { k: 'category', t: 'text', l: 'Kategorie', list: ['Kraft', 'Ausdauer', 'Fitness', 'Golf', 'HYROX'] }, { k: 'month', t: 'month', l: 'Monat' }, { k: 'desc', t: 'textarea', l: 'Beschreibung / Regeln' }, { k: 'metric', t: 'text', l: 'Messgröße (z. B. Gewicht, Zeit, Wdh.)' }, { k: 'format', t: 'select', l: 'Wert-Format', o: { number: 'Zahl', time: 'Zeit (Wert in Sekunden → mm:ss)' } }, { k: 'unit', t: 'text', l: 'Einheit (bei Zahl, z. B. kg)' }, { k: 'sort', t: 'select', l: 'Sortierung', o: { desc: 'Höher ist besser', asc: 'Niedriger ist besser (z. B. Zeit)' } },
        { k: 'entries', t: 'list', l: 'Ergebnisse', item: { name: 'Name', value: 0 }, fields: [{ k: 'name', t: 'text', l: 'Name' }, { k: 'value', t: 'number', l: 'Wert (bei Zeit: Sekunden, z. B. 5400 = 1:30:00)' }] }] },
    products: { label: 'Produkte', icon: '🛒', title: c => `${c.name}${c.active === false ? ' (inaktiv)' : ''}${c.soldOut ? ' · ausverkauft' : ''}`,
      item: () => ({ name: 'Neues Produkt', category: 'Protein', price: 0, unit: '', image: '', desc: '', variants: '', badge: '', active: true, soldOut: false }),
      fields: [{ k: 'name', t: 'text', l: 'Name' }, { k: 'category', t: 'text', l: 'Kategorie', list: ['Protein', 'Supplements', 'Equipment'] }, { k: 'price', t: 'number', l: 'Preis (€)', h: 'Brutto, z. B. 34.9' }, { k: 'unit', t: 'text', l: 'Einheit (z. B. 1 kg)' }, { k: 'image', t: 'image', l: 'Bild' }, { k: 'desc', t: 'textarea', l: 'Beschreibung' }, { k: 'variants', t: 'textarea', l: 'Varianten', h: 'Eine pro Zeile, z. B. Schoko. Leer = keine Auswahl.' }, { k: 'badge', t: 'text', l: 'Badge (z. B. Bestseller)' }, { k: 'active', t: 'toggle', l: 'Im Shop sichtbar' }, { k: 'soldOut', t: 'toggle', l: 'Ausverkauft' }] }
  };

  const forms = { label: 'Formulare', item: () => ({ id: 'formular-' + Date.now().toString(36), name: 'Neues Formular', recipients: '', subjects: [], fields: { phone: true, company: false, employees: false, date: false, message: true }, submitLabel: 'Absenden', successText: 'Danke!', autoReply: '' }),
    fields: [{ k: 'name', t: 'text', l: 'Name (intern)' }, { k: 'recipients', t: 'text', l: 'E-Mail-Empfänger', h: 'Mehrere mit Komma trennen' }, { k: 'subjects', t: 'strings', l: 'Betreff-Auswahl' }, { k: 'fields.phone', t: 'toggle', l: 'Feld: Telefon' }, { k: 'fields.company', t: 'toggle', l: 'Feld: Unternehmen' }, { k: 'fields.employees', t: 'toggle', l: 'Feld: Mitarbeitende' }, { k: 'fields.date', t: 'toggle', l: 'Feld: Wunschtermin' }, { k: 'fields.message', t: 'toggle', l: 'Feld: Nachricht' }, { k: 'submitLabel', t: 'text', l: 'Button-Text' }, { k: 'successText', t: 'textarea', l: 'Danke-Text' }, { k: 'autoReply', t: 'textarea', l: 'Automatische Antwort an Absender*in' }] };

  return { blocks, collections, forms, cats: ['Basis', 'Training', 'Shop', 'Vertrauen', 'Golf', 'Social', 'Kontakt'] };
})();
