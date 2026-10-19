/* MPT Demo-Modus: bildet die JSON-API aus server.py im Browser nach (für GitHub Pages, ohne Server).
 * Aktiv nur auf *.github.io oder mit ?demo=1 (wird in sessionStorage gemerkt, ?demo=0 schaltet ab).
 * Sonst passiert nichts. Zustand: localStorage "mpt-demo-state" (Fallback: Arbeitsspeicher), Start aus demo/seed.json.
 * Antwortformate, Statuscodes und Fehlertexte folgen server.py. Passwörter werden in der Demo im Klartext verglichen. */
(function () {
  'use strict';
  const KEY = 'mpt-demo-state', AUTH = 'mpt-demo-auth', FLAG = 'mpt-demo';
  const store = k => { try { return window[k]; } catch { return null; } };
  const sget = (s, k) => { try { return s && s.getItem(k); } catch { return null; } };
  const sset = (s, k, v) => { try { s.setItem(k, v); return true; } catch { return false; } };
  const sdel = (s, k) => { try { s && s.removeItem(k); } catch { } };
  const LS = store('localStorage'), SS = store('sessionStorage');

  const q = new URLSearchParams(location.search).get('demo');
  if (q === '0') sdel(SS, FLAG);
  else if (q === '1') sset(SS, FLAG, '1');
  const active = q !== '0' && (location.hostname.endsWith('.github.io') || sget(SS, FLAG) === '1');
  if (!active) return;

  /* ---------- Basis & Asset-Pfade ---------- */
  const SRC = (document.currentScript && document.currentScript.src) || location.href;
  const BASE = new URL('../', SRC).pathname;                 // z. B. "/MPT/" bzw. "/" lokal
  const PFX = BASE.replace(/\/$/, '');                       // "/MPT" bzw. ""
  const isAsset = s => typeof s === 'string' && s.startsWith('/assets/');
  const fixStr = s => (PFX && isAsset(s) ? PFX + s : s);
  const unfixStr = s => (PFX && typeof s === 'string' && s.startsWith(PFX + '/assets/') ? s.slice(PFX.length) : s);
  const walk = (v, f) => Array.isArray(v) ? v.map(x => walk(x, f)) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, f)])) : f(v);
  const assets = o => walk(o, fixStr);       // /assets/… -> <Basis>/assets/…
  const unassets = o => walk(o, unfixStr);   // <Basis>/assets/… -> /assets/… (beim Speichern)
  window.MPT_DEMO = { active: true, base: BASE, assets, asset: fixStr };

  /* ---------- Hilfen ---------- */
  class ApiError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
  const clone = o => JSON.parse(JSON.stringify(o));
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const nowIso = () => { const d = new Date(); return `${isoOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const uid = p => `${p}_${Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('')}`;
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const by = (...f) => (a, b) => { for (const g of f) { const c = cmp(g(a), g(b)); if (c) return c; } return 0; };
  const str = v => (v == null ? '' : String(v));
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const num = v => {
    if (typeof v === 'boolean') return null;
    if (typeof v === 'string') { const t = v.trim().replace(',', '.'); if (t === '' || isNaN(Number(t))) return null; v = Number(t); }
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const int = v => Math.trunc(v);
  const round2 = x => Math.round(x * 100) / 100;
  const parseDate = (s, what = 'Datum') => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    const d = m && new Date(+m[1], +m[2] - 1, +m[3]);
    if (!d || d.getMonth() !== +m[2] - 1) throw new ApiError(`${what} ungültig (erwartet JJJJ-MM-TT).`);
    return d;
  };
  const cleanDate = (v, what, required) => { v = str(v).trim(); if (!v) { if (required) throw new ApiError(`${what} fehlt.`); return ''; } return isoOf(parseDate(v, what)); };
  const validEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 200;
  const splitRcpt = s => str(s).split(/[,;\s]+/).map(r => r.trim()).filter(Boolean);

  /* ---------- Zustand (localStorage, Fallback Arbeitsspeicher) ---------- */
  let mem = null, seedP = null;
  function load() {
    const raw = sget(LS, KEY);
    if (raw) { try { return JSON.parse(raw); } catch { } }
    return mem;
  }
  function save(s) { mem = s; if (!sset(LS, KEY, JSON.stringify(s))) { /* Quota/Privatmodus: nur im Speicher */ } }
  function build(seed) {
    // Buchungsdaten auf ganze Wochen verschoben: Wochentage stimmen, alles liegt in den nächsten 1–14 Tagen.
    const ref = midnight(parseDate(seed.refDate, 'refDate'));
    const shift = Math.ceil(Math.round((midnight(new Date()) - ref) / 864e5) / 7) * 7;
    const s = clone(seed);
    s.bookings = (seed.bookings || []).map(b => ({ ...b, date: isoOf(addDays(parseDate(b.date), shift)) }));
    s.members = (seed.members || []).map(m => { const { demoPw, ...r } = m; return demoPw ? { ...r, pw: 'mpt-demo-2026' } : r; });
    s.admin = { user: (seed.admin && seed.admin.user) || 'admin', pass: 'admin', default: false };
    s.uploads = [];
    s.orders = seed.orders || { orders: [], seq: 1000 };
    s.inbox = seed.inbox || [];
    delete s.refDate;
    return s;
  }
  function ready() {
    if (load()) return Promise.resolve();
    seedP = seedP || _fetch(BASE + 'demo/seed.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('seed'); return r.json(); })
      .then(seed => { if (!load()) save(build(seed)); }).finally(() => { seedP = null; });
    return seedP;
  }

  /* ---------- Sitzungen (statt Cookies; geteilt über Tabs) ---------- */
  const auth = () => { try { return JSON.parse(sget(LS, AUTH) || '{}'); } catch { return {}; } };
  const setAuth = a => { if (!sset(LS, AUTH, JSON.stringify(a))) mem && (mem._auth = a); };
  const getAuth = () => { const a = auth(); return Object.keys(a).length ? a : (mem && mem._auth) || {}; };
  const ADMIN_TTL = 12 * 3600e3, MEMBER_TTL = 14 * 24 * 3600e3;
  const fails = { admin: [], member: [] }, orderHits = [];
  const isAdmin = () => { const a = getAuth().admin; if (a && a.exp > Date.now()) { setAuth({ ...getAuth(), admin: { exp: Date.now() + ADMIN_TTL } }); return true; } return false; };
  function memberId(S) {
    const m = getAuth().member;
    if (m && m.exp > Date.now()) { const x = S.members.find(y => y.id === m.id); if (x && x.active !== false) return m.id; }
    return null;
  }

  /* ---------- Kurse & Buchung (Port von server.py) ---------- */
  const courses = site => ((site.collections || {}).courses) || [];
  const findCourse = (site, id) => courses(site).find(c => c.id === id);
  const cday = co => { const n = parseInt(co.day, 10); return Number.isNaN(n) ? -1 : n; };
  const spotsOf = co => int(num(co.spots) || 0);
  const courseStart = (co, d) => { const [h, m] = str(co.start || '00:00').split(':'); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +h || 0, +m || 0); };
  const bkStart = b => { const d = parseDate(b.date); const [h, m] = str(b.start || '00:00').split(':'); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +h || 0, +m || 0); };
  const isClosed = (site, iso) => ((((site.settings || {}).hours || {}).exceptions) || []).some(e => e.date === iso && e.closed);
  const countStatus = (bks, cid, iso, st = 'booked') => bks.filter(b => b.courseId === cid && b.date === iso && b.status === st).length;
  function bookingCfg(site) {
    const c = ((site.settings || {}).booking) || {}, ch = num(c.cancelHours);
    return { weeksAhead: int(num(c.weeksAhead) || 8), maxSeries: int(num(c.maxSeries) || 12), cancelHours: ch === null ? 12 : ch, recipients: splitRcpt(c.recipients) };
  }
  function makeBookings(site, bks, co, d0, weeks, person, byWho, admin) {
    const cfg = bookingCfg(site), now = new Date();
    if (cday(co) !== d0.getDay()) throw new ApiError('Der Kurs findet an diesem Wochentag nicht statt.');
    if (!(weeks >= 1 && weeks <= cfg.maxSeries)) throw new ApiError(`Die Serie darf 1 bis ${cfg.maxSeries} Wochen umfassen.`);
    if (!admin) {
      if (courseStart(co, d0) <= now) throw new ApiError('Dieser Termin liegt in der Vergangenheit.');
      if (d0 > addDays(midnight(now), 7 * cfg.weeksAhead)) throw new ApiError(`Buchungen sind höchstens ${cfg.weeksAhead} Wochen im Voraus möglich.`);
    }
    const series = weeks > 1 ? uid('s') : null, spots = spotsOf(co), created = [], skipped = [];
    for (let i = 0; i < weeks; i++) {
      const iso = isoOf(addDays(d0, 7 * i));
      if (isClosed(site, iso)) { skipped.push({ date: iso, reason: 'Studio geschlossen' }); continue; }
      const dup = bks.some(b => b.courseId === co.id && b.date === iso && b.status !== 'cancelled' && (person.memberId
        ? b.memberId === person.memberId : (!b.memberId && str(b.name).toLowerCase() === person.name.toLowerCase())));
      if (dup) { skipped.push({ date: iso, reason: 'bereits gebucht' }); continue; }
      const full = countStatus(bks, co.id, iso) >= spots && !admin;
      const b = { id: uid('bk'), courseId: co.id, date: iso, start: co.start || '', title: co.title || '', memberId: person.memberId,
        name: person.name, email: person.email, status: full ? 'waitlist' : 'booked', seriesId: series, createdAt: nowIso(), cancelledAt: null, by: byWho };
      bks.push(b); created.push({ id: b.id, date: iso, status: b.status });
    }
    return { created, skipped };
  }
  function promote(site, bks, cid, iso, skip) {
    const co = findCourse(site, cid); if (!co) return;
    const spots = spotsOf(co);
    while (countStatus(bks, cid, iso) < spots) {
      const w = bks.filter(b => b.courseId === cid && b.date === iso && b.status === 'waitlist' && b !== skip)
        .sort(by(b => b.createdAt, b => bks.indexOf(b)))[0];
      if (!w) return;
      w.status = 'booked';
    }
  }
  function cancelOne(site, bks, b) { b.status = 'cancelled'; b.cancelledAt = nowIso(); promote(site, bks, b.courseId, b.date); }

  /* ---------- Kunden ---------- */
  const memberView = m => {
    const { pw, invite, ...v } = m;
    v.hasPassword = !!pw;
    v.invitePending = !!(invite && invite.exp > Date.now() / 1000);
    return v;
  };
  const findMember = (members, id) => members.find(m => m.id === id);
  const newPassword = v => { v = str(v); if (v.length < 8) throw new ApiError('Das Passwort braucht mindestens 8 Zeichen.'); return v; };
  function inviteMember(members, tok) {
    tok = str(tok);
    const m = members.find(x => x.invite && x.invite.token === tok && x.invite.exp > Date.now() / 1000 && x.active !== false);
    if (!m) throw new ApiError('Einladung ungültig oder abgelaufen');
    return m;
  }
  function cleanPlans(plans) {
    if (!Array.isArray(plans)) throw new ApiError('Pläne ungültig.');
    return plans.map(p0 => {
      if (!isObj(p0)) throw new ApiError('Plan ungültig.');
      const p = { ...p0 };
      p.id = str(p.id || uid('pl')); p.title = str(p.title).trim().slice(0, 120) || 'Plan';
      p.status = p.status === 'done' ? 'done' : 'active';
      p.start = cleanDate(p.start, 'Plan-Start'); p.end = cleanDate(p.end, 'Plan-Ende') || null;
      for (const k of ['goal', 'note']) p[k] = str(p[k]).slice(0, 2000);
      p.days = (p.days || []).map(d0 => {
        if (!isObj(d0)) throw new ApiError('Plan-Tag ungültig.');
        const dd = { ...d0 }; dd.id = str(dd.id || uid('d')); dd.name = str(dd.name).slice(0, 120);
        dd.exercises = (dd.exercises || []).map(e0 => {
          if (!isObj(e0)) throw new ApiError('Übung ungültig.');
          const e = { ...e0 }; e.id = str(e.id || uid('e'));
          for (const k of ['group', 'name', 'reps', 'tempo', 'note']) e[k] = str(e[k]).slice(0, 200);
          e.sets = int(num(e.sets) || 0); e.rest = int(num(e.rest) || 0);
          return e;
        });
        return dd;
      });
      const dayIds = new Set(p.days.map(d => d.id));
      p.logs = (p.logs || []).map(l0 => {
        if (!isObj(l0) || (l0.sets !== undefined && !isObj(l0.sets))) throw new ApiError('Training ungültig.');
        const lg = { ...l0 }; lg.id = str(lg.id || uid('lg')); lg.note = str(lg.note).slice(0, 2000);
        lg.date = cleanDate(lg.date, 'Trainingsdatum', true);
        if (!dayIds.has(lg.dayId)) throw new ApiError('Training verweist auf einen unbekannten Tag.');
        const sets = {};
        for (const [eid, rows] of Object.entries(lg.sets || {})) {
          if (!Array.isArray(rows)) throw new ApiError('Sätze ungültig.');
          sets[String(eid)] = rows.map(r => (!isObj(r) || (num(r.reps) === null && num(r.kg) === null) ? null : { reps: num(r.reps), kg: num(r.kg) }));
        }
        lg.sets = sets;
        return lg;
      });
      return p;
    });
  }
  function cleanMeasurements(ms) {
    if (!Array.isArray(ms)) throw new ApiError('Messungen ungültig.');
    return ms.map(m => {
      if (!isObj(m)) throw new ApiError('Messung ungültig.');
      const r = { id: str(m.id || uid('ms')), date: cleanDate(m.date, 'Messdatum', true), weight: num(m.weight), bodyfat: num(m.bodyfat), note: str(m.note).slice(0, 2000) };
      for (const k of ['skinfolds', 'girths']) {
        const src = isObj(m[k]) ? m[k] : {};
        r[k] = Object.fromEntries(Object.entries(src).filter(([, b]) => num(b) !== null).map(([a, b]) => [a.slice(0, 40), num(b)]));
      }
      return r;
    });
  }

  /* ---------- Routen ---------- */
  // Kontext c: { S: Zustand, q: Query, d: Body, mid, force }. Rückgabe: Objekt (200) oder { __status, body }.
  const R = {};
  R['GET /api/slots'] = c => {
    const site = c.S.site, cfg = bookingCfg(site), now = new Date(), today = midnight(now);
    const d0 = parseDate(c.q.get('from') || isoOf(today), 'Startdatum');
    let days = c.q.get('days') || 14; days = /^\s*[+-]?\d+\s*$/.test(String(days)) ? parseInt(days, 10) : NaN;
    if (Number.isNaN(days)) throw new ApiError('days muss eine Zahl sein.');
    days = Math.max(1, Math.min(days, 70));
    const cnt = {};
    for (const b of c.S.bookings) if (b.status === 'booked' || b.status === 'waitlist') {
      const k = b.courseId + '|' + b.date; (cnt[k] = cnt[k] || { booked: 0, waitlist: 0 })[b.status]++;
    }
    const cs = [...courses(site)].sort(by(x => x.start || ''));
    const limit = addDays(today, 7 * cfg.weeksAhead), slots = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(d0, i), iso = isoOf(d);
      for (const co of cs) {
        if (cday(co) !== d.getDay()) continue;
        const n = cnt[co.id + '|' + iso] || { booked: 0, waitlist: 0 }, past = courseStart(co, d) <= now, closed = isClosed(site, iso);
        slots.push({ courseId: co.id, date: iso, start: co.start || '', spots: spotsOf(co), booked: n.booked, waitlist: n.waitlist,
          past, closed, bookable: !past && d <= limit && !closed });
      }
    }
    return { slots };
  };
  R['POST /api/order'] = c => {
    const d = c.d, now = Date.now();
    const hits = orderHits.filter(t => t > now - 600e3);
    if (hits.length >= 10) throw new ApiError('Zu viele Bestellungen. Bitte später erneut versuchen.', 429);
    const cust = isObj(d.customer) ? d.customer : {};
    const name = str(cust.name).trim().slice(0, 120), email = str(cust.email).trim().slice(0, 200);
    if (!name) throw new ApiError('Bitte gib deinen Namen an.');
    if (!validEmail(email)) throw new ApiError('Bitte gib eine gültige E-Mail-Adresse an.');
    if (d.consent !== true) throw new ApiError('Bitte stimme der Datenschutzerklärung zu.');
    const raw = d.items;
    if (!Array.isArray(raw) || !raw.length || raw.length > 50) throw new ApiError('Der Warenkorb ist leer.');
    const prods = Object.fromEntries((((c.S.site.collections || {}).products) || []).map(p => [p.id, p]));
    const merged = new Map();
    for (const it of raw) {
      if (!isObj(it)) throw new ApiError('Ungültige Position.');
      const p = prods[it.productId];
      if (!p || p.active === false) throw new ApiError('Ein Produkt ist nicht (mehr) verfügbar.');
      if (p.soldOut) throw new ApiError(`„${p.name}“ ist leider ausverkauft.`);
      const variants = str(p.variants).split('\n').map(v => v.trim()).filter(Boolean);
      let v = str(it.variant).trim();
      if (variants.length && !variants.includes(v)) throw new ApiError(`Bitte wähle eine gültige Variante für „${p.name}“.`);
      if (!variants.length) v = '';
      const qn = num(it.qty);
      if (qn === null || int(qn) !== qn || qn < 1) throw new ApiError('Ungültige Menge.');
      const k = p.id + '\u0000' + v; merged.set(k, (merged.get(k) || 0) + int(qn));
    }
    const items = [];
    for (const [k, qn] of merged) {
      if (qn > 20) throw new ApiError('Pro Produkt sind maximal 20 Stück je Bestellung möglich.');
      const [pid, v] = k.split('\u0000'), p = prods[pid], price = round2(num(p.price) || 0);
      items.push({ productId: pid, name: p.name || '', variant: v, qty: qn, price, sum: round2(price * qn) });
    }
    const total = round2(items.reduce((s, i) => s + i.sum, 0));
    const db = c.S.orders;
    const used = db.orders.map(o => /^MPT-(\d+)$/.exec(str(o.no))).filter(Boolean).map(m => +m[1]);
    const seq = Math.max(int(num(db.seq) || 1000), ...used) + 1;
    db.seq = seq;
    const order = { id: uid('o'), no: `MPT-${seq}`, createdAt: nowIso(), status: 'neu',
      customer: { name, email, phone: str(cust.phone).trim().slice(0, 60), note: str(cust.note).trim().slice(0, 1000) }, items, total, mailed: false };
    db.orders.push(order); orderHits.splice(0, orderHits.length, ...hits, now); c.dirty = true;
    return { ok: true, no: order.no, total };
  };
  R['POST /api/member/login'] = async c => {
    const now = Date.now(), recent = fails.member.filter(t => t > now - 300e3);
    if (recent.length >= 5) throw new ApiError('Zu viele Fehlversuche. Bitte 5 Minuten warten.', 429);
    const email = str(c.d.email).trim().toLowerCase();
    const m = c.S.members.find(x => str(x.email).toLowerCase() === email);
    if (!(m && m.pw && m.pw === str(c.d.pass ?? '') && m.active !== false)) {
      fails.member = [...recent, now]; await new Promise(r => setTimeout(r, 500));
      throw new ApiError('E-Mail oder Passwort falsch.', 401);
    }
    fails.member = []; setAuth({ ...getAuth(), member: { id: m.id, exp: now + MEMBER_TTL } });
    return { ok: true };
  };
  R['POST /api/member/logout'] = () => { const a = getAuth(); delete a.member; setAuth(a); return { ok: true }; };
  R['GET /api/member/invite'] = c => { const m = inviteMember(c.S.members, c.q.get('token')); return { name: m.name, email: m.email }; };
  R['POST /api/member/activate'] = c => {
    const pw = newPassword(c.d.pass), m = inviteMember(c.S.members, c.d.token);
    m.pw = pw; delete m.invite; c.dirty = true;
    setAuth({ ...getAuth(), member: { id: m.id, exp: Date.now() + MEMBER_TTL } });
    return { ok: true };
  };
  R['GET /api/member/me'] = c => {
    const m = findMember(c.S.members, c.mid), since = isoOf(addDays(midnight(new Date()), -60)), v = memberView(m);
    v.bookings = c.S.bookings.filter(b => b.memberId === m.id && b.date >= since).sort(by(b => b.date, b => b.start || ''));
    return v;
  };
  R['POST /api/member/book'] = c => {
    const site = c.S.site, co = findCourse(site, c.d.courseId);
    if (!co) throw new ApiError('Kurs unbekannt.', 404);
    const d0 = parseDate(c.d.date), w = num('weeks' in c.d ? c.d.weeks : 1);
    if (w === null || int(w) !== w) throw new ApiError('Ungültige Anzahl Wochen.');
    const m = findMember(c.S.members, c.mid);
    const { created, skipped } = makeBookings(site, c.S.bookings, co, d0, int(w), { memberId: m.id, name: m.name, email: m.email }, 'member');
    if (created.length) c.dirty = true;
    return { ok: true, created, skipped };
  };
  R['POST /api/member/cancel'] = c => {
    const site = c.S.site, cfg = bookingCfg(site), now = new Date(), bks = c.S.bookings;
    const b = bks.find(x => x.id === c.d.id && x.memberId === c.mid);
    if (!b || b.status === 'cancelled') throw new ApiError('Buchung nicht gefunden.', 404);
    const okCancel = x => x.status !== 'cancelled' && bkStart(x) - now >= cfg.cancelHours * 3600e3;
    const targets = c.d.series === true && b.seriesId
      ? bks.filter(x => x.seriesId === b.seriesId && x.memberId === c.mid && bkStart(x) > now && okCancel(x))
      : (okCancel(b) ? [b] : []);
    if (!targets.length) throw new ApiError(`Stornieren ist nur bis ${cfg.cancelHours} Stunden vor Kursbeginn möglich. Bitte melde dich direkt beim Studio.`);
    targets.forEach(x => cancelOne(site, bks, x)); c.dirty = true;
    return { ok: true, cancelled: targets.length };
  };
  R['POST /api/member/password'] = c => {
    const pw = newPassword(c.d.new), m = findMember(c.S.members, c.mid);
    if (!(m && m.pw && m.pw === str(c.d.current ?? ''))) throw new ApiError('Aktuelles Passwort ist falsch.');
    m.pw = pw; c.dirty = true; return { ok: true };
  };

  R['GET /api/admin/members'] = c => c.S.members.map(m => {
    const v = memberView(m), plans = m.plans || [], ms = [...(m.measurements || [])].sort(by(x => x.date || ''));
    const logs = plans.flatMap(p => (p.logs || []).map(lg => [lg.date || '', p.title || '']));
    const last = logs.sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1])).pop();
    return { id: m.id, name: m.name, email: m.email, phone: m.phone || '', active: m.active !== false, hasPassword: v.hasPassword, invitePending: v.invitePending,
      activePlans: plans.filter(p => p.status !== 'done').length, donePlans: plans.filter(p => p.status === 'done').length,
      lastMeasurement: ms.length ? { date: ms[ms.length - 1].date, weight: ms[ms.length - 1].weight, bodyfat: ms[ms.length - 1].bodyfat } : null,
      lastLog: last ? { date: last[0], planTitle: last[1] } : null };
  }).sort(by(x => x.name.toLowerCase()));
  R['GET /api/admin/member'] = c => {
    const m = findMember(c.S.members, c.q.get('id'));
    if (!m) throw new ApiError('Kunde nicht gefunden.', 404);
    return memberView(m);
  };
  R['POST /api/admin/member'] = c => {
    const src = c.d.member;
    if (!isObj(src)) throw new ApiError('Kundendaten fehlen.');
    const name = str(src.name).trim().slice(0, 120), email = str(src.email).trim();
    if (!name) throw new ApiError('Name fehlt.');
    if (!validEmail(email)) throw new ApiError('Bitte gib eine gültige E-Mail-Adresse an.');
    const plans = 'plans' in src ? cleanPlans(src.plans) : null, ms = 'measurements' in src ? cleanMeasurements(src.measurements) : null;
    const old = src.id ? findMember(c.S.members, src.id) : null;
    if (src.id && !old) throw new ApiError('Kunde nicht gefunden.', 404);
    if (c.S.members.some(x => str(x.email).toLowerCase() === email.toLowerCase() && x !== old)) throw new ApiError('Diese E-Mail ist bereits vergeben.');
    const m = old || { id: uid('m'), createdAt: nowIso(), plans: [], measurements: [] };
    Object.assign(m, { name, email, phone: str(src.phone).trim().slice(0, 60), active: src.active !== false, notes: str(src.notes).slice(0, 4000) });
    if (plans !== null) m.plans = plans;
    if (ms !== null) m.measurements = ms;
    if (!old) c.S.members.push(m);
    c.dirty = true; return memberView(m);
  };
  R['POST /api/admin/member/delete'] = c => {
    const m = findMember(c.S.members, c.d.id);
    if (!m) throw new ApiError('Kunde nicht gefunden.', 404);
    c.S.members.splice(c.S.members.indexOf(m), 1);
    c.S.bookings.forEach(b => { if (b.memberId === m.id) b.memberId = null; });
    c.dirty = true; return { ok: true };
  };
  R['POST /api/admin/member/invite'] = c => {
    const m = findMember(c.S.members, c.d.id);
    if (!m) throw new ApiError('Kunde nicht gefunden.', 404);
    m.invite = { token: token(), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 };
    c.dirty = true;
    return { ok: true, link: `${BASE}?invite=${m.invite.token}#/mitglieder`, expires: m.invite.exp, mailed: false };
  };
  R['GET /api/admin/bookings'] = c => {
    const lo = cleanDate(c.q.get('from'), 'from'), hi = cleanDate(c.q.get('to'), 'to');
    return { bookings: c.S.bookings.filter(b => (!lo || b.date >= lo) && (!hi || b.date <= hi)).sort(by(b => b.date, b => b.start || '', b => b.createdAt)) };
  };
  R['POST /api/admin/bookings'] = c => {
    const d = c.d, act = d.action;
    if (!['create', 'cancel', 'status'].includes(act)) throw new ApiError('Unbekannte Aktion.');
    const site = c.S.site, bks = c.S.bookings;
    if (act === 'create') {
      const co = findCourse(site, d.courseId);
      if (!co) throw new ApiError('Kurs unbekannt.', 404);
      let person;
      if (d.memberId) {
        const m = findMember(c.S.members, d.memberId);
        if (!m) throw new ApiError('Kunde nicht gefunden.', 404);
        person = { memberId: m.id, name: m.name, email: m.email };
      } else {
        const name = str(d.name).trim().slice(0, 120);
        if (!name) throw new ApiError('Name fehlt.');
        person = { memberId: null, name, email: str(d.email).trim().slice(0, 200) };
      }
      const w = num('weeks' in d ? d.weeks : 1);
      if (w === null || int(w) !== w) throw new ApiError('Ungültige Anzahl Wochen.');
      const { created, skipped } = makeBookings(site, bks, co, parseDate(d.date), int(w), person, 'admin', true);
      if (created.length) c.dirty = true;
      return { ok: true, created, skipped };
    }
    const b = bks.find(x => x.id === d.id);
    if (!b) throw new ApiError('Buchung nicht gefunden.', 404);
    const status = act === 'cancel' ? 'cancelled' : d.status;
    if (!['booked', 'waitlist', 'cancelled'].includes(status)) throw new ApiError('Ungültiger Status.');
    const was = b.status; b.status = status; b.cancelledAt = status === 'cancelled' ? nowIso() : null;
    if (was === 'booked' && status !== 'booked') promote(site, bks, b.courseId, b.date, b);
    c.dirty = true; return { ok: true, booking: b };
  };
  R['GET /api/admin/orders'] = c => ({ orders: [...c.S.orders.orders].sort((a, b) => cmp(b.createdAt, a.createdAt) || cmp(b.no, a.no)) });
  R['POST /api/admin/orders'] = c => {
    const db = c.S.orders, o = db.orders.find(x => x.id === c.d.id);
    if (!o) throw new ApiError('Bestellung nicht gefunden.', 404);
    if (c.d.delete) db.orders.splice(db.orders.indexOf(o), 1);
    else if (['neu', 'bereit', 'abgeholt', 'storniert'].includes(c.d.status)) o.status = c.d.status;
    else throw new ApiError('Ungültiger Status.');
    c.dirty = true; return { ok: true };
  };

  const OPEN_POST = new Set(['POST /api/order', 'POST /api/member/login', 'POST /api/member/logout', 'POST /api/member/activate']);
  const OPEN_GET = new Set(['GET /api/slots', 'GET /api/member/invite']);
  const MEMBER_ROUTES = new Set(['GET /api/member/me', 'POST /api/member/book', 'POST /api/member/cancel', 'POST /api/member/password']);
  const PROTECTED = ['/api/images', '/api/inbox', '/api/upload', '/api/password', '/api/admin/'];
  const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];

  async function handle(method, path, query, body, rawUrl) {
    await ready();
    const S = load(), c = { S, q: query, d: body, dirty: false, mid: null };
    const json = (o, status = 200) => ({ status, body: o });
    const done = o => { if (c.dirty || c.siteDirty) save(S); return o; };
    const key = `${method} ${path}`;
    if (method === 'GET' && PROTECTED.some(p => path.startsWith(p)) && !isAdmin()) return json({ error: 'Nicht angemeldet' }, 401);

    if (method === 'POST') {
      if (path === '/api/login') {
        const now = Date.now(), recent = fails.admin.filter(t => t > now - 300e3);
        if (recent.length >= 5) return json({ error: 'Zu viele Fehlversuche. Bitte 5 Minuten warten.' }, 429);
        if (!(str(body.user) === S.admin.user && str(body.pass) === S.admin.pass)) {
          fails.admin = [...recent, now]; await new Promise(r => setTimeout(r, 500));
          return json({ error: 'Benutzername oder Passwort falsch.' }, 401);
        }
        fails.admin = []; setAuth({ ...getAuth(), admin: { exp: now + ADMIN_TTL } }); return json({ ok: true });
      }
      if (path === '/api/logout') { const a = getAuth(); delete a.admin; setAuth(a); return json('', 200); }
    }
    const fn = R[key];
    if (fn) {
      if (method === 'POST' && !isObj(body)) return json({ error: 'Ungültige Anfrage' }, 400);
      if (path.startsWith('/api/admin/') && !isAdmin()) return json({ error: 'Nicht angemeldet' }, 401);
      if (MEMBER_ROUTES.has(key)) { c.mid = memberId(S); if (!c.mid) return json({ error: 'Bitte melde dich an.' }, 401); }
      try { const res = await fn(c); return done(json(res)); }
      catch (e) { if (e instanceof ApiError) return json({ error: e.message }, e.status); console.error(e); return json({ error: 'Interner Fehler' }, 500); }
    }
    if (method === 'POST' && path !== '/api/contact' && !isAdmin()) return json({ error: 'Nicht angemeldet' }, 401);

    if (key === 'GET /api/me') {
      if (!isAdmin()) return json({ error: 'Nicht angemeldet' }, 401);
      return json({ user: S.admin.user, defaultPassword: !!S.admin.default });
    }
    if (key === 'GET /api/site') { const site = clone(S.site); if (site.collections) delete site.collections.members; return json(assets(site)); }
    if (key === 'GET /api/images') return json(assets([...(S.images || []), ...S.uploads]));
    if (key === 'GET /api/inbox') return json(S.inbox);
    if (key === 'POST /api/password') {
      if (str(body.current) !== S.admin.pass) return json({ error: 'Aktuelles Passwort ist falsch.' }, 400);
      const user = str(body.user || S.admin.user).trim(), pw = str(body.new);
      if (pw.length < 8) return json({ error: 'Neues Passwort braucht mindestens 8 Zeichen.' }, 400);
      if (!user) return json({ error: 'Benutzername fehlt.' }, 400);
      S.admin = { user, pass: pw, default: false }; save(S); return json({ ok: true });
    }
    if (key === 'POST /api/site') {
      if (!isObj(body) || !('pages' in body)) return json({ error: 'ungültige Inhalte' }, 400);
      const cur = S.site._rev || 0;
      if (!c.q.has('force') && (body._rev || 0) !== cur) return json({ error: 'conflict', rev: cur }, 409);
      const site = unassets(body); site._rev = cur + 1;
      if (isObj(site.collections)) delete site.collections.members;
      S.site = site; save(S); return json({ ok: true, rev: site._rev, savedAt: Date.now() / 1000 });
    }
    if (key === 'POST /api/upload') {
      const name = str(body.name || 'bild').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
      const dot = name.lastIndexOf('.'), ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
      if (!IMG_EXT.includes(ext)) return json({ error: 'Nur Bilddateien erlaubt' }, 400);
      let raw = str(body.data); const comma = raw.indexOf(',');
      const url = raw.startsWith('data:') ? raw : `data:image/${ext === '.svg' ? 'svg+xml' : ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)};base64,${raw}`;
      raw = raw.startsWith('data:') ? raw.slice(comma + 1) : raw;
      if (raw.length * 0.75 > 8 * 1024 * 1024) return json({ error: 'Maximal 8 MB' }, 400);
      S.uploads.push(url); save(S); return json({ url });
    }
    if (key === 'POST /api/contact') {
      const form = (S.site.forms || []).find(f => f.id === body.formId);
      if (!form) return json({ error: 'Formular unbekannt' }, 400);
      const fields = Object.fromEntries(Object.entries(body.fields || {}).map(([k, v]) => [k.slice(0, 60), str(v).slice(0, 4000)]));
      const recipients = splitRcpt(form.recipients);
      S.inbox.unshift({ id: token().slice(0, 10), createdAt: nowIso(), formId: form.id, formName: form.name || form.id, recipients, fields, status: 'neu', mailed: false });
      save(S); return json({ ok: true, recipients });
    }
    if (key === 'POST /api/inbox') {
      if (body.delete) S.inbox = S.inbox.filter(i => i.id !== body.id);
      else S.inbox.forEach(i => { if (i.id === body.id) i.status = body.status ?? i.status; });
      save(S); return json({ ok: true });
    }
    return json({ error: 'not found' }, 404);
  }

  /* ---------- fetch-Mock ---------- */
  const _fetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    let u;
    try { u = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href); } catch { return _fetch(input, init); }
    let path = u.pathname;
    if (PFX && path.startsWith(PFX + '/api/')) path = path.slice(PFX.length);
    if (u.origin !== location.origin || !path.startsWith('/api/') || typeof input !== 'string' && !(input instanceof URL)) return _fetch(input, init);
    const method = String((init && init.method) || 'GET').toUpperCase();
    let body = {};
    if (init && typeof init.body === 'string' && init.body) { try { body = JSON.parse(init.body); } catch { return reply({ status: 400, body: { error: 'Expecting value' } }); } }
    let res;
    try { res = await handle(method, path, u.searchParams, body, u.href); }
    catch (e) { console.error('[demo]', e); res = { status: 500, body: { error: 'Interner Fehler' } }; }
    return reply(res);
  };
  const reply = r => new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  /* ---------- Hinweis-Badge ---------- */
  function badge() {
    if (window.top !== window || document.getElementById('mpt-demo-badge')) return;
    const st = document.createElement('style');
    st.textContent = '#mpt-demo-badge{position:fixed;left:12px;bottom:12px;z-index:2147483000;max-width:calc(100vw - 24px);display:flex;flex-wrap:wrap;gap:2px 8px;align-items:center;'
      + 'background:rgba(22,22,26,.92);color:#b8b8c2;border:1px solid #34343c;border-radius:999px;padding:6px 12px;font:500 12px/1.4 Inter,system-ui,sans-serif;backdrop-filter:blur(6px);box-shadow:0 4px 18px rgba(0,0,0,.35)}'
      + '#mpt-demo-badge button{background:none;border:0;padding:0;color:#f2611d;font:inherit;font-weight:600;text-decoration:underline;text-underline-offset:2px;cursor:pointer}'
      + '#mpt-demo-badge button:hover{color:#f4f4f6}#mpt-demo-badge button:focus-visible{outline:2px solid #f2611d;outline-offset:2px;border-radius:4px}'
      + '@media (max-width:640px){#mpt-demo-badge{bottom:80px;font-size:12px;padding:6px 10px}}'
      + '@media print{#mpt-demo-badge{display:none}}';
    const el = document.createElement('div');
    el.id = 'mpt-demo-badge'; el.setAttribute('role', 'note');
    el.innerHTML = '<span>Demo-Modus · Daten nur in deinem Browser ·</span><button type="button">Zurücksetzen</button>';
    el.querySelector('button').onclick = () => {
      [KEY, AUTH, 'mpt-admin-draft'].forEach(k => sdel(LS, k)); mem = null; location.reload();
    };
    document.head.appendChild(st); document.body.appendChild(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', badge); else badge();
})();
