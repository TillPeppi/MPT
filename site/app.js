/* MPT Website-Renderer: rendert Seiten aus data/site.json (Seiten → Blöcke → Varianten).
   ?edit=1 schaltet den Editier-Modus für die Admin-Vorschau ein (Inline-Text, Bild-Drop, Block-Leiste). */
(function () {
  'use strict';
  const EDIT = new URLSearchParams(location.search).has('edit');
  if (EDIT) document.documentElement.classList.add('edit');

  let S = null;            // Site-Konfiguration
  let META = {};           // Block-Labels aus dem Admin
  let editPageId = null;   // im Editor gewählte Seite
  let selected = null;
  const app = document.getElementById('app');
  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const DAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  /* ---------- Helfer ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function rich(s) {
    return esc(s).replace(/&amp;shy;/g, '&shy;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<span class="acc">$1</span>')
      .replace(/\n/g, '<br>');
  }
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  const ed = path => (EDIT ? ` data-e="${esc(path)}"` : '');
  const im = path => (EDIT ? ` data-img="${esc(path)}"` : '');
  const bg = url => (url ? ` style="background-image:url('${esc(url)}')"` : '');
  const T = (tag, path, val, cls = '') => (val || EDIT) && (val !== undefined) ? `<${tag}${cls ? ` class="${cls}"` : ''}${ed(path)}>${rich(val)}</${tag}>` : '';
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
  const fmtDate = s => { const d = new Date(s + 'T12:00'); return isNaN(d) ? s : `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const col = name => (S.collections && S.collections[name]) || [];
  const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  function head(p, bid, extraCls = '') {
    if (!p.eyebrow && !p.title && !p.text && !EDIT) return '';
    return `<div class="section-head reveal ${extraCls}"><div>${T('span', `b:${bid}:eyebrow`, p.eyebrow ?? '', 'eyebrow')}
      ${T('h2', `b:${bid}:title`, p.title ?? '', 'display')}</div>${T('p', `b:${bid}:text`, p.text ?? '')}</div>`;
  }
  function btn(label, href, cls, path) {
    if (!label && !EDIT) return '';
    if (!label) return '';
    return `<a class="btn ${cls}" href="${esc(href || '#')}"${ed(path)}>${esc(label)}</a>`;
  }

  /* ---------- Öffnungszeiten & Live-Status ---------- */
  function rangesFor(date) {
    const h = S.settings.hours || {};
    const ex = (h.exceptions || []).find(e => e.date === iso(date));
    if (ex) return { ranges: ex.closed ? [] : [[ex.from || '00:00', ex.to || '00:00']], note: ex.note, exception: true };
    return { ranges: (h.week || {})[date.getDay()] || [] };
  }
  function liveStatus(now = new Date()) {
    const cur = now.getHours() * 60 + now.getMinutes();
    const today = rangesFor(now);
    const open = today.ranges.find(r => cur >= toMin(r[0]) && cur < toMin(r[1]));
    if (open) return { open: true, title: `Jetzt geöffnet · bis ${open[1]} Uhr`, sub: today.note || 'Gruppentraining' };
    for (let i = 0; i < 8; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const r = rangesFor(d).ranges.find(r => i > 0 || toMin(r[0]) > cur);
      if (r) return { open: false, title: 'Gerade geschlossen', sub: `Öffnet ${i === 0 ? 'heute' : i === 1 ? 'morgen' : DAYS_LONG[d.getDay()]} um ${r[0]} Uhr${today.exception && today.note ? ' · ' + today.note : ''}` };
    }
    return { open: false, title: 'Gerade geschlossen', sub: '' };
  }
  function statusHTML(cls = '') {
    const s = liveStatus();
    return `<div class="status-badge ${s.open ? '' : 'closed'} ${cls}" data-status><div class="dot"></div><div><b>${esc(s.title)}</b><span>${esc(s.sub)}</span></div></div>`;
  }
  function weekRows() {
    const w = (S.settings.hours || {}).week || {};
    const order = [1, 2, 3, 4, 5, 6, 0];
    const fmt = d => (w[d] || []).map(r => `${r[0]} – ${r[1]}`).join(', ') || 'Geschlossen';
    const groups = [];
    order.forEach(d => { const v = fmt(d); const g = groups[groups.length - 1]; if (g && g.v === v) g.days.push(d); else groups.push({ v, days: [d] }); });
    return groups.map(g => ({ label: g.days.length > 1 ? `${DAYS[g.days[0]]} – ${DAYS[g.days[g.days.length - 1]]}` : DAYS_LONG[g.days[0]], value: g.v, days: g.days }));
  }
  function upcomingExceptions() {
    const t = iso(new Date());
    return ((S.settings.hours || {}).exceptions || []).filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  }
  function hoursTable() {
    const today = new Date().getDay();
    return `<div class="hours-table">${weekRows().map(r => `<div class="${r.days.includes(today) ? 'today' : ''}"><span>${r.label}</span><span>${esc(r.value)}</span></div>`).join('')}
      ${S.settings.hours.note ? `<small>${esc(S.settings.hours.note)}</small>` : ''}
      ${upcomingExceptions().map(e => `<p class="exc">⚠ ${fmtDate(e.date)}: ${e.closed ? 'geschlossen' : `${e.from}–${e.to}`}${e.note ? ' · ' + esc(e.note) : ''}</p>`).join('')}</div>`;
  }

  /* ---------- Formulare ---------- */
  function formHTML(fid, preset = {}) {
    const f = (S.forms || []).find(x => x.id === fid) || (S.forms || [])[0];
    if (!f) return '<div class="empty">Kein Formular angelegt.</div>';
    const fl = f.fields || {};
    const subjects = [...(preset.subject ? [preset.subject] : []), ...(f.subjects || [])];
    return `<form class="form" data-form="${esc(f.id)}" novalidate>
      <div class="row"><div><label>Name *</label><input name="Name" required autocomplete="name"></div>
      ${fl.phone ? '<div><label>Telefon</label><input name="Telefon" type="tel" autocomplete="tel"></div>' : '<div></div>'}</div>
      <label>E-Mail *</label><input name="E-Mail" type="email" required autocomplete="email">
      ${fl.company || fl.employees ? `<div class="row">${fl.company ? '<div><label>Unternehmen</label><input name="Unternehmen" autocomplete="organization"></div>' : ''}${fl.employees ? '<div><label>Anzahl Mitarbeitende</label><select name="Mitarbeitende"><option>1–10</option><option>11–50</option><option>51–200</option><option>200+</option></select></div>' : ''}</div>` : ''}
      ${fl.date ? '<div class="row"><div><label>Wunschtermin</label><input name="Wunschtermin" type="date"></div><div><label>Uhrzeit</label><input name="Uhrzeit" type="time"></div></div>' : ''}
      ${subjects.length ? `<label>Betreff</label><select name="Betreff">${subjects.map(s => `<option>${esc(s)}</option>`).join('')}</select>` : ''}
      ${fl.message !== false ? '<label>Nachricht</label><textarea name="Nachricht" placeholder="Erzähl uns kurz von deinen Zielen …"></textarea>' : ''}
      <label class="consent"><input type="checkbox" name="Datenschutz" required> Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzerklärung zu.</label>
      <button class="btn btn-primary" type="submit">${esc(f.submitLabel || 'Absenden')} →</button><p class="err" hidden></p></form>`;
  }
  async function submitForm(form) {
    const err = form.querySelector('.err');
    if (EDIT) { err.hidden = false; err.textContent = 'Im Editor deaktiviert. Teste das Formular in der Live-Ansicht.'; return; }
    if (!form.checkValidity()) { err.hidden = false; err.textContent = 'Bitte Name, E-Mail und Datenschutz ausfüllen.'; form.reportValidity(); return; }
    const fields = {}; new FormData(form).forEach((v, k) => { if (k !== 'Datenschutz') fields[k] = v; });
    const f = S.forms.find(x => x.id === form.dataset.form) || {};
    const btnEl = form.querySelector('button[type=submit]'); btnEl.disabled = true;
    let note = '';
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formId: form.dataset.form, fields }) });
      if (!r.ok) throw new Error();
    } catch { note = '<p class="note">(Demo ohne Server: Anfrage wurde nicht gespeichert.)</p>'; }
    form.innerHTML = `<div class="ok"><h3>Danke!</h3><p>${esc(f.successText || 'Wir melden uns bei dir.')}</p>${note}</div>`;
  }

  /* ---------- API & Format ---------- */
  const cfg = k => (S.settings && S.settings[k]) || {};
  const eur = n => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: cfg('shop').currency || 'EUR' });
  const nf = (v, d = 1) => (v == null || v === '' || isNaN(v)) ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: d });
  const wd = s => DAYS[new Date(s + 'T12:00').getDay()];
  const wdLong = s => DAYS_LONG[new Date(s + 'T12:00').getDay()];
  const shortDate = d => `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
  const dMY = s => { const [, m, d] = String(s).split('-'); return `${d}.${m}.`; };
  const mondayOf = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const endOf = c => c.end || `${pad((Math.floor(toMin(c.start) / 60) + 1) % 24)}:${pad(toMin(c.start) % 60)}`;
  async function api(path, body) {
    let r;
    try { r = await fetch(path, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { throw new Error('Keine Verbindung zum Server. Bitte versuche es gleich noch einmal.'); }
    let j = {}; try { j = await r.json(); } catch { }
    if (!r.ok) { const e = new Error(j.error || `Der Server hat nicht wie erwartet geantwortet (Status ${r.status}).`); e.status = r.status; throw e; }
    return j;
  }
  const showMsg = (el, text, ok) => { if (!el) return; el.hidden = !text; el.textContent = text || ''; el.className = ok ? 'okmsg' : 'err'; };


  /* ---------- Modal ---------- */
  let lastFocus = null;
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function openLayer(m) {
    if (!m.classList.contains('open')) lastFocus = document.activeElement;
    m.classList.add('open'); document.body.classList.add('noscroll');
    const box = m.querySelector('.box'); box.tabIndex = -1;
    (box.querySelector('input:not([type=radio]):not([type=checkbox]):not([type=number]),select,textarea,.btn') || box).focus({ preventScroll: true });
  }
  function closeLayer(m) {
    m.classList.remove('open');
    if (!document.querySelector('.modal.open')) document.body.classList.remove('noscroll');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', e => {
    const open = [...document.querySelectorAll('.modal.open')].pop(); if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLayer(open); }
    else if (e.key === 'Tab') {
      const f = [...open.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null); if (!f.length) return;
      const box = open.querySelector('.box');
      if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === box)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('click', e => { if (e.target.closest('[data-cart-open]')) openCart(); });
  function modal(title, text, inner) {
    let m = document.getElementById('modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('.x,[data-close]')) closeLayer(m); });
      m.addEventListener('submit', e => {
        const f = e.target;
        if (f.matches('[data-book]')) { e.preventDefault(); doBook(f); }
        else if (f.matches('[data-mlogin]')) { e.preventDefault(); doLogin(f); }
      });
    }
    m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="x" aria-label="Schließen">×</button><div class="mh"><h3 id="modal-title">${esc(title)}</h3><p>${esc(text)}</p></div>${inner}</div>`;
    openLayer(m);
    return m;
  }

  /* ---------- Kunde: Session ---------- */
  let ME = null;             // eingeloggter Kunde, ausschließlich aus /api/member/me
  let memberTab = 'overview';
  async function loadMe() { if (EDIT) return; try { ME = await api('/api/member/me'); } catch { ME = null; } }
  const firstName = m => String((m && m.name) || '').trim().split(/\s+/)[0] || '';
  function updateHeader() {
    const l = ME ? firstName(ME) : (cfg('header').memberLabel || 'Mitglieder');
    document.querySelectorAll('[data-memberbtn]').forEach(el => { el.textContent = l; });
  }
  function loginFormHTML(attrs = '', btnLabel = 'Einloggen →') {
    return `<form class="form login-f" data-mlogin ${attrs} novalidate><label for="ml-e">E-Mail-Adresse</label><input id="ml-e" name="email" type="email" required autocomplete="email" placeholder="du@beispiel.de">
      <label for="ml-p">Passwort</label><input id="ml-p" name="pass" type="password" required autocomplete="current-password">
      <button class="btn btn-primary" type="submit" style="width:100%">${btnLabel}</button><p class="err" role="alert" hidden></p>
      <p class="hint"><button type="button" class="linkbtn" data-forgot>Passwort vergessen?</button></p><p class="hint" data-forgot-text hidden>Melde dich beim Studio, du bekommst einen neuen Link.</p></form>`;
  }
  async function doLogin(form) {
    const err = form.querySelector('.err'), fail = t => showMsg(err, t);
    if (EDIT) return fail('Im Editor deaktiviert. Teste den Login in der Live-Ansicht.');
    const email = form.elements.email.value.trim(), pass = form.elements.pass.value;
    if (!email || !pass) return fail('Bitte E-Mail-Adresse und Passwort eingeben.');
    const b = form.querySelector('button[type=submit]'); b.disabled = true; showMsg(err, '');
    try { await api('/api/member/login', { email, pass }); await loadMe(); }
    catch (e) { b.disabled = false; return fail(e.message); }
    if (!ME) { b.disabled = false; return fail('Anmeldung fehlgeschlagen. Bitte versuche es erneut.'); }
    updateHeader();
    if (form.closest('#modal') && BK) openBooking(BK); else render(true);
  }
  async function logout() {
    try { await api('/api/member/logout', {}); } catch { }
    ME = null; memberTab = 'overview'; updateHeader(); render(true);
  }

  /* ---------- Warenkorb ---------- */
  const cartKey = 'mpt-cart';
  let CART = (() => { try { const c = JSON.parse(localStorage.getItem(cartKey) || '[]'); return Array.isArray(c) ? c.filter(i => i && i.productId && i.qty > 0) : []; } catch { return []; } })();
  const saveCart = () => { try { localStorage.setItem(cartKey, JSON.stringify(CART)); } catch { } updateCartUI(); };
  const lineKey = i => i.productId + '|' + (i.variant || '');
  const clampQty = n => Math.max(1, Math.min(20, Math.round(Number(n)) || 1));
  // Positionen mit aktuellen Produktdaten aus site.json (nicht mehr verfügbare fallen heraus)
  function cartLines() {
    return CART.map(i => { const p = col('products').find(x => x.id === i.productId); if (!p || p.active === false || p.soldOut) return null; return { ...i, key: lineKey(i), p, sum: Math.round(Number(p.price) * i.qty * 100) / 100 }; }).filter(Boolean);
  }
  const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);
  function addToCart(productId, variant, qty) {
    const it = CART.find(i => lineKey(i) === lineKey({ productId, variant }));
    if (it) it.qty = clampQty(it.qty + qty); else CART.push({ productId, variant: variant || '', qty: clampQty(qty) });
    saveCart();
  }
  function updateCartUI() {
    const n = EDIT ? 0 : cartCount();
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = n; });
    document.querySelectorAll('.cart-ico,.cart-fab').forEach(el => { el.setAttribute('aria-label', `Warenkorb öffnen, ${n} Artikel`); });
    document.querySelectorAll('.cart-ico').forEach(el => { el.hidden = !n; });
    document.querySelectorAll('.cart-fab').forEach(el => { el.hidden = !n || !document.querySelector('[data-shop]'); });
  }
  let cartDone = null;
  function cartInner(view) {
    const lns = cartLines(), total = lns.reduce((s, l) => s + l.sum, 0), note = cfg('shop').pickupNote || '';
    if (view === 'done') return `<div class="mh"><h3>Danke!</h3><p>Deine Bestellung ist eingegangen.</p></div><div class="cart-body"><div class="order-ok"><span>Bestellnummer</span><b>${esc(cartDone.no)}</b><span>Summe ${esc(eur(cartDone.total))}</span></div>
      <p class="note">${esc(note)} Wir melden uns bei dir, sobald die Ware zur Abholung bereitliegt.</p><button class="btn btn-primary" data-close style="width:100%;margin-top:18px">Weiter stöbern</button></div>`;
    if (!lns.length) return `<div class="mh"><h3>Warenkorb</h3><p>Noch nichts drin.</p></div><div class="cart-body"><p class="note">Dein Warenkorb ist leer. Such dir im Shop etwas aus.</p><button class="btn btn-ghost" data-close style="margin-top:14px">Weiter stöbern</button></div>`;
    const list = lns.map(l => `<div class="cl"><div class="ci"><b>${esc(l.p.name)}</b><small>${l.variant ? esc(l.variant) + ' · ' : ''}${esc(l.p.unit || '')} · ${esc(eur(l.p.price))}</small></div>
      <div class="qty"><button type="button" data-cq="-1" data-k="${esc(l.key)}" aria-label="Menge verringern">−</button><span aria-label="Menge">${l.qty}</span><button type="button" data-cq="1" data-k="${esc(l.key)}" aria-label="Menge erhöhen">+</button></div>
      <b class="ls">${esc(eur(l.sum))}</b><button type="button" class="crm" data-crm="${esc(l.key)}" aria-label="${esc(l.p.name)} entfernen">×</button></div>`).join('');
    const sum = `<div class="ct"><span>Summe</span><b>${esc(eur(total))}</b></div>`;
    if (view === 'checkout') {
      const m = ME || {};
      return `<div class="mh"><h3>Bestellen</h3><p>${esc(note)}</p></div><div class="cart-body"><div class="cl-list compact">${list}</div>${sum}
        <form class="form" data-order novalidate><label for="o-n">Name *</label><input id="o-n" name="name" required autocomplete="name" value="${esc(m.name || '')}">
        <label for="o-e">E-Mail *</label><input id="o-e" name="email" type="email" required autocomplete="email" value="${esc(m.email || '')}">
        <label for="o-t">Telefon</label><input id="o-t" name="phone" type="tel" autocomplete="tel" value="${esc(m.phone || '')}">
        <label for="o-m">Notiz</label><textarea id="o-m" name="note" placeholder="z. B. Wunsch-Abholzeit" style="min-height:80px"></textarea>
        <label class="consent"><input type="checkbox" name="consent" required> Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzerklärung zu.</label>
        <button class="btn btn-primary" type="submit" style="width:100%">Verbindlich bestellen →</button><p class="err" role="alert" hidden></p>
        <button type="button" class="linkbtn" data-cview="list" style="margin-top:12px">← Zurück zum Warenkorb</button></form></div>`;
    }
    return `<div class="mh"><h3>Warenkorb</h3><p>${cartCount()} Artikel</p></div><div class="cart-body"><div class="cl-list">${list}</div>${sum}<p class="note">${esc(note)}</p>
      <button class="btn btn-primary" data-cview="checkout" style="width:100%;margin-top:18px">Zur Kasse →</button></div>`;
  }
  function openCart(view = 'list') {
    let m = document.getElementById('cart');
    if (!m) {
      m = document.createElement('div'); m.id = 'cart'; m.className = 'modal side'; document.body.appendChild(m);
      const paint = v => { const keep = m.querySelector('.box'); const top = keep ? keep.scrollTop : 0; m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="Warenkorb"><button class="x" aria-label="Schließen">×</button>${cartInner(v)}</div>`; m.dataset.view = v; m.querySelector('.box').scrollTop = top; };
      m._paint = paint;
      m.addEventListener('click', e => {
        const t = e.target;
        if (t === m || t.closest('.x,[data-close]')) return closeLayer(m);
        const v = t.closest('[data-cview]'); if (v) { paint(v.dataset.cview); openLayer(m); return; }
        const q = t.closest('[data-cq]'); if (q) { const it = CART.find(i => lineKey(i) === q.dataset.k); if (it) { it.qty = clampQty(it.qty + Number(q.dataset.cq)); saveCart(); paint(m.dataset.view); (m.querySelector(`[data-cq="${q.dataset.cq}"][data-k="${CSS.escape(q.dataset.k)}"]`) || m.querySelector('.x')).focus(); } return; }
        const r = t.closest('[data-crm]'); if (r) { CART = CART.filter(i => lineKey(i) !== r.dataset.crm); saveCart(); paint(m.dataset.view); (m.querySelector('[data-cq]') || m.querySelector('.x,[data-close]')).focus(); }
      });
      m.addEventListener('submit', e => { if (e.target.matches('[data-order]')) { e.preventDefault(); doOrder(e.target, m); } });
    }
    m._paint(view); openLayer(m);
  }
  async function doOrder(form, m) {
    const err = form.querySelector('.err'), fail = t => showMsg(err, t);
    if (EDIT) return fail('Im Editor deaktiviert. Teste die Bestellung in der Live-Ansicht.');
    if (!form.checkValidity()) { fail('Bitte Name, E-Mail-Adresse und Datenschutz ausfüllen.'); form.reportValidity(); return; }
    const lns = cartLines(); if (!lns.length) return fail('Dein Warenkorb ist leer.');
    const f = form.elements, b = form.querySelector('button[type=submit]'); b.disabled = true; showMsg(err, '');
    try {
      const r = await api('/api/order', { items: lns.map(l => ({ productId: l.productId, variant: l.variant || '', qty: l.qty })), customer: { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), note: f.note.value.trim() }, consent: true });
      CART = []; saveCart(); cartDone = { no: r.no, total: r.total }; m._paint('done'); openLayer(m);
    } catch (e) { b.disabled = false; fail(e.message); }
  }

  /* ---------- Blöcke ---------- */
  const R = {};

  R.hero = (b, p) => {
    const id = b.id, v = b.variant;
    const ctas = `${btn(p.cta1Label, p.cta1Href, 'btn-primary', `b:${id}:cta1Label`)}${btn(p.cta2Label, p.cta2Href, 'btn-ghost', `b:${id}:cta2Label`)}`;
    if (v === 'split') return `<div class="hero hero-split"><div class="wrap grid"><div>${T('span', `b:${id}:eyebrow`, p.eyebrow, 'eyebrow')}
      ${T('h1', `b:${id}:title`, p.title, 'display')}${T('p', `b:${id}:text`, p.text, 'lead')}<div class="hero-actions">${ctas}</div>${p.showStatus ? `<div style="margin-top:28px">${statusHTML()}</div>` : ''}</div>
      <div class="img ${p.image ? '' : 'ph-img'}"${bg(p.image)}${im(`b:${id}:image`)}>${p.image ? '' : 'Bild hier ablegen'}</div></div></div>`;
    if (v === 'poster') {
      const ls = String(p.title || '').split('\n');
      const h = ls.map((l, i) => `<span style="display:block${i % 2 ? ';text-align:right' : ''}"${i === 0 ? ' class="outline"' : ''}>${rich(l)}</span>`).join('');
      return `<div class="hero hero-poster"${im(`b:${id}:image`)}><div class="wrap" style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:center">
        <div class="photo"${bg(p.image)}></div><h1 class="display"${ed(`b:${id}:title`)}>${h}</h1></div>
        <div class="wrap"><div class="foot">${T('p', `b:${id}:text`, p.text, 'lead')}${p.showStatus ? statusHTML() : '<span></span>'}<div class="hero-actions" style="margin:0">${ctas}</div></div></div></div>`;
    }
    if (v === 'compact') return `<div class="hero hero-compact"${im(`b:${id}:image`)}><div class="hero-bg"${bg(p.image)}></div><div class="wrap">
      ${T('span', `b:${id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h1', `b:${id}:title`, p.title, 'display')}<div class="hero-row">${T('p', `b:${id}:text`, p.text, 'lead')}${p.showStatus ? statusHTML() : ''}</div>
      ${ctas ? `<div class="hero-actions">${ctas}</div>` : ''}</div></div>`;
    return `<div class="hero hero-fullbleed"${im(`b:${id}:image`)}><div class="hero-bg"${bg(p.image)}></div><div class="wrap">
      ${T('span', `b:${id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h1', `b:${id}:title`, p.title, 'display')}
      <div class="hero-row"><div>${T('p', `b:${id}:text`, p.text, 'lead')}<div class="hero-actions">${ctas}</div></div>${p.showStatus ? statusHTML() : ''}</div></div></div>`;
  };

  R.marquee = (b, p) => {
    const items = (p.items || []).map(t => `<span>${esc(t)}</span>`).join('');
    return `<div class="marquee ${b.variant === 'tilted' ? 'tilted' : ''}" aria-hidden="true"><div class="marquee-track">${items}${items}</div></div>`;
  };

  R.usp = (b, p) => {
    const items = p.items || [];
    if (b.variant === 'list') return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="usp-list reveal">${items.map((it, i) => `<div class="row usp"><span class="num">${pad(i + 1)}</span>
      ${T('h3', `b:${b.id}:items.${i}.title`, it.title)}${T('p', `b:${b.id}:items.${i}.text`, it.text)}</div>`).join('')}</div></div></div>`;
    return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="usp-grid reveal">${items.map((it, i) => `<div class="usp"><div class="num">${pad(i + 1)}</div>
      ${T('h3', `b:${b.id}:items.${i}.title`, it.title)}${T('p', `b:${b.id}:items.${i}.text`, it.text)}</div>`).join('')}</div></div></div>`;
  };

  R.offers = (b, p) => {
    const items = (p.items || []).map((it, i) => `<a href="${esc(it.href || '#kontakt')}" class="offer ${it.image ? 'img' : ''}"${it.image ? ` style="--img:url('${esc(it.image)}')"` : ''}${im(`b:${b.id}:items.${i}.image`)}>
      ${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}${T('h3', `b:${b.id}:items.${i}.title`, it.title)}${T('p', `b:${b.id}:items.${i}.text`, it.text)}
      <div class="meta"><span${ed(`b:${b.id}:items.${i}.meta`)}>${esc(it.meta)}</span><span class="arrow">→</span></div></a>`).join('');
    const tags = (p.tags || []).length ? `<div class="chips">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '';
    return `<div class="sec alt"><div class="wrap">${head(p, b.id)}<div class="${b.variant === 'cards' ? 'offer-cards' : 'offer-grid'} reveal">${items}</div>${tags}</div></div>`;
  };

  /* ---------- Kursplan mit Live-Belegung ---------- */
  // Belegung für einen Termin: echte Daten aus /api/slots, sonst Fallback spots - booked
  function slotOf(st, c, date) {
    const sl = st.slots && st.slots[c.id + '|' + date];
    if (sl) return sl;
    const past = !EDIT && new Date(`${date}T${c.start}`) <= new Date();
    return { spots: c.spots, booked: Math.min(c.spots, c.booked || 0), waitlist: 0, past, bookable: !past };
  }
  function courseCard(c, date, sl, agenda) {
    const free = Math.max(0, sl.spots - sl.booked), full = free === 0, off = sl.past || !sl.bookable;
    const label = sl.past ? 'vorbei' : !sl.bookable ? 'nicht buchbar' : full ? 'ausgebucht · Warteliste' : `${free} frei`;
    const cls = `${full && !off ? 'full' : ''} ${off ? 'off' : ''}`;
    const attrs = `data-course="${esc(c.id)}" data-date="${date}" data-cat="${esc(c.category)}" ${off ? 'disabled' : ''}`;
    if (agenda) return `<button class="course ${cls}" ${attrs}><span class="t">${esc(c.start)} – ${esc(endOf(c))}</span><b>${esc(c.title)}</b><span class="s">${esc(c.trainer)} · ${esc(c.category)}</span>
      <span class="lab">${esc(label)}</span><span class="spots" aria-hidden="true">${Array.from({ length: sl.spots }, (_, i) => `<i class="${i < sl.booked ? 'f' : ''}"></i>`).join('')}</span></button>`;
    return `<button class="course ${cls}" ${attrs}><span class="t">${esc(c.start)} – ${esc(endOf(c))}</span><b${ed(`c:courses:${c.id}:title`)}>${esc(c.title)}</b>
      <span class="s"><span>${esc(c.trainer)}</span>${full && !off ? `<em>${label}</em>` : `<span>${label}</span>`}</span></button>`;
  }
  function schedBody(st, p, variant) {
    const days = (p.days && p.days.length ? p.days : [1, 2, 3, 4, 5]).map(Number);
    const all = col('courses').filter(c => (!p.category || c.category === p.category) && (!st.cat || c.category === st.cat));
    const mon = addDays(mondayOf(new Date()), st.wk * 7), dateOf = d => iso(addDays(mon, (d + 6) % 7));
    const byDay = d => all.filter(c => Number(c.day) === d).sort((a, z) => toMin(a.start) - toMin(z.start));
    const todayIso = iso(new Date());
    if (variant === 'agenda') {
      const first = days.includes(st.day) ? st.day : (st.wk === 0 && days.includes(new Date().getDay()) ? new Date().getDay() : days[0]);
      st.day = first;
      return `<div class="agenda-tabs">${days.map(d => `<button data-day="${d}" class="${d === first ? 'on' : ''}" aria-pressed="${d === first}">${DAYS[d]}<small>${shortDate(addDays(mon, (d + 6) % 7))}</small></button>`).join('')}</div>
        <div class="agenda-list">${byDay(first).map(c => courseCard(c, dateOf(first), slotOf(st, c, dateOf(first)), true)).join('') || '<div class="empty">Keine Kurse an diesem Tag.</div>'}</div>`;
    }
    return `<div class="week" style="--cols:${days.length}">${days.map(d => { const date = dateOf(d); return `<div class="day ${date === todayIso ? 'today' : ''}"><h4>${DAYS[d]}<small>${date === todayIso ? 'Heute' : shortDate(addDays(mon, (d + 6) % 7))}</small></h4>
      ${byDay(d).map(c => courseCard(c, date, slotOf(st, c, date))).join('') || '<span class="note">Keine Kurse</span>'}</div>`; }).join('')}</div>`;
  }
  R.schedule = (b, p) => {
    const all = col('courses').filter(c => !p.category || c.category === p.category);
    const cats = [...new Set(all.map(c => c.category).filter(Boolean))];
    const filter = cats.length > 1 ? `<div class="sched-filter" role="group" aria-label="Kategorie"><button class="on" data-cat="" aria-pressed="true">Alle</button>${cats.map(c => `<button data-cat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>` : '';
    return `<div class="sec" id="kursplan"><div class="wrap">${head(p, b.id)}<div class="reveal" data-schedule data-form="${esc(p.formId || 'probetraining')}">
      <div class="sched-nav"><button class="btn btn-ghost btn-sm" data-wk="0">Diese Woche</button><div class="wk"><button data-wk="-1" aria-label="Vorherige Woche">‹</button><b data-wklabel aria-live="polite"></b><button data-wk="1" aria-label="Nächste Woche">›</button></div></div>
      ${filter}<p class="note" data-snote hidden></p><div data-sbody></div></div></div></div>`;
  };
  function initSchedule(s) {
    const blk = findBlock(s.closest('.blk')?.dataset.bid) || { props: {}, variant: 'week' };
    const p = blk.props || {}, st = { wk: 0, cat: '', day: null, slots: null, seq: 0 };
    const body = s.querySelector('[data-sbody]'), note = s.querySelector('[data-snote]');
    const maxW = Math.max(0, (Number(cfg('booking').weeksAhead) || 8) - 1);
    const paint = () => {
      body.innerHTML = schedBody(st, p, blk.variant);
      const mon = addDays(mondayOf(new Date()), st.wk * 7), sun = addDays(mon, 6);
      s.querySelector('[data-wklabel]').textContent = `${shortDate(mon)} – ${shortDate(sun)} ${sun.getFullYear()}`;
      s.querySelector('[data-wk="-1"]').disabled = st.wk <= 0; s.querySelector('[data-wk="1"]').disabled = st.wk >= maxW;
    };
    const load = async () => {
      const first = !body.innerHTML; if (first) paint();
      if (EDIT) return;
      const seq = ++st.seq, mon = addDays(mondayOf(new Date()), st.wk * 7);
      body.classList.add('loading'); body.setAttribute('aria-busy', 'true');
      try {
        const r = await api(`/api/slots?from=${iso(mon)}&days=7`); if (seq !== st.seq) return;
        st.slots = {}; (r.slots || []).forEach(x => { st.slots[x.courseId + '|' + x.date] = x; }); showMsg(note, '');
      } catch { if (seq !== st.seq) return; st.slots = null; showMsg(note, 'Die Live-Belegung ist gerade nicht erreichbar. Die Platzangaben sind ohne Gewähr.'); note.className = 'note'; }
      body.classList.remove('loading'); body.removeAttribute('aria-busy'); paint();
    };
    s.addEventListener('click', e => {
      const t = e.target;
      const w = t.closest('[data-wk]'); if (w) { if (w.disabled) return; st.wk = w.dataset.wk === '0' ? 0 : Math.max(0, Math.min(maxW, st.wk + Number(w.dataset.wk))); st.day = null; s.querySelector('[data-wklabel]').textContent = '…'; load(); return; }
      const f = t.closest('.sched-filter button'); if (f) { st.cat = f.dataset.cat; s.querySelectorAll('.sched-filter button').forEach(x => { x.classList.toggle('on', x === f); x.setAttribute('aria-pressed', x === f); }); paint(); return; }
      const d = t.closest('.agenda-tabs button'); if (d) { st.day = Number(d.dataset.day); paint(); return; }
      const cb = t.closest('[data-course]'); if (cb && !cb.disabled) {
        if (EDIT && t.closest('[data-e]')) return;
        const c = col('courses').find(x => x.id === cb.dataset.course); if (!c) return;
        openBooking({ c, date: cb.dataset.date, sl: slotOf(st, c, cb.dataset.date), formId: s.dataset.form, reload: load });
      }
    });
    load();
  }

  /* ---------- Buchungs-Modal ---------- */
  let BK = null;   // Kontext des geöffneten Buchungs-Modals
  function openBooking(ctx) {
    BK = ctx; const { c, date, sl } = ctx, free = Math.max(0, sl.spots - sl.booked), bkc = cfg('booking');
    const info = `${wdLong(date)}, ${fmtDate(date)} · ${c.start} – ${endOf(c)} Uhr · ${c.trainer} · ${free > 0 ? free + ' Plätze frei' : 'ausgebucht, Warteliste'}`;
    ctx.title = c.title; ctx.info = info;
    const maxS = Number(bkc.maxSeries) || 12;
    let inner;
    if (ME) inner = `<form class="form book" data-book novalidate>
      <p class="who">Gebucht wird für <b>${esc(ME.name)}</b></p>
      <fieldset><legend class="sr">Buchungsart</legend>
      <label class="opt"><input type="radio" name="mode" value="once" checked><span>Nur diesen Termin</span></label>
      <label class="opt"><input type="radio" name="mode" value="series"><span>Jede Woche · <input type="number" name="weeks" min="2" max="${maxS}" value="${Math.min(4, maxS)}" aria-label="Anzahl Wochen"> Wochen</span></label></fieldset>
      ${free > 0 ? '' : '<p class="note warn">Dieser Termin ist ausgebucht. Du kommst auf die Warteliste und rückst automatisch nach, sobald ein Platz frei wird.</p>'}
      <p class="note">Stornieren ist bis ${esc(bkc.cancelHours ?? 12)} Stunden vor Kursbeginn möglich.</p>
      <button class="btn btn-primary" type="submit" style="width:100%;margin-top:14px">${free > 0 ? 'Verbindlich buchen' : 'Auf die Warteliste'} →</button><p class="err" role="alert" hidden></p></form>`;
    else inner = `<div class="bk-login"><p class="note" style="margin:0 0 14px">Melde dich an, um diesen Termin zu buchen.</p>${loginFormHTML('', 'Einloggen und weiter →')}</div>
      <div class="trial"><h4>Noch kein Mitglied? Probetraining anfragen</h4>${formHTML(ctx.formId, { subject: `Probetraining: ${c.title}, ${wdLong(date)} ${fmtDate(date)} ${c.start} Uhr${free > 0 ? '' : ' (Warteliste)'}` })}</div>`;
    const m = modal(c.title, info, inner);
    bindForms(m);
    return m;
  }
  async function doBook(form) {
    const err = form.querySelector('.err'), fail = t => showMsg(err, t);
    if (EDIT) return fail('Im Editor deaktiviert. Teste die Buchung in der Live-Ansicht.');
    const f = form.elements, series = f.mode.value === 'series', max = Number(cfg('booking').maxSeries) || 12;
    const weeks = series ? Math.round(Number(f.weeks.value)) : 1;
    if (series && !(weeks >= 2 && weeks <= max)) return fail(`Bitte eine Anzahl zwischen 2 und ${max} Wochen wählen.`);
    const b = form.querySelector('button[type=submit]'); b.disabled = true; showMsg(err, '');
    try {
      const r = await api('/api/member/book', { courseId: BK.c.id, date: BK.date, weeks });
      const created = r.created || [], skipped = r.skipped || [];
      const li = (d, cls, txt) => `<li class="${cls}"><b>${wd(d)}, ${fmtDate(d)}</b><span>${esc(txt)}</span></li>`;
      const list = created.map(x => li(x.date, x.status === 'waitlist' ? 'wl' : 'ok', x.status === 'waitlist' ? 'Warteliste' : 'gebucht')).concat(skipped.map(x => li(x.date, 'skip', `übersprungen · ${x.reason || ''}`))).join('');
      const head = created.length ? (created.some(x => x.status === 'waitlist') ? 'Fast geschafft' : 'Gebucht!') : 'Nichts gebucht';
      const m = modal(BK.title, BK.info, `<div class="book-res"><h4>${head}</h4><ul>${list}</ul><div class="act"><a class="btn btn-primary" href="#/mitglieder" data-close>Meine Buchungen</a><button class="btn btn-ghost" data-close>Schließen</button></div></div>`);
      m.querySelector('a[data-close]').addEventListener('click', () => { memberTab = 'bookings'; });
      loadMe().then(() => { if (BK && BK.reload) BK.reload(); });
    } catch (e) {
      b.disabled = false;
      if (e.status === 401) { ME = null; updateHeader(); openBooking(BK); showMsg(document.querySelector('#modal .login-f .err'), 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'); }
      else fail(e.message);
    }
  }

  R.pricing = (b, p) => {
    const items = p.items || [];
    const codes = (p.codes || []).length ? `<div class="codes">${p.codes.map(c => `<span><code data-copy>${esc(c.code)}</code> ${esc(c.text)}</span>`).join('')}</div>` : '';
    const note = p.note ? `<p class="note"${ed(`b:${b.id}:note`)}>${esc(p.note)}</p>` : '';
    if (b.variant === 'compact') return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="price-list reveal">${items.map((it, i) => `<div class="pr ${it.highlight ? 'hot' : ''}">
      ${T('h4', `b:${b.id}:items.${i}.name`, it.name)}<span class="f">${lines(it.features).map(esc).join(' · ')}</span>
      <span class="amount"${ed(`b:${b.id}:items.${i}.price`)}>${esc(it.price)}</span>${btn(it.ctaLabel, it.ctaHref, it.highlight ? 'btn-primary btn-sm' : 'btn-ghost btn-sm', `b:${b.id}:items.${i}.ctaLabel`)}</div>`).join('')}</div>${codes}${note}</div></div>`;
    return `<div class="sec" id="preise"><div class="wrap">${head(p, b.id)}<div class="price-grid reveal">${items.map((it, i) => `<div class="price ${it.highlight ? 'hot' : ''}">
      ${it.badge ? `<span class="badge"${ed(`b:${b.id}:items.${i}.badge`)}>${esc(it.badge)}</span>` : ''}${T('h4', `b:${b.id}:items.${i}.name`, it.name)}
      <div class="amount"><span${ed(`b:${b.id}:items.${i}.price`)}>${esc(it.price)}</span>${it.unit ? `<small> ${esc(it.unit)}</small>` : ''}</div>
      <div class="old">${it.old ? `statt ${esc(it.old)}` : ''}</div><ul>${lines(it.features).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      ${btn(it.ctaLabel, it.ctaHref, it.highlight ? 'btn-primary' : 'btn-ghost', `b:${b.id}:items.${i}.ctaLabel`)}</div>`).join('')}</div>${codes}${note}</div></div>`;
  };

  R.team = (b, p) => {
    const team = col('team').slice(0, p.limit || 99);
    if (!team.length) return `<div class="sec"><div class="wrap"><div class="empty">Noch keine Team-Mitglieder. Im Admin unter Inhalte → Team anlegen.</div></div></div>`;
    // fit: 'contain' zeigt das ganze Bild (Text-Overlays bleiben lesbar), 'cover' füllt mit Fokuspunkt
    const fitAttr = m => !m.image ? '' : (m.fit || 'cover') === 'contain' ? ` style="--img:url('${esc(m.image)}');background-image:url('${esc(m.image)}')"` : ` style="background-image:url('${esc(m.image)}');background-position:center ${m.focus || '20%'}"`;
    const fitCls = m => (m.image && m.fit === 'contain' ? ' fit' : '');
    const pic = m => `<div class="pic${fitCls(m)} ${m.image ? '' : 'ph-img'}"${fitAttr(m)}${im(`c:team:${m.id}:image`)}>${m.image ? '' : (m.hiring ? '+' : esc((m.name || '?')[0]))}</div>`;
    if (b.variant === 'spotlight') {
      const [m, ...rest] = team;
      return `<div class="sec"><div class="wrap spot"><div class="pic reveal${fitCls(m)}"${fitAttr(m)}${im(`c:team:${m.id}:image`)}><div class="label"><b${ed(`c:team:${m.id}:name`)}>${esc(m.name)}</b><span${ed(`c:team:${m.id}:role`)}>${esc(m.role)}</span></div></div>
        <div class="reveal">${T('span', `b:${b.id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h2', `b:${b.id}:title`, p.title, 'display')}${T('p', `b:${b.id}:text`, p.text)}
        <p${ed(`c:team:${m.id}:bio`)}>${esc(m.bio)}</p><a href="#/team" class="btn btn-ghost" style="margin-top:12px">Ganzes Team →</a>
        ${rest.length ? `<div class="others">${rest.map(o => `<div><i${bg(o.image)}>${o.image ? '' : esc((o.name || '?')[0])}</i>${esc(o.name)}</div>`).join('')}</div>` : ''}</div></div></div>`;
    }
    return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="team-grid reveal">${team.map(m => `<div class="member ${m.hiring ? 'hiring' : ''}">${pic(m)}<div class="body">
      <h3${ed(`c:team:${m.id}:name`)}>${esc(m.name)}</h3><div class="role"${ed(`c:team:${m.id}:role`)}>${esc(m.role)}</div><p${ed(`c:team:${m.id}:bio`)}>${esc(m.bio)}</p>
      <div class="tags">${lines(m.tags).map(t => `<span>${esc(t)}</span>`).join('')}</div>${m.hiring ? '<a href="#kontakt" class="btn btn-primary btn-sm" style="margin-top:16px">Bewerben</a>' : ''}</div></div>`).join('')}</div></div></div>`;
  };

  R.reviews = (b, p) => {
    const revs = col('reviews');
    const avg = revs.length ? revs.reduce((s, r) => s + Number(r.rating || 0), 0) / revs.length : 0;
    const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
    const badge = `<a class="g-badge" href="${esc(p.link || '#')}" target="_blank" rel="noopener"><span class="g">G</span><div><b>${avg.toFixed(1).replace('.', ',')}</b> <span class="stars">${stars(avg)}</span><br><small style="color:var(--muted)">${revs.length} Bewertungen · Google</small></div></a>`;
    const card = r => `<div class="rev"><span class="stars">${stars(r.rating)}</span><p${ed(`c:reviews:${r.id}:text`)}>„${esc(r.text)}"</p>
      <div class="who"><i>${esc((r.name || '?')[0])}</i><div>${esc(r.name)}<small>${esc(r.source || 'Google')} · ${fmtDate(r.date)}</small></div></div></div>`;
    if (b.variant === 'badge') return `<div class="sec"><div class="wrap"><div class="rv-head reveal" style="justify-content:space-between">${head(p, b.id, 'm0')}${badge}</div>
      <div class="rev-grid reveal">${revs.slice(0, 3).map(card).join('')}</div></div></div>`;
    return `<div class="sec ${b.variant === 'slider' ? 'alt' : ''}"><div class="wrap">${head(p, b.id)}<div class="rv-head reveal">${badge}<a href="${esc(p.link || '#')}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Bewertung schreiben</a></div>
      <div class="${b.variant === 'slider' ? 'rev-slider' : 'rev-grid'} reveal">${revs.map(card).join('')}</div></div></div>`;
  };

  R.hours = (b, p) => {
    if (b.variant === 'banner') {
      const w = S.settings.hours.week || {}; const today = new Date().getDay();
      return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="reveal" style="margin-bottom:18px">${statusHTML()}</div><div class="hours-banner reveal">${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="d ${d === today ? 'today' : ''}"><b>${DAYS[d]}</b><span>${(w[d] || []).map(r => `${r[0]}–${r[1]}`).join(', ') || 'geschlossen'}</span></div>`).join('')}</div>
        ${S.settings.hours.note ? `<p class="note">${esc(S.settings.hours.note)}</p>` : ''}${upcomingExceptions().map(e => `<p class="exc">⚠ ${fmtDate(e.date)}: ${e.closed ? 'geschlossen' : `${e.from}–${e.to}`}${e.note ? ' · ' + esc(e.note) : ''}</p>`).join('')}</div></div>`;
    }
    return `<div class="sec"><div class="wrap hours-card"><div class="reveal">${T('span', `b:${b.id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h2', `b:${b.id}:title`, p.title, 'display')}<div style="margin-top:26px">${statusHTML()}</div>
      <p style="margin-top:20px;color:var(--muted)">${esc(S.settings.contact.street)}, ${esc(S.settings.contact.zip)} ${esc(S.settings.contact.city)}</p></div><div class="reveal">${hoursTable()}</div></div></div>`;
  };

  R.stories = (b, p) => {
    const st = col('stories').slice(0, p.limit || 99);
    if (!st.length) return `<div class="sec"><div class="wrap"><div class="empty">Noch keine Erfolgsgeschichten angelegt.</div></div></div>`;
    const side = (s, k, label) => `<div class="side ${k === 'after' ? 'after' : ''} ${s[k + 'Img'] ? '' : 'ph-img'}"${bg(s[k + 'Img'])}${im(`c:stories:${s.id}:${k}Img`)}>${s[k + 'Img'] ? '' : `${label}-Foto hier ablegen`}</div>`;
    if (b.variant === 'cards') return `<div class="sec alt"><div class="wrap">${head(p, b.id)}<div class="story-cards reveal">${st.map(s => `<div class="story-card"><div class="pair">
      <div class="${s.beforeImg ? '' : 'ph-img'}"${bg(s.beforeImg)}${im(`c:stories:${s.id}:beforeImg`)}><span>Vorher</span></div><div class="${s.afterImg ? '' : 'ph-img'}"${bg(s.afterImg)}${im(`c:stories:${s.id}:afterImg`)}><span>Nachher</span></div></div>
      <div class="body"><h3${ed(`c:stories:${s.id}:name`)}>${esc(s.name)}</h3><p class="goal" style="color:var(--accent);font-weight:600;font-size:14px;margin-top:8px">${esc(s.goal)} · ${esc(s.duration)}</p>
      <div class="stat-row" style="margin-top:12px">${lines(s.stats).map(x => `<span>${esc(x)}</span>`).join('')}</div></div></div>`).join('')}</div></div></div>`;
    return `<div class="sec alt"><div class="wrap">${head(p, b.id)}<div class="story-wrap">${st.map(s => `<div class="story reveal"><div class="cmp" data-cmp>
      ${side(s, 'before', 'Vorher')}${side(s, 'after', 'Nachher')}<span class="lbl l">Vorher</span><span class="lbl r">Nachher</span><div class="handle"></div></div>
      <div><span class="goal">${esc(s.goal)} · ${esc(s.duration)}</span><h3${ed(`c:stories:${s.id}:name`)}>${esc(s.name)}</h3>
      <blockquote${ed(`c:stories:${s.id}:quote`)}>${esc(s.quote)}</blockquote><div class="stat-row">${lines(s.stats).map(x => `<span>${esc(x)}</span>`).join('')}</div></div></div>`).join('')}</div></div></div>`;
  };

  R.instagram = (b, p) => {
    const items = p.items || [];
    const tile = (it, i) => `<a href="${esc(it.href || p.link || '#')}" target="_blank" rel="noopener" data-cap="${esc(it.caption)}"${bg(it.image)}${im(`b:${b.id}:items.${i}.image`)}>${it.type === 'reel' ? '<span class="play">▶</span>' : ''}</a>`;
    return `<div class="sec"><div class="wrap"><div class="section-head reveal"><div>${T('span', `b:${b.id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h2', `b:${b.id}:title`, p.title, 'display')}</div>
      <a class="btn btn-ghost" href="${esc(p.link || '#')}" target="_blank" rel="noopener">Auf Instagram folgen →</a></div>
      <div class="${b.variant === 'reels' ? 'ig-reels' : 'ig-grid'} reveal">${items.map(tile).join('')}</div>
      <p class="ig-consent">Vorschau aus gepflegten Beiträgen. Der Live-Feed wird erst nach Zustimmung von Instagram geladen (DSGVO).</p></div></div>`;
  };

  function postCard(post) {
    return `<a class="post" href="#/blog/${esc(post.slug)}"><div class="cover ${post.cover ? '' : 'ph-img'}"${bg(post.cover)}${im(`c:posts:${post.id}:cover`)}></div><div class="body">
      <div class="meta"><span>${fmtDate(post.date)}</span><span>${esc(post.readMin || 3)} Min.</span><span>${esc(lines(post.tags)[0] || '')}</span></div>
      <h3${ed(`c:posts:${post.id}:title`)}>${esc(post.title)}</h3><p${ed(`c:posts:${post.id}:excerpt`)}>${esc(post.excerpt)}</p><span class="more">Weiterlesen →</span></div></a>`;
  }
  R.blog = (b, p) => {
    let posts = col('posts').slice().sort((a, z) => String(z.date).localeCompare(a.date));
    if (p.tag) posts = posts.filter(x => lines(x.tags).includes(p.tag));
    posts = posts.slice(0, p.limit || 99);
    return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="${b.variant === 'featured' ? 'blog-featured' : 'blog-grid'} reveal">${posts.map(postCard).join('') || '<div class="empty">Noch keine Beiträge.</div>'}</div>
      ${b.variant === 'grid' && col('posts').length > posts.length ? '<div style="margin-top:30px"><a class="btn btn-ghost" href="#/blog">Alle Beiträge →</a></div>' : ''}</div></div>`;
  };

  R.textmedia = (b, p) => {
    const bullets = (p.bullets || []).length ? `<div class="bullets">${p.bullets.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '';
    const text = `${T('span', `b:${b.id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h2', `b:${b.id}:title`, p.title, 'display')}${T('p', `b:${b.id}:text`, p.text)}${bullets}${btn(p.ctaLabel, p.ctaHref, 'btn-primary', `b:${b.id}:ctaLabel`)}`;
    if (b.variant === 'overlay') return `<div class="tm-overlay"${im(`b:${b.id}:image`)}><div class="bg"${bg(p.image)}></div><div class="wrap"><div class="inner reveal">${text}</div></div></div>`;
    return `<div class="sec"><div class="wrap tm-split ${b.variant === 'split-rev' ? 'rev' : ''}"><div class="reveal">${text}</div><div class="tm-img reveal ${p.image ? '' : 'ph-img'}"${bg(p.image)}${im(`b:${b.id}:image`)}>${p.image ? '' : 'Bild hier ablegen'}</div></div></div>`;
  };

  R.steps = (b, p) => {
    const items = p.items || [];
    if (b.variant === 'timeline') return `<div class="sec"><div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:50px;align-items:start">${head(p, b.id)}
      <div class="steps-tl reveal">${items.map((it, i) => `<div class="st" data-n="${i + 1}">${T('h3', `b:${b.id}:items.${i}.title`, it.title)}${T('p', `b:${b.id}:items.${i}.text`, it.text)}${it.meta ? `<span class="pill">${esc(it.meta)}</span>` : ''}</div>`).join('')}</div></div></div>`;
    return `<div class="sec alt"><div class="wrap">${head(p, b.id)}<div class="steps-num reveal">${items.map((it, i) => `<div class="st"><div class="n">${i + 1}</div>${T('h3', `b:${b.id}:items.${i}.title`, it.title)}${T('p', `b:${b.id}:items.${i}.text`, it.text)}${it.meta ? `<span class="pill">${esc(it.meta)}</span>` : ''}</div>`).join('')}</div></div></div>`;
  };

  R.events = (b, p) => {
    const today = iso(new Date());
    const evs = col('events').filter(e => (!p.type || e.type === p.type) && (EDIT || e.date >= today)).sort((a, z) => a.date.localeCompare(z.date));
    if (!evs.length) return `<div class="sec" id="events"><div class="wrap">${head(p, b.id)}<div class="empty">Aktuell keine Events geplant.</div></div></div>`;
    const dt = e => { const d = new Date(e.date + 'T12:00'); return { d: d.getDate(), m: MONTHS[d.getMonth()] }; };
    if (b.variant === 'list') return `<div class="sec" id="events"><div class="wrap">${head(p, b.id)}<div class="ev-list reveal">${evs.map(e => { const x = dt(e); const free = e.spots - e.booked; return `<div class="row">
      <div class="d">${x.d}. ${x.m}<small>${esc(e.time)} Uhr · ${esc(e.type)}</small></div><div><h3${ed(`c:events:${e.id}:title`)}>${esc(e.title)}</h3><p style="color:var(--muted);font-size:14px">${esc(e.desc)}</p></div>
      <span style="color:var(--muted);font-size:14px">${free > 0 ? `${free} Plätze frei` : 'ausgebucht'} · ${esc(e.price)}</span><button class="btn ${free > 0 ? 'btn-primary' : 'btn-ghost'} btn-sm" data-event="${esc(e.id)}" ${free > 0 ? '' : 'disabled'}>Anmelden</button></div>`; }).join('')}</div></div></div>`;
    return `<div class="sec" id="events"><div class="wrap">${head(p, b.id)}<div class="ev-cards reveal">${evs.map(e => { const x = dt(e); const free = e.spots - e.booked; return `<div class="ev">
      <div class="cover ${e.image ? '' : 'ph-img'}"${bg(e.image)}${im(`c:events:${e.id}:image`)}><div class="date"><b>${x.d}</b><span>${x.m}</span></div><span class="type">${esc(e.type)}</span></div>
      <div class="body"><h3${ed(`c:events:${e.id}:title`)}>${esc(e.title)}</h3><p${ed(`c:events:${e.id}:desc`)}>${esc(e.desc)}</p>
      <div style="font-size:13px;color:var(--muted)">${esc(e.time)} Uhr · ${e.booked}/${e.spots} Plätze<div class="bar"><i style="width:${Math.min(100, e.booked / e.spots * 100)}%"></i></div></div>
      <div class="foot"><b>${esc(e.price)}</b><button class="btn ${free > 0 ? 'btn-primary' : 'btn-ghost'} btn-sm" data-event="${esc(e.id)}" ${free > 0 ? '' : 'disabled'}>${free > 0 ? 'Anmelden' : 'Ausgebucht'}</button></div></div></div>`; }).join('')}</div></div></div>`;
  };

  function pickChallenge(id) {
    const ch = col('challenges');
    if (id && id !== 'current') return ch.find(c => c.id === id) || ch[0];
    const m = iso(new Date()).slice(0, 7);
    return ch.find(c => c.month === m) || ch.slice().sort((a, z) => z.month.localeCompare(a.month))[0];
  }
  // Alle Challenges des aktuellen Monats (sonst des jüngsten Monats)
  function currentChallenges() {
    const ch = col('challenges'); const m = iso(new Date()).slice(0, 7);
    const now = ch.filter(c => c.month === m);
    if (now.length) return now;
    const latest = ch.map(c => c.month).sort().pop();
    return ch.filter(c => c.month === latest);
  }
  const ranked = c => (c.entries || []).slice().sort((a, z) => c.sort === 'asc' ? a.value - z.value : z.value - a.value);
  function fmtVal(c, v) {
    if (c.format === 'time') {
      const t = Math.round(Number(v) || 0), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
      return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    }
    return `${Number(v).toLocaleString('de-DE')}${c.unit ? ' ' + c.unit : ''}`;
  }
  function monthLabel(m) { const [y, mo] = String(m).split('-').map(Number); return mo ? `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][mo - 1]} ${y}` : ''; }
  function countdownHTML(month) {
    const [y, mo] = String(month).split('-').map(Number);
    return `<div class="countdown" data-countdown="${new Date(y, mo, 1).getTime()}"><div><b>–</b><span>Tage</span></div><div><b>–</b><span>Std.</span></div><div><b>–</b><span>Min.</span></div></div>`;
  }
  function fullBoard(c) {
    return `<table class="lb-table">${ranked(c).map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td>${esc(fmtVal(c, e.value))}</td></tr>`).join('') || '<tr><td colspan="3">Noch keine Ergebnisse.</td></tr>'}</table>`;
  }
  R.leaderboard = (b, p) => {
    if (b.variant === 'tiles' || b.variant === 'mini') {
      const mini = b.variant === 'mini';
      const ids = p.challengeIds || [];
      const chs = ids.length ? ids.map(id => col('challenges').find(c => c.id === id)).filter(Boolean) : currentChallenges();
      if (!chs.length) return `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="empty">Keine Challenges angelegt. Im Admin unter Inhalte → Challenges.</div></div></div>`;
      const months = [...new Set(chs.map(c => c.month))];
      const n = Number(p.topN) || 3;
      const bar = months.length === 1 ? `<div class="lb-head reveal"><div><h3>${esc(monthLabel(months[0]))}</h3><p>${chs.length} Challenges laufen · Messungen im Studio</p></div>${countdownHTML(months[0])}</div>` : '';
      return `<div class="sec alt"><div class="wrap">${head(p, b.id)}${bar}<div class="lb-tiles ${mini ? 'mini' : ''} reveal">${chs.map(c => {
        const r = ranked(c);
        return `<div class="lbt">
          <div class="lbt-h"><span class="ic">${esc(c.icon || '🏆')}</span><div><b${ed(`c:challenges:${c.id}:title`)}>${esc(c.title)}</b><small>${esc(c.metric)}${c.sort === 'asc' ? ' · weniger ist besser' : ''}</small></div>${c.category ? `<span class="cat">${esc(c.category)}</span>` : ''}</div>
          ${c.desc && !mini ? `<p class="lbt-d"${ed(`c:challenges:${c.id}:desc`)}>${esc(c.desc)}</p>` : ''}
          <ol>${r.slice(0, n).map((e, i) => `<li class="r${i + 1}"><span class="rk">${i + 1}</span><span class="nm">${esc(e.name)}</span><span class="vl">${esc(fmtVal(c, e.value))}</span></li>`).join('') || '<li class="none">Noch keine Ergebnisse – sei der/die Erste!</li>'}</ol>
          ${r.length > n ? `<button class="lbt-all" data-lb="${esc(c.id)}">Ganze Rangliste (${r.length}) →</button>` : `<span class="lbt-all muted">${r.length} Teilnehmende</span>`}</div>`;
      }).join('')}</div></div></div>`;
    }
    const c = pickChallenge(p.challengeId);
    if (!c) return `<div class="sec"><div class="wrap"><div class="empty">Keine Challenge angelegt.</div></div></div>`;
    const entries = ranked(c);
    const headBox = `<div class="lb-head reveal"><div><h3>${esc(c.icon || '')} ${esc(c.title)}</h3><p>${esc(c.desc)} · Wertung: ${esc(c.metric)}</p></div>${countdownHTML(c.month)}</div>`;
    let board;
    if (b.variant === 'table') {
      board = `<div class="reveal">${fullBoard(c)}</div>`;
    } else {
      const top = [entries[1], entries[0], entries[2]];
      board = `<div class="podium reveal">${top.map((e, k) => e ? `<div class="p p${[2, 1, 3][k]}"><div class="rank">${[2, 1, 3][k]}</div><b>${esc(e.name)}</b><span>${esc(fmtVal(c, e.value))}</span></div>` : '<div></div>').join('')}</div>
        ${entries.length > 3 ? `<div class="lb-rest"><table class="lb-table">${entries.slice(3).map((e, i) => `<tr><td>${i + 4}</td><td>${esc(e.name)}</td><td>${esc(fmtVal(c, e.value))}</td></tr>`).join('')}</table></div>` : ''}`;
    }
    return `<div class="sec alt"><div class="wrap">${head(p, b.id)}${headBox}${board}</div></div>`;
  };

  R.gift = (b, p) => `<div class="sec"><div class="wrap"><div class="gift ${b.variant === 'dark' ? 'dark' : ''} reveal"><div>${T('h2', `b:${b.id}:title`, p.title, 'display')}${T('p', `b:${b.id}:text`, p.text)}
    <div class="amounts">${(p.amounts || []).map((a, i) => `<button class="${i === 1 ? 'on' : ''}">${esc(a)}</button>`).join('')}</div><a class="btn btn-dark" href="#kontakt"${ed(`b:${b.id}:ctaLabel`)}>${esc(p.ctaLabel || 'Gutschein kaufen')}</a></div>
    <div class="gimg ${p.image ? '' : 'ph-img'}"${bg(p.image)}${im(`b:${b.id}:image`)}></div></div></div></div>`;

  R.cta = (b, p) => {
    if (b.variant === 'outline') return `<div class="sec cta-outline"><div class="wrap"><div class="box reveal"><div>${T('h2', `b:${b.id}:title`, p.title, 'display')}${T('p', `b:${b.id}:text`, p.text)}</div>${btn(p.ctaLabel, p.ctaHref, 'btn-primary', `b:${b.id}:ctaLabel`)}</div></div></div>`;
    return `<div class="cta-orange"><div class="wrap reveal">${T('h2', `b:${b.id}:title`, p.title, 'display')}${T('p', `b:${b.id}:text`, p.text)}${btn(p.ctaLabel, p.ctaHref, '', `b:${b.id}:ctaLabel`)}</div></div>`;
  };

  R.contact = (b, p) => {
    const c = S.settings.contact;
    const info = `${p.showHours ? `<div class="info-card"><h4>Öffnungszeiten</h4>${statusHTML()}<div style="margin-top:14px">${hoursTable()}</div></div>` : ''}
      ${p.showInfo ? `<div class="info-card"><h4>Kontakt</h4><p>${esc(c.street)}<br>${esc(c.zip)} ${esc(c.city)}</p><p style="margin-top:12px"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a><br><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></p></div>` : ''}`;
    if (b.variant === 'center') return `<div class="sec" id="kontakt"><div class="wrap contact-center reveal">${T('span', `b:${b.id}:eyebrow`, p.eyebrow, 'eyebrow')}${T('h2', `b:${b.id}:title`, p.title, 'display')}
      ${T('p', `b:${b.id}:text`, p.text)}${formHTML(p.formId)}</div></div>`;
    return `<div class="sec" id="kontakt"><div class="wrap">${head(p, b.id)}<div class="contact-grid"><div class="reveal">${info}</div><div class="reveal">${formHTML(p.formId)}</div></div></div></div>`;
  };

  R.gallery = (b, p) => `<div class="sec"><div class="wrap">${head(p, b.id)}<div class="gallery reveal">${(p.images || []).slice(0, 3).map((x, i) => `<div${bg(x)}${im(`b:${b.id}:images.${i}`)}></div>`).join('')}</div></div></div>`;

  /* ---------- Mitgliederbereich ---------- */
  // Demo-Kunde für den Editor (keine API-Aufrufe)
  let demoM = null;
  function demoMember() {
    if (demoM) return demoM;
    const t = new Date(), dd = n => iso(addDays(t, n));
    const ex = (id, group, name, sets, reps, tempo, rest) => ({ id, group, name, sets, reps, tempo, rest, note: '' });
    const ss = (...a) => a.map(([reps, kg]) => ({ reps, kg }));
    const e1 = [ex('e1', 'A1', 'Klimmzug an Ringen', 4, '1-3', '4110', 60), ex('e2', 'A2', 'LH Military Press', 4, '6-8', '4010', 90), ex('e3', 'B1', 'KH Ausfallschritte vorne erhöht', 4, '6-8', '4010', 60),
      ex('e4', 'B2', 'Rudern Seil zum Hals', 4, '6-8', '3012', 90), ex('e5', 'C1', 'Wadenheben', 4, '12-15', '2020', 60), ex('e6', 'C2', 'Überkopf-Trizepsstrecken', 4, '12-15', '2020', 90)];
    const log1 = (id, off, k) => ({ id, dayId: 'd1', date: dd(off), note: '', sets: {
      e1: ss([3, 10 + k], [3, 10 + k], [3, 12.5 + k], [2, 15 + k]), e2: ss([8, 20 + k], [8, 30], [8, 30], [8, 35]), e3: ss([8, 0], [8, 5], [8, 10 + k]),
      e4: ss([8, 32], [8, 32], [8, 36], [8, 36 + k]), e5: ss([13, 40], [12, 50], [11, 60]), e6: ss([13, 22.5], [12, 22.5], [12, 22.5 + k]) } });
    const e2 = [ex('f1', 'A1', 'KH Schrägbank neutral eng', 4, '6-8', '4010', 60), ex('f2', 'A2', 'LH Wolverine Squat', 4, '1-3', '7610', 90), ex('f3', 'B1', 'SZ Curls supiniert', 4, '6-8', '3020', 60),
      ex('f4', 'B2', 'Rack Deadlift', 4, '6-8', '4010', 90), ex('f5', 'C1', 'Glute Ham Raises', 4, '6-8', '30X0', 60), ex('f6', 'C2', 'Iso Curls', 4, '30s', '–', 60), ex('f7', 'C3', 'Garhammer Raise', 4, '12-15', '–', 90)];
    const old = [ex('g1', 'A1', 'Kniebeuge', 3, '8-10', '3010', 90), ex('g2', 'A2', 'Rudern vorgebeugt', 3, '8-10', '3010', 90), ex('g3', 'B1', 'Plank', 3, '45s', '–', 45)];
    const skin = (k) => ({ kinn: 7 + k, wange: 9 + k, brust: 11 + k, trizeps: 13 + k, bauch: 20 + 2 * k, suprailiakal: 18 + 2 * k, oberschenkel: 17 + k });
    demoM = { id: 'demo', name: 'Demo Kunde', email: 'demo@mpt.de', phone: '', bookings: [
      { id: 'b1', courseId: 'co1', date: dd(2), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's1' },
      { id: 'b2', courseId: 'co1', date: dd(9), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's1' },
      { id: 'b3', courseId: 'co3', date: dd(4), start: '18:00', title: 'Semi-Personal', status: 'waitlist', seriesId: null },
      { id: 'b4', courseId: 'co1', date: dd(-5), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's0' },
      { id: 'b5', courseId: 'co1', date: dd(-12), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's0' },
      { id: 'b6', courseId: 'co1', date: dd(-19), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's0' },
      { id: 'b7', courseId: 'co1', date: dd(-26), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's0' },
      { id: 'b8', courseId: 'co1', date: dd(-40), start: '17:00', title: 'Functional Athletik', status: 'booked', seriesId: 's0' }],
    plans: [
      { id: 'p1', title: 'Demo ①', status: 'active', start: dd(-60), end: null, goal: 'Kraft & Muskelaufbau', note: '', days: [{ id: 'd1', name: 'Einheit 1', exercises: e1 }], logs: [-49, -42, -35, -28, -21, -14, -7].map((o, i) => log1('l' + (i + 1), o, [0, 0, 2.5, 2.5, 5, 5, 7.5][i])) },
      { id: 'p2', title: 'Demo ②', status: 'active', start: dd(-60), end: null, goal: '', note: '', days: [{ id: 'd2', name: 'Einheit 2', exercises: e2 }], logs: [-59, -52, -45, -38, -31, -24, -17, -10, -3].map((o, i) => { const g = [0, 0, 2, 2, 4, 4, 6, 6, 8][i]; return { id: 'l4' + i, dayId: 'd2', date: dd(o), note: '', sets: { f1: ss([8, 22 + g / 2], [8, 22 + g / 2], [7, 24 + g / 2], [6, 24 + g / 2]), f2: ss([3, 40 + g], [3, 40 + g], [2, 45 + g], [2, 45 + g]), f4: ss([8, 60 + g * 2], [8, 70 + g * 2], [8, 70 + g * 2], [7, 75 + g * 2]) } }; }) },
      { id: 'p0', title: 'Grundlagen', status: 'done', start: dd(-150), end: dd(-60), goal: 'Technik & Basis', note: '', days: [{ id: 'd0', name: 'Einheit A', exercises: old }], logs: [
        { id: 'l5', dayId: 'd0', date: dd(-120), note: '', sets: { g1: ss([10, 50], [10, 50], [8, 55]), g2: ss([10, 40], [10, 40], [9, 40]) } },
        { id: 'l6', dayId: 'd0', date: dd(-90), note: '', sets: { g1: ss([10, 60], [10, 60], [9, 60]), g2: ss([10, 45], [10, 45], [10, 45]) } }] }],
    measurements: [[-84, 86.2, 17.2, 3], [-56, 84.9, 16.0, 2], [-28, 83.6, 15.1, 1], [-3, 82.4, 14.1, 0]].map(([o, w, bf, k], i) => ({ id: 'ms' + i, date: dd(o), weight: w, bodyfat: bf, skinfolds: skin(k), girths: { bauch: 84 + k * 2, huefte: 98 + k * .5 }, note: '' })) };
    return demoM;
  }
  const me = () => (EDIT ? demoMember() : ME);
  const startOf = b => new Date(`${b.date}T${b.start || '00:00'}`);
  const sortedMs = m => (m.measurements || []).slice().sort((a, z) => a.date.localeCompare(z.date));
  const isNum = v => v != null && v !== '' && !isNaN(v);
  // Messpunkte: konfigurierte Labels aus settings.measure, unbekannte Schlüssel aus den Daten werden angehängt
  function mlist(m, kind) {
    const conf = (cfg('measure')[kind] || []).map(x => ({ key: x.key, label: x.label || x.key }));
    (m.measurements || []).forEach(ms => Object.keys(ms[kind] || {}).forEach(k => { if (!conf.some(c => c.key === k)) conf.push({ key: k, label: k }); }));
    return conf;
  }
  const skinSum = (ms, keys) => { const v = Object.entries(ms.skinfolds || {}).filter(([k, x]) => keys.includes(k) && isNum(x)).map(([, x]) => Number(x)); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
  function dlt(vals, unit) {
    if (vals.length < 2) return '';
    const d = vals[vals.length - 1] - vals[0], r = Math.round(d * 10) / 10;
    return `<em class="${r < 0 ? 'dn' : r > 0 ? 'up' : ''}">${r > 0 ? '+' : ''}${nf(r, 1)} ${unit}</em>`;
  }
  const upcoming = m => (m.bookings || []).filter(b => b.status !== 'cancelled' && startOf(b) >= new Date()).sort((a, z) => startOf(a) - startOf(z));

  function loginHTML() {
    return `<div class="login"><h3 class="display" style="font-size:34px;margin-bottom:16px">Anmelden</h3>${loginFormHTML()}</div>`;
  }
  function inviteHTML(inv) {
    return `<div class="login"><h3 class="display" style="font-size:34px;margin-bottom:16px">Willkommen${inv.name ? ', ' + esc(firstName(inv)) : ''}!</h3><p class="note" style="margin:0 0 16px">Lege dein Passwort fest, um dich künftig mit <b>${esc(inv.email)}</b> anzumelden.</p>
      <form class="form" data-activate novalidate><label for="iv-p">Passwort (mind. 8 Zeichen)</label><input id="iv-p" name="pass" type="password" required minlength="8" autocomplete="new-password">
      <label for="iv-r">Passwort wiederholen</label><input id="iv-r" name="pass2" type="password" required minlength="8" autocomplete="new-password">
      <button class="btn btn-primary" type="submit" style="width:100%">Passwort speichern und anmelden →</button><p class="err" role="alert" hidden></p></form></div>`;
  }
  const inviteBad = msg => `<div class="login"><h3 class="display" style="font-size:34px;margin-bottom:16px">Einladung</h3><p class="err">${esc(msg)}</p><p class="note">Bitte melde dich beim Studio, du bekommst einen neuen Link.</p><button class="btn btn-ghost" data-noinvite style="margin-top:14px">Zur Anmeldung</button></div>`;

  const TABS = [['overview', 'Übersicht'], ['plans', 'Pläne'], ['measure', 'Messungen'], ['bookings', 'Buchungen'], ['account', 'Konto']];
  function dashHTML(m) {
    const nx = upcoming(m)[0], today = iso(new Date());
    const hello = `<div class="m-hello"><span class="eyebrow">${wdLong(today)}, ${fmtDate(today)}</span><h2 class="display">Hallo ${esc(firstName(m))}!</h2>
      <p class="m-next">${nx ? `<span>Nächster Termin</span><b>${esc(nx.title)}</b><span>${wd(nx.date)}, ${fmtDate(nx.date)} · ${esc(nx.start)} Uhr</span>` : '<span>Kein Termin gebucht.</span><a class="acc" href="#/kurse">Kurs buchen</a>'}</p></div>`;
    return `<div class="m-bar">${hello}${EDIT ? '<span class="note">Vorschau mit Demo-Daten</span>' : '<button class="btn btn-ghost btn-sm" data-logout>Abmelden</button>'}</div>
      <div class="m-tabs" role="tablist" aria-label="Mitgliederbereich">${TABS.map(([k, l]) => `<button role="tab" id="mt-${k}" data-tab="${k}" aria-selected="${k === memberTab}" aria-controls="mp" tabindex="${k === memberTab ? 0 : -1}">${l}</button>`).join('')}</div>
      <div class="m-panel" id="mp" role="tabpanel" tabindex="0" aria-labelledby="mt-${memberTab}">${panelHTML(m, memberTab)}</div>`;
  }
  function panelHTML(m, tab) { return ({ overview: pOverview, plans: pPlans, measure: pMeasure, bookings: pBookings, account: pAccount }[tab] || pOverview)(m); }

  const stLabel = { booked: 'Gebucht', waitlist: 'Warteliste', cancelled: 'Storniert' };
  function bkRow(b, acts = '') {
    return `<div class="bk"><div><b>${esc(b.title)}</b><small>${wd(b.date)}, ${fmtDate(b.date)} · ${esc(b.start)} Uhr</small></div><span class="pill st-${esc(b.status)}">${esc(stLabel[b.status] || b.status)}</span>${b.seriesId ? '<span class="pill">Serie</span>' : ''}${acts}</div>`;
  }
  // ---- Übersicht: Auswertungen aus Trainings-Logs und Kursbuchungen ----
  const VIZ = ['var(--accent)', 'var(--viz-2)', 'var(--viz-3)'];
  const weekKey = s => iso(mondayOf(new Date(s + 'T12:00')));
  let strengthSel = 'all';   // gewählte Übung im Kraft-Diagramm ('all' = Vergleich aller drei)
  const narrow = () => window.innerWidth <= 640;
  const MARK = (i, x, y, c) => i === 1 ? `<rect x="${(x - 3.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="7" height="7" rx="1.5" ${c}/>` : i === 2 ? `<rect x="${(x - 3.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="7" height="7" rx="1" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})" ${c}/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" ${c}/>`;
  const kwOf = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
  const dayDiff = (a, b) => Math.round((new Date(a + 'T12:00') - new Date(b + 'T12:00')) / 864e5);
  // Δ-Chip: goodDown = true → Abnahme ist grün (Gewicht, Körperfett, Hautfalten)
  function chip(d, unit, goodDown) {
    const r = Math.round(d * 10) / 10; if (!isFinite(r)) return '';
    return `<span class="dchip ${r === 0 ? 'flat' : (r < 0) === goodDown ? 'good' : 'warn'}">${r > 0 ? '▲' : r < 0 ? '▼' : '•'} ${nf(Math.abs(r), 1)}${unit ? ' ' + unit : ''}</span>`;
  }
  function kspark(vals, label) {
    if (vals.length < 2) return '<div class="ksp"></div>';
    const mn = Math.min(...vals), mx = Math.max(...vals), x = i => i * 100 / (vals.length - 1), y = v => 4 + 24 * (1 - (v - mn) / ((mx - mn) || 1));
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg class="ksp" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="${esc(label + ': ' + vals.map(v => nf(v)).join(', '))}"><polygon class="a" points="0,32 ${pts} 100,32"/><polyline points="${pts}"/></svg>`;
  }
  // Logs und Übungsverläufe über alle Pläne; Übungen werden über den Namen zusammengeführt
  function trainData(m) {
    const exs = {}, logs = [];
    (m.plans || []).forEach(pl => {
      const byId = {}; (pl.days || []).forEach(d => (d.exercises || []).forEach(e => { byId[e.id] = e; }));
      (pl.logs || []).forEach(l => {
        if (!l.date) return;
        let vol = 0;
        Object.entries(l.sets || {}).forEach(([id, arr]) => {
          const ss = (arr || []).filter(s => s && isNum(s.reps));
          vol += ss.reduce((a, s) => a + Number(s.reps) * (Number(s.kg) || 0), 0);
          const e = byId[id], hv = ss.filter(s => Number(s.kg) > 0); if (!e || !e.name || !hv.length) return;
          const key = String(e.name).trim().toLowerCase(), x = exs[key] || (exs[key] = { key, name: String(e.name).trim(), pts: [] });
          x.pts.push({ date: l.date, kg: Math.max(...hv.map(s => Number(s.kg))), e1: Math.max(...hv.map(s => Number(s.kg) * (1 + Number(s.reps) / 30))) });
        });
        logs.push({ date: l.date, vol });
      });
    });
    Object.values(exs).forEach(x => {
      const d = {}; x.pts.forEach(p => { const c = d[p.date] || (d[p.date] = { date: p.date, kg: 0, e1: 0 }); c.kg = Math.max(c.kg, p.kg); c.e1 = Math.max(c.e1, p.e1); });
      x.pts = Object.values(d).sort((a, z) => a.date.localeCompare(z.date));
    });
    return { exs: Object.values(exs), logs };
  }
  const ovCard = (cls, title, sub, body, act = '') => `<section class="mcard ovc ${cls}"><div class="ovh"><h3>${title}</h3>${sub ? `<span class="sub">${sub}</span>` : ''}${act}</div>${body}</section>`;

  function strengthCard(td) {
    const top = td.exs.filter(x => x.pts.length).sort((a, z) => z.pts.length - a.pts.length || z.pts[z.pts.length - 1].e1 - a.pts[a.pts.length - 1].e1).slice(0, 3);
    if (!top.length) return ovCard('ov-strength', 'Kraftentwicklung', '', '<p class="vz-empty">Noch keine Trainings mit Zusatzgewicht. Sobald dein Coach Sätze einträgt, siehst du hier dein geschätztes 1RM.</p>');
    const sel = top.find(x => x.key === strengthSel), vis = sel ? [sel] : top, pct = x => (x.pts[x.pts.length - 1].e1 / x.pts[0].e1 - 1) * 100;
    const chips = `${top.length > 1 ? `<button class="vchip" data-strength="all" aria-pressed="${!sel}"><span class="vn">Alle im Vergleich</span></button>` : ''}${top.map((x, i) => `<button class="vchip" data-strength="${esc(x.key)}" aria-pressed="${!!sel && sel === x}" style="--vc:${VIZ[i]}"><svg class="vk" viewBox="0 0 10 10" aria-hidden="true">${MARK(i, 5, 5, '').replace('r="4"', 'r="3.6"')}</svg><span class="vn">${esc(x.name)}</span><b>${nf(x.pts[x.pts.length - 1].e1, 0)} kg</b>${x.pts.length > 1 ? chip(pct(x), '%', false) : ''}</button>`).join('')}`;
    // Alle: Veränderung in % seit Start (vergleichbar), eine Übung: absolutes e1RM in kg
    const val = (x, p) => sel ? p.e1 : (p.e1 / x.pts[0].e1 - 1) * 100;
    const W = narrow() ? 340 : 700, H = narrow() ? 220 : 270, Lm = narrow() ? 34 : 42, Rm = 14, Tm = 14, Bm = 28;
    const all = vis.flatMap(x => x.pts.map(p => val(x, p))), dates = vis.flatMap(x => x.pts.map(p => new Date(p.date + 'T12:00').getTime()));
    let mn = Math.min(...all), mx = Math.max(...all); if (!sel) { mn = Math.min(mn, 0); } if (mx - mn < 1) { mx = mn + 1; } const pd = (mx - mn) * .12; mx += pd; if (sel) mn -= pd;
    const t0 = Math.min(...dates), t1 = Math.max(...dates);
    const x = t => Lm + (t1 === t0 ? (W - Lm - Rm) / 2 : (t - t0) * (W - Lm - Rm) / (t1 - t0)), y = v => Tm + (H - Tm - Bm) * (1 - (v - mn) / (mx - mn));
    const fmtT = v => sel ? nf(v, 0) : (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), 0) + ' %';
    const ticks = [0, 1, 2, 3].map(i => mn + (mx - mn) * i / 3);
    const xl = [t0, (t0 + t1) / 2, t1].map((t, i) => ({ t, a: i === 0 ? 'start' : i === 2 ? 'end' : 'middle' })).filter((l, i) => t1 !== t0 || i === 1);
    const lines = vis.map(s => { const i = top.indexOf(s), c = `fill="${VIZ[i]}"`;
      return `<g class="vs" style="--vc:${VIZ[i]}">${s.pts.length > 1 ? `<polyline points="${s.pts.map(p => `${x(new Date(p.date + 'T12:00').getTime()).toFixed(1)},${y(val(s, p)).toFixed(1)}`).join(' ')}"/>` : ''}${s.pts.map(p => {
        const px = x(new Date(p.date + 'T12:00').getTime()), py = y(val(s, p)); return `<g>${MARK(i, px, py, c)}<circle class="hit" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="11"><title>${esc(`${s.name} · ${fmtDate(p.date)}: geschätztes 1RM ${nf(p.e1)} kg (bester Satz ${nf(p.kg, 2)} kg)`)}</title></circle></g>`; }).join('')}</g>`; }).join('');
    const aria = `Geschätztes 1RM (Epley) im Zeitverlauf: ${vis.map(s => `${s.name} von ${nf(s.pts[0].e1)} auf ${nf(s.pts[s.pts.length - 1].e1)} kg`).join('; ')}`;
    const svg = `<svg class="vz" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${ticks.map(v => `<line class="gl" x1="${Lm}" x2="${W - Rm}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ax" x="${Lm - 6}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end">${fmtT(v)}</text>`).join('')}
      ${xl.map(l => `<text class="ax" x="${x(l.t).toFixed(1)}" y="${H - 7}" text-anchor="${l.a}">${shortDate(new Date(l.t))}</text>`).join('')}${lines}</svg>`;
    return ovCard('ov-strength', 'Kraftentwicklung', sel ? 'geschätztes 1RM in kg' : 'Veränderung des geschätzten 1RM seit Start', `<div class="vchips" role="group" aria-label="Übung wählen">${chips}</div>${svg}<p class="vnote">Geschätztes 1RM nach Epley (kg × (1 + WH / 30)), bester Satz je Training. Die drei Übungen mit den meisten Trainings.</p>`);
  }

  function calendarCard(m, td) {
    const WEEKS = 18, now = new Date(), today = iso(now), start = addDays(mondayOf(now), -7 * (WEEKS - 1)), act = {}, weeks = new Set();
    const add = (d, course) => { const a = act[d] || (act[d] = { logs: 0, courses: [] }); if (course) a.courses.push(course); else a.logs++; weeks.add(weekKey(d)); };
    td.logs.forEach(l => add(l.date));
    (m.bookings || []).forEach(b => { if (b.status === 'booked' && startOf(b) < now) add(b.date, b.title); });
    const total = Object.values(act).reduce((s, a) => s + a.logs + a.courses.length, 0);
    let streak = 0, cur = mondayOf(now); if (!weeks.has(iso(cur))) cur = addDays(cur, -7); while (weeks.has(iso(cur))) { streak++; cur = addDays(cur, -7); }
    const C = 16, G = 3, Lm = 22, Tm = 16, W = Lm + WEEKS * (C + G) - G, H = Tm + 7 * (C + G) - G;
    let cells = '', labels = []; 
    for (let c = 0; c < WEEKS; c++) {
      const mon = addDays(start, 7 * c); if (c === 0 || mon.getMonth() !== addDays(mon, -7).getMonth()) labels.push({ c, t: MONTHS[mon.getMonth()] });
      for (let r = 0; r < 7; r++) {
        const d = addDays(mon, r), s = iso(d), a = act[s], n = a ? a.logs + a.courses.length : 0, fut = s > today;
        const txt = `${DAYS[d.getDay()]}, ${fmtDate(s)}: ${n ? [a.logs ? `${a.logs} Training${a.logs === 1 ? '' : 's'}` : '', ...a.courses.map(t => 'Kurs ' + t)].filter(Boolean).join(', ') : fut ? 'noch offen' : 'kein Training'}`;
        cells += `<rect class="hm ${fut ? 'fut' : n ? 'l' + Math.min(n, 3) : ''} ${s === today ? 'today' : ''}" x="${Lm + c * (C + G)}" y="${Tm + r * (C + G)}" width="${C}" height="${C}" rx="3"><title>${esc(txt)}${s === today ? ' (heute)' : ''}</title></rect>`;
      }
    }
    if (labels.length > 1 && labels[1].c < 3) labels.shift();
    const svg = `<svg class="vz hmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Trainingskalender der letzten ${WEEKS} Wochen: ${total} Trainings, ${streak} Wochen in Folge`)}">
      ${labels.map(l => `<text class="ax" x="${Lm + l.c * (C + G)}" y="9">${l.t}</text>`).join('')}${[0, 2, 4].map(r => `<text class="ax" x="0" y="${Tm + r * (C + G) + 12}">${DAYS[r + 1]}</text>`).join('')}${cells}</svg>`;
    const stat = `<div class="cal-stats"><div><b>${streak}</b><span>${streak === 1 ? 'Woche' : 'Wochen'} in Folge</span></div><div><b>${total}</b><span>Trainings gesamt</span></div></div>`;
    return ovCard('ov-cal', 'Trainings-Kalender', `letzte ${WEEKS} Wochen`, `${stat}${svg}<div class="hleg" aria-hidden="true"><span>Weniger</span><i class="hm-k"></i><i class="hm-k l1"></i><i class="hm-k l2"></i><i class="hm-k l3"></i><span>Mehr</span></div>${total ? '' : '<p class="vnote">Noch keine Trainings erfasst. Dein erstes Training färbt hier das erste Kästchen.</p>'}`);
  }

  function volumeCard(td) {
    const N = 10, now = new Date(), mon0 = mondayOf(now), wk = [];
    for (let i = N - 1; i >= 0; i--) { const mon = addDays(mon0, -7 * i); wk.push({ mon, key: iso(mon), v: 0 }); }
    td.logs.forEach(l => { const w = wk.find(x => x.key === weekKey(l.date)); if (w) w.v += l.vol; });
    const sum = wk.reduce((s, w) => s + w.v, 0);
    if (!sum) return ovCard('ov-vol', 'Volumen pro Woche', `letzte ${N} Wochen`, '<p class="vz-empty">Noch kein Trainingsvolumen. Es entsteht aus Wiederholungen × Gewicht deiner eingetragenen Sätze.</p>');
    const W = narrow() ? 340 : 520, H = narrow() ? 210 : 230, Tm = 22, Bm = 26, Lm = 4, slot = (W - 2 * Lm) / N, bw = slot * .62, mx = Math.max(...wk.map(w => w.v)), cur = wk[N - 1], prev = wk[N - 2];
    const bars = wk.map((w, i) => {
      const h = w.v ? Math.max(3, (H - Tm - Bm) * w.v / mx) : 0, x = Lm + i * slot + (slot - bw) / 2, y = H - Bm - h, isCur = i === N - 1, end = addDays(w.mon, 6);
      const t = `KW ${kwOf(w.mon)} (${dMY(w.key)}–${dMY(iso(end))}): ${w.v ? nf(w.v, 0) + ' kg Volumen' : 'kein Training'}${isCur ? ' (aktuelle Woche)' : ''}`;
      return `<g><rect class="vbar ${isCur ? 'cur' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"><title>${esc(t)}</title></rect><rect class="hit" x="${(Lm + i * slot).toFixed(1)}" y="${Tm - 6}" width="${slot.toFixed(1)}" height="${H - Tm - Bm + 6}"><title>${esc(t)}</title></rect>
        <text class="bv ${isCur ? 'cur' : ''}" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${w.v ? nf(w.v / 1000, 1) : '–'}</text>
        <text class="ax ${isCur ? 'cur' : ''}" x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${kwOf(w.mon)}</text></g>`;
    }).join('');
    const svg = `<svg class="vz" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Trainingsvolumen pro Woche in Tonnen, letzte ${N} Wochen: ${wk.map(w => `KW ${kwOf(w.mon)} ${nf(w.v / 1000, 1)} t`).join(', ')}`)}"><line class="gl" x1="0" x2="${W}" y1="${H - Bm}" y2="${H - Bm}"/>${bars}</svg>`;
    const stat = `<div class="cal-stats"><div><b>${nf(cur.v / 1000, 1)} t</b><span>diese Woche ${prev.v && cur.v ? chip((cur.v / prev.v - 1) * 100, '%', false) : ''}</span></div><div><b>${nf(sum / N / 1000, 1)} t</b><span>Ø pro Woche</span></div></div>`;
    return ovCard('ov-vol', 'Volumen pro Woche', `letzte ${N} Wochen`, `${stat}${svg}<p class="vnote">Balken: Kalenderwoche, Wert in Tonnen. Volumen = Σ Wiederholungen × kg.</p>`);
  }

  function recordsCard(td) {
    const today = iso(new Date()), recs = [];
    td.exs.forEach(x => {
      let bk = x.pts[0].kg, be = x.pts[0].e1, last = null;
      x.pts.slice(1).forEach(p => {
        if (p.kg > bk) last = { x, date: p.date, kind: 'kg', val: p.kg, d: p.kg - bk, e1: p.e1 }; else if (p.e1 > be + .05) last = { x, date: p.date, kind: 'e1', val: p.e1, d: p.e1 - be };
        bk = Math.max(bk, p.kg); be = Math.max(be, p.e1);
      });
      if (last) recs.push(last);
    });
    recs.sort((a, z) => z.date.localeCompare(a.date) || z.d - a.d);
    const ico = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';
    const rows = recs.slice(0, 5).map(r => `<li class="rec"><span class="ri">${ico}</span><div class="rt"><b>${esc(r.x.name)}</b><small>${r.kind === 'kg' ? 'Bestes Gewicht' : 'Bestes 1RM (geschätzt)'} · ${fmtDate(r.date)}</small></div>
      <div class="rv"><b>${nf(r.val, r.kind === 'kg' ? 2 : 1)} kg</b><span><span class="dchip good">▲ ${nf(r.d, r.kind === 'kg' ? 2 : 1)} kg</span>${dayDiff(today, r.date) < 14 ? '<span class="neu">NEU</span>' : ''}</span></div></li>`).join('');
    return ovCard('ov-rec', 'Persönliche Rekorde', '', rows ? `<ul class="recs">${rows}</ul>` : '<p class="vz-empty">Rekorde erscheinen, sobald du dich in einer Übung steigerst.</p>');
  }

  function pOverview(m) {
    const ms = sortedMs(m), keys = mlist(m, 'skinfolds').map(x => x.key), td = trainData(m), now = new Date();
    const kpi = (label, unit, fn) => {
      const v = ms.map(fn).filter(isNum).map(Number), last = v[v.length - 1];
      return `<div class="kpi"><span class="kl">${label}</span><div class="kv"><b>${v.length ? nf(last) : '–'}<small>${unit}</small></b>${v.length > 1 ? chip(last - v[0], unit, true) : ''}</div>${kspark(v, label)}<small class="ks">${v.length > 1 ? `seit Start · ${v.length} Messungen` : v.length ? 'erste Messung' : 'noch keine Messung'}</small></div>`;
    };
    const cnt = ym => td.logs.filter(l => String(l.date).slice(0, 7) === ym).length, prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const trainings = cnt(iso(now).slice(0, 7)), before = cnt(iso(prevM).slice(0, 7));
    const weekly = []; for (let i = 7; i >= 0; i--) { const k = iso(addDays(mondayOf(now), -7 * i)); weekly.push(td.logs.filter(l => weekKey(l.date) === k).length); }
    const act = (m.plans || []).filter(p => p.status !== 'done');
    const next = upcoming(m).slice(0, 3);
    const mine = currentChallenges().map(c => ({ c, rank: ranked(c).findIndex(e => e.name === m.name) })).sort((a, z) => (z.rank >= 0) - (a.rank >= 0) || a.rank - z.rank), more = Math.max(0, mine.length - 4);
    const planCard = pl => { const last = (pl.logs || []).map(l => l.date).sort().pop(); return `<div class="pcard"><b>${esc(pl.title)}</b>${pl.goal ? `<span>${esc(pl.goal)}</span>` : ''}<small>${(pl.days || []).length} Einheit${(pl.days || []).length === 1 ? '' : 'en'} · ${last ? 'letztes Training ' + fmtDate(last) : 'noch kein Training'}</small></div>`; };
    const go = (t, l) => `<button class="btn btn-ghost btn-sm" data-gotab="${t}">${l}</button>`;
    return `<div class="ov"><div class="ov-kpis">${kpi('Gewicht', 'kg', x => x.weight)}${kpi('Körperfett', '%', x => x.bodyfat)}${kpi('Σ Hautfalten', 'mm', x => skinSum(x, keys))}
      <div class="kpi"><span class="kl">Trainings im ${MONTHS[now.getMonth()]}</span><div class="kv"><b>${trainings}<small>×</small></b>${(trainings || before) ? chip(trainings - before, '', false) : ''}</div>${kspark(weekly, 'Trainings pro Woche')}<small class="ks">${before ? `Vormonat: ${before}×` : 'letzte 8 Wochen'}</small></div></div>
      ${strengthCard(td)}${recordsCard(td)}${calendarCard(m, td)}${volumeCard(td)}
      ${ovCard('ov-bk', 'Nächste Buchungen', '', next.map(b => bkRow(b)).join('') || '<p class="note">Keine anstehenden Buchungen. <a class="acc" href="#/kurse">Jetzt einen Kurs buchen</a></p>', go('bookings', 'Alle'))}
      ${ovCard('ov-pl', 'Aktive Pläne', '', act.map(planCard).join('') || '<p class="note">Noch kein aktiver Plan. Dein Coach legt ihn für dich an.</p>', go('plans', 'Ansehen'))}
      ${ovCard('ov-ch', 'Challenges', '', mine.slice(0, 4).map(({ c, rank }) => `<div class="bk"><div><b>${esc(c.icon || '🏆')} ${esc(c.title)}</b><small>${esc(c.metric)}</small></div><span>${rank >= 0 ? `<b class="acc">#${rank + 1}</b>` : '<span class="note">noch nicht dabei</span>'}</span></div>`).join('') + (more ? `<p class="note" style="margin-top:10px">+ ${more} weitere</p>` : '') || '<p class="note">Aktuell keine Challenge.</p>')}</div>`;
  }

  const setsOf = (l, ex) => ((l.sets && l.sets[ex.id]) || []).filter(s => s && isNum(s.reps));
  function exStats(pl, ex) {
    const pts = []; let best = 0;
    (pl.logs || []).slice().sort((a, z) => a.date.localeCompare(z.date)).forEach(l => {
      const ss = setsOf(l, ex); if (!ss.length) return;
      best = Math.max(best, ...ss.map(s => Number(s.kg) || 0));
      pts.push({ date: l.date, e1: Math.max(...ss.map(s => (Number(s.kg) || 0) * (1 + Number(s.reps) / 30))), vol: ss.reduce((a, s) => a + Number(s.reps) * (Number(s.kg) || 0), 0), reps: ss.reduce((a, s) => a + Number(s.reps), 0) });
    });
    return { best, pts };
  }
  function spark(pts) {
    const v = pts.map(p => p.e1), mn = Math.min(...v), mx = Math.max(...v), W = 84, H = 26;
    const x = i => 3 + (pts.length === 1 ? (W - 6) / 2 : i * (W - 6) / (pts.length - 1)), y = a => 3 + (H - 6) * (1 - (a - mn) / ((mx - mn) || 1));
    const title = `Geschätztes 1RM (Epley): ${pts.map(p => `${dMY(p.date)} ${nf(p.e1)} kg`).join(', ')}`;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${pts.length > 1 ? `<polyline points="${pts.map((p, i) => `${x(i).toFixed(1)},${y(p.e1).toFixed(1)}`).join(' ')}"/>` : ''}<circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(v[v.length - 1]).toFixed(1)}" r="2.5"/></svg>`;
  }
  function dayHTML(pl, d) {
    const exs = d.exercises || [], logs = (pl.logs || []).filter(l => l.dayId === d.id).sort((a, z) => a.date.localeCompare(z.date)).slice(-4);
    const L = e => (String(e.group || '').match(/^[A-Za-z]+/) || [''])[0].toUpperCase();
    const same = (a, b) => !!a && !!b && L(a) !== '' && L(a) === L(b);
    const rows = exs.map((e, i) => {
      const prev = same(exs[i - 1], e), next = same(e, exs[i + 1]), st = exStats(pl, e);
      const stat = st.pts.length ? `<b>${st.best ? nf(st.best, 2) + ' kg' : 'Körpergewicht'}</b><small>${st.best ? 'bestes Gewicht' : 'ohne Zusatzgewicht'}</small>${st.best ? spark(st.pts) : ''}<small>Letzte Einheit: ${st.best ? 'Volumen ' + nf(st.pts[st.pts.length - 1].vol, 0) + ' kg' : nf(st.pts[st.pts.length - 1].reps, 0) + ' WH'}</small>` : '<em>–</em>';
      return `<tr class="${prev ? '' : 'gs'} ${prev || next ? 'ss' : ''}"><td class="c-grp">${esc(e.group || '')}</td><th scope="row" class="c-ex">${esc(e.name)}${e.note ? `<small>${esc(e.note)}</small>` : ''}</th><td>${esc(e.sets ?? '')}</td><td>${esc(e.reps ?? '')}</td><td>${esc(e.tempo ?? '')}</td><td>${isNum(e.rest) ? esc(e.rest) + ' s' : ''}</td>
        ${logs.map(l => { const ss = setsOf(l, e); return `<td class="lg">${ss.length ? ss.map(s => `<span>${nf(s.reps, 0)} × ${nf(s.kg, 2)}</span>`).join('') : '<em>–</em>'}</td>`; }).join('')}<td class="stc">${stat}</td></tr>`;
    }).join('');
    return `<div class="plan-day"><h4>${esc(d.name)}</h4><div class="tscroll" tabindex="0" role="region" aria-label="Trainingsplan ${esc(d.name)}"><table class="ptab"><thead><tr><th class="c-grp">Einheit</th><th class="c-ex">Übung</th><th>Sätze</th><th>WH</th><th>Tempo</th><th>Pause</th>
      ${logs.map(l => `<th class="lg" ${l.note ? `title="${esc(l.note)}"` : ''}>${dMY(l.date)}<small>${String(l.date).slice(0, 4)}</small></th>`).join('')}<th>Statistik</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="note">Noch keine Übungen eingetragen.</td></tr>'}</tbody></table></div>
      ${logs.length ? '' : '<p class="note">Noch kein Training eingetragen. Dein Coach trägt deine Werte nach dem Training ein.</p>'}</div>`;
  }
  const planHTML = pl => `<article class="mcard plan"><div class="plh"><h3>${esc(pl.title)}</h3><span class="note">Start ${fmtDate(pl.start)}${pl.end ? ' · Ende ' + fmtDate(pl.end) : ''}</span></div>${pl.goal ? `<p class="pgoal"><b>Ziel:</b> ${esc(pl.goal)}</p>` : ''}${pl.note ? `<p class="note">${esc(pl.note)}</p>` : ''}${(pl.days || []).map(d => dayHTML(pl, d)).join('') || '<p class="note">Dieser Plan hat noch keine Einheiten.</p>'}</article>`;
  function pPlans(m) {
    const act = (m.plans || []).filter(p => p.status !== 'done'), done = (m.plans || []).filter(p => p.status === 'done');
    return `${act.map(planHTML).join('') || '<div class="empty">Noch kein aktiver Plan. Dein Coach legt ihn für dich an.</div>'}
      ${done.length ? `<details class="done-plans"><summary>Abgeschlossene Pläne (${done.length})</summary>${done.map(planHTML).join('')}</details>` : ''}`;
  }

  function lineChart(title, unit, pts) {
    if (!pts.length) return `<div class="mcard chart-card"><h4>${esc(title)}</h4><p class="note">Noch keine Werte.</p></div>`;
    const W = 360, H = 176, Lm = 42, Rm = 16, Tm = 16, Bm = 30;
    const vs = pts.map(p => p.v); let mn = Math.min(...vs), mx = Math.max(...vs); if (mn === mx) { mn -= 1; mx += 1; } const pd = (mx - mn) * .18; mn -= pd; mx += pd;
    const x = i => Lm + (pts.length === 1 ? (W - Lm - Rm) / 2 : i * (W - Lm - Rm) / (pts.length - 1)), y = v => Tm + (H - Tm - Bm) * (1 - (v - mn) / (mx - mn));
    const ticks = [0, .5, 1].map(f => mn + (mx - mn) * f);
    const last = pts[pts.length - 1], every = pts.length <= 5 ? pts.map((_, i) => i) : [0, pts.length - 1];
    return `<div class="mcard chart-card"><h4>${esc(title)}<b>${nf(last.v)} ${esc(unit)}</b></h4><svg class="mchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Verlauf ${title}: ${pts.map(p => `${dMY(p.date)} ${nf(p.v)} ${unit}`).join(', ')}`)}">
      ${ticks.map(t => `<line class="gl" x1="${Lm}" x2="${W - Rm}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="ax" x="${Lm - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end">${nf(t, 1)}</text>`).join('')}
      ${pts.length > 1 ? `<polyline class="ln" points="${pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>` : ''}
      ${pts.map((p, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4"><title>${esc(`${fmtDate(p.date)}: ${nf(p.v)} ${unit}`)}</title></circle>`).join('')}
      ${every.map(i => `<text class="ax" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${dMY(pts[i].date)}</text>`).join('')}
      <text class="lv" x="${x(pts.length - 1).toFixed(1)}" y="${(y(last.v) - 9).toFixed(1)}" text-anchor="${pts.length === 1 ? 'middle' : 'end'}">${nf(last.v)}</text></svg></div>`;
  }
  function pMeasure(m) {
    const ms = sortedMs(m); if (!ms.length) return '<div class="empty">Noch keine Messungen. Dein Coach trägt sie bei der nächsten Messung ein.</div>';
    const sk = mlist(m, 'skinfolds'), gi = mlist(m, 'girths'), skKeys = sk.map(x => x.key);
    const series = fn => ms.map(x => ({ date: x.date, v: fn(x) })).filter(p => isNum(p.v)).map(p => ({ date: p.date, v: Number(p.v) }));
    const row = (label, unit, fn) => {
      const vals = ms.map(fn); if (!vals.some(isNum)) return '';
      const nums = vals.filter(isNum).map(Number);
      return `<tr><th scope="row">${esc(label)} <small>${unit}</small></th>${vals.map(v => `<td>${nf(v, 1)}</td>`).join('')}<td class="dc">${dlt(nums, unit) || '–'}</td></tr>`;
    };
    const grp = t => `<tr class="grp"><th colspan="${ms.length + 2}">${t}</th></tr>`;
    const skRows = sk.map(s => row(s.label, 'mm', x => (x.skinfolds || {})[s.key])).join(''), giRows = gi.map(g => row(g.label, 'cm', x => (x.girths || {})[g.key])).join('');
    return `<div class="charts">${lineChart('Gewicht', 'kg', series(x => x.weight))}${lineChart('Körperfett', '%', series(x => x.bodyfat))}${lineChart('Σ Hautfalten', 'mm', series(x => skinSum(x, skKeys)))}</div>
      <div class="mcard"><h3>Alle Messwerte</h3><div class="tscroll" tabindex="0" role="region" aria-label="Messwerte nach Datum"><table class="mtab"><thead><tr><th>Messpunkt</th>${ms.map(x => `<th>${dMY(x.date)}<small>${String(x.date).slice(0, 4)}</small></th>`).join('')}<th>Δ</th></tr></thead><tbody>
      ${row('Gewicht', 'kg', x => x.weight)}${row('Körperfett', '%', x => x.bodyfat)}${row('Σ Hautfalten', 'mm', x => skinSum(x, skKeys))}${skRows ? grp('Hautfalten') + skRows : ''}${giRows ? grp('Umfänge') + giRows : ''}</tbody></table></div>
      <p class="note">Δ = Veränderung von der ersten zur letzten Messung. Grün bedeutet Abnahme.</p></div>`;
  }

  function pBookings(m) {
    const now = new Date(), hrs = Number(cfg('booking').cancelHours) || 0;
    const all = (m.bookings || []).slice().sort((a, z) => startOf(a) - startOf(z));
    const up = all.filter(b => b.status !== 'cancelled' && startOf(b) >= now), past = all.filter(b => !up.includes(b)).reverse();
    const acts = b => {
      if (startOf(b) - now <= hrs * 36e5) return `<span class="note nocancel">Stornierung nur bis ${hrs} h vorher</span>`;
      return `<span class="acts"><button data-cancel data-id="${esc(b.id)}" data-series="0">${b.seriesId ? 'Nur diesen' : 'Stornieren'}</button>${b.seriesId ? `<button data-cancel data-id="${esc(b.id)}" data-series="1">Ganze Serie</button>` : ''}</span>`;
    };
    return `<div class="mcard"><h3>Kommende Buchungen<a href="#/kurse" class="btn btn-primary btn-sm">+ Kurs buchen</a></h3><p data-bkmsg hidden></p>
      ${up.map(b => bkRow(b, acts(b))).join('') || '<p class="note">Keine anstehenden Buchungen.</p>'}</div>
      ${past.length ? `<details class="done-plans"><summary>Vergangene und stornierte Buchungen (${past.length})</summary><div class="mcard">${past.map(b => bkRow(b)).join('')}</div></details>` : ''}`;
  }
  function pAccount(m) {
    return `<div class="mcard acct"><h3>Konto</h3><p class="note" style="margin:0 0 18px">${esc(m.name)} · ${esc(m.email)}</p>
      <form class="form" data-pw novalidate><h4>Passwort ändern</h4><label for="pw-c">Aktuelles Passwort</label><input id="pw-c" name="cur" type="password" required autocomplete="current-password">
      <label for="pw-n">Neues Passwort (mind. 8 Zeichen)</label><input id="pw-n" name="new" type="password" required minlength="8" autocomplete="new-password">
      <label for="pw-r">Neues Passwort wiederholen</label><input id="pw-r" name="new2" type="password" required minlength="8" autocomplete="new-password">
      <button class="btn btn-primary" type="submit">Passwort ändern</button><p role="alert" hidden></p></form>
      <div class="logout-row">${EDIT ? '' : '<button class="btn btn-ghost" data-logout>Abmelden</button>'}</div></div>`;
  }

  function repaintPanel(area) {
    const m = me(); if (!m) return;
    const p = area.querySelector('#mp'); if (!p) return;
    p.innerHTML = panelHTML(m, memberTab); p.setAttribute('aria-labelledby', 'mt-' + memberTab);
    area.querySelectorAll('[data-tab]').forEach(t => { const on = t.dataset.tab === memberTab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
  }
  async function doCancel(area, btn) {
    const msg = () => area.querySelector('[data-bkmsg]');
    if (EDIT) return showMsg(msg(), 'Im Editor deaktiviert. Teste das Stornieren in der Live-Ansicht.');
    const series = btn.dataset.series === '1';
    if (!confirm(series ? 'Alle zukünftigen Termine dieser Serie stornieren?' : 'Diesen Termin stornieren?')) return;
    btn.disabled = true;
    try {
      const r = await api('/api/member/cancel', { id: btn.dataset.id, series });
      await loadMe(); if (!ME) return render(true);
      repaintPanel(area); showMsg(msg(), `${r.cancelled} Termin${r.cancelled === 1 ? '' : 'e'} storniert.`, true);
    } catch (e) {
      if (e.status === 401) { ME = null; return render(true); }
      btn.disabled = false; showMsg(msg(), e.message);
    }
  }
  async function changePw(form) {
    const out = form.querySelector('p[role=alert]'), f = form.elements;
    if (EDIT) return showMsg(out, 'Im Editor deaktiviert.');
    if (!f.cur.value || !f.new.value) return showMsg(out, 'Bitte aktuelles und neues Passwort eingeben.');
    if (f.new.value.length < 8) return showMsg(out, 'Das neue Passwort braucht mindestens 8 Zeichen.');
    if (f.new.value !== f.new2.value) return showMsg(out, 'Die beiden neuen Passwörter stimmen nicht überein.');
    const b = form.querySelector('button[type=submit]'); b.disabled = true;
    try { await api('/api/member/password', { current: f.cur.value, new: f.new.value }); form.reset(); showMsg(out, 'Dein Passwort wurde geändert.', true); }
    catch (e) { showMsg(out, e.message); }
    b.disabled = false;
  }
  async function activate(form, token) {
    const err = form.querySelector('.err'), f = form.elements;
    if (EDIT) return showMsg(err, 'Im Editor deaktiviert.');
    if (f.pass.value.length < 8) return showMsg(err, 'Das Passwort braucht mindestens 8 Zeichen.');
    if (f.pass.value !== f.pass2.value) return showMsg(err, 'Die beiden Passwörter stimmen nicht überein.');
    const b = form.querySelector('button[type=submit]'); b.disabled = true; showMsg(err, '');
    try { await api('/api/member/activate', { token, pass: f.pass.value }); await loadMe(); }
    catch (e) { b.disabled = false; return showMsg(err, e.message); }
    history.replaceState(null, '', location.pathname + '#/mitglieder'); memberTab = 'overview'; updateHeader(); render(true);
  }
  function leaveInvite() { history.replaceState(null, '', location.pathname + '#/mitglieder'); render(true); }

  R.member = (b, p) => {
    const top = `${T('span', '', 'Mitgliederbereich', 'eyebrow')}${T('h1', `b:${b.id}:title`, p.title, 'display')}${T('p', `b:${b.id}:text`, p.text, 'lead')}`;
    const inv = !EDIT && new URLSearchParams(location.search).get('invite');
    const inner = inv ? '<div class="login"><p class="note" role="status">Einladung wird geprüft …</p></div>' : (me() ? dashHTML(me()) : loginHTML());
    return `<div class="member-area"><div class="wrap">${top}<div class="m-root" data-marea${inv ? ` data-invite="${esc(inv)}"` : ''}>${inner}</div></div></div>`;
  };
  function initMember(area) {
    const setTab = (k, focus) => { memberTab = k; repaintPanel(area); if (focus) area.querySelector(`[data-tab="${k}"]`)?.focus(); };
    area.addEventListener('click', e => {
      const t = e.target, tab = t.closest('[data-tab]');
      if (tab) return setTab(tab.dataset.tab);
      const sc = t.closest('[data-strength]'); if (sc) { strengthSel = sc.getAttribute('aria-pressed') === 'true' ? 'all' : sc.dataset.strength; repaintPanel(area); area.querySelector(`[data-strength="${CSS.escape(strengthSel)}"]`)?.focus(); return; }
      const g = t.closest('[data-gotab]'); if (g) { setTab(g.dataset.gotab); area.querySelector('.m-tabs')?.scrollIntoView({ block: 'nearest' }); return; }
      if (t.closest('[data-logout]')) return logout();
      const c = t.closest('[data-cancel]'); if (c) return doCancel(area, c);
      if (t.closest('[data-forgot]')) { const f = area.querySelector('[data-forgot-text]'); if (f) f.hidden = !f.hidden; return; }
      if (t.closest('[data-noinvite]')) leaveInvite();
    });
    area.addEventListener('keydown', e => {
      const tab = e.target.closest && e.target.closest('[data-tab]'); if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const i = TABS.findIndex(x => x[0] === tab.dataset.tab);
      setTab(TABS[e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0], true);
    });
    area.addEventListener('submit', e => {
      const f = e.target; e.preventDefault();
      if (f.matches('[data-mlogin]')) doLogin(f); else if (f.matches('[data-pw]')) changePw(f); else if (f.matches('[data-activate]')) activate(f, area.dataset.invite);
    });
    const inv = area.dataset.invite;
    if (inv) {
      api('/api/member/invite?token=' + encodeURIComponent(inv)).then(r => { area.innerHTML = inviteHTML(r); area.querySelector('input')?.focus(); })
        .catch(e => { area.innerHTML = inviteBad(e.status === 400 ? e.message : 'Die Einladung konnte nicht geprüft werden. ' + e.message); });
    } else if (ME && !EDIT) {
      // Daten im Hintergrund auffrischen (z. B. neue Werte vom Coach), nur bei Änderung neu zeichnen
      const before = JSON.stringify(ME);
      loadMe().then(() => { if (!ME) return render(true); if (JSON.stringify(ME) !== before && document.body.contains(area) && !area.contains(document.activeElement && document.activeElement.closest('form'))) { area.innerHTML = dashHTML(ME); } });
    }
  }

  /* ---------- Shop ---------- */
  const initials = s => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  function catIcon(cat) {
    const c = String(cat || '').toLowerCase();
    const p = c.includes('prot') ? '<rect x="5" y="8" width="14" height="13" rx="2"/><path d="M4 4h16v4H4zM9 14h6"/>'
      : c.includes('suppl') ? '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M9.3 8.3l5.4 7.4"/>'
      : c.includes('equip') ? '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>' : '<path d="M5 8h14l-1.5 12h-11zM9 8a3 3 0 016 0"/>';
    return `<svg class="pic-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  }
  function prodCard(p) {
    const vars = lines(p.variants), so = !!p.soldOut, path = k => `c:products:${p.id}:${k}`;
    const img = p.image ? `<div class="pimg"${bg(p.image)}${im(path('image'))}></div>` : `<div class="pimg ph" aria-hidden="true"${im(path('image'))}><span class="ini">${esc(initials(p.name))}</span>${catIcon(p.category)}</div>`;
    return `<article class="prod ${so ? 'so' : ''}" data-pid="${esc(p.id)}" data-cat="${esc(p.category || '')}">${img}${p.badge ? `<span class="pbadge"${ed(path('badge'))}>${esc(p.badge)}</span>` : ''}
      <div class="pb"><h3${ed(path('name'))}>${esc(p.name)}</h3><div class="pmeta"><span${ed(path('unit'))}>${esc(p.unit || '')}</span>${p.category ? ` · ${esc(p.category)}` : ''}</div>${p.desc ? `<p class="pdesc"${ed(path('desc'))}>${esc(p.desc)}</p>` : ''}
      <div class="buy"><b class="pprice">${esc(eur(p.price))}</b>${so ? '<button class="btn btn-ghost btn-sm" disabled>Ausverkauft</button>' : `<div class="bo">${vars.length ? `<select data-var aria-label="Variante für ${esc(p.name)}">${vars.map(v => `<option>${esc(v)}</option>`).join('')}</select>` : ''}
      <div class="qty"><button type="button" data-qm aria-label="Menge verringern">−</button><input type="number" data-qty min="1" max="20" value="1" inputmode="numeric" aria-label="Menge für ${esc(p.name)}"><button type="button" data-qp aria-label="Menge erhöhen">+</button></div>
      <button class="btn btn-primary btn-sm" data-add ${EDIT ? 'disabled title="Im Editor deaktiviert"' : ''}>In den Warenkorb</button></div>`}</div></div></article>`;
  }
  R.shop = (b, p) => {
    const prods = col('products').filter(x => x.active !== false && (!p.category || x.category === p.category)).slice(0, p.limit || 99);
    const cats = [...new Set(prods.map(x => x.category).filter(Boolean))];
    const chips = cats.length > 1 ? `<div class="sched-filter" role="group" aria-label="Kategorie"><button class="on" data-scat="" aria-pressed="true">Alle</button>${cats.map(c => `<button data-scat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>` : '';
    return `<div class="sec" id="shop"><div class="wrap">${head(p, b.id)}<div data-shop>${chips}${prods.length ? `<div class="${b.variant === 'rows' ? 'shop-rows' : 'shop-grid'} reveal">${prods.map(prodCard).join('')}</div>` : '<div class="empty">Aktuell sind keine Produkte verfügbar.</div>'}
      <p class="note shop-note">${esc(cfg('shop').pickupNote || '')}</p><p class="sr" data-cart-live aria-live="polite"></p></div></div></div>`;
  };
  function initShop(root) {
    root.addEventListener('click', e => {
      const t = e.target, chip = t.closest('[data-scat]');
      if (chip) {
        root.querySelectorAll('[data-scat]').forEach(x => { x.classList.toggle('on', x === chip); x.setAttribute('aria-pressed', x === chip); });
        root.querySelectorAll('.prod').forEach(c => { c.hidden = !!chip.dataset.scat && c.dataset.cat !== chip.dataset.scat; }); return;
      }
      const card = t.closest('.prod'); if (!card) return;
      const q = card.querySelector('[data-qty]');
      if (t.closest('[data-qm]')) q.value = clampQty(Number(q.value) - 1);
      else if (t.closest('[data-qp]')) q.value = clampQty(Number(q.value) + 1);
      else if (t.closest('[data-add]')) {
        if (EDIT) return;
        const b = t.closest('[data-add]'), p = col('products').find(x => x.id === card.dataset.pid); if (!p || p.soldOut) return;
        addToCart(p.id, (card.querySelector('[data-var]') || {}).value || '', clampQty(q.value));
        const old = b.textContent; b.textContent = 'Hinzugefügt ✓'; setTimeout(() => { b.textContent = old; }, 1300);
        root.querySelector('[data-cart-live]').textContent = `${p.name} wurde dem Warenkorb hinzugefügt.`;
      }
    });
    root.addEventListener('change', e => { if (e.target.matches('[data-qty]')) e.target.value = clampQty(e.target.value); });
  }

  /* ---------- Seitenrahmen ---------- */
  const CART_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.5l2 11h10l2-8H7"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>';
  const CART_ICO = `<button class="cart-ico" data-cart-open aria-label="Warenkorb öffnen" hidden>${CART_SVG}<b data-cart-count>0</b></button>`;
  function header(route) {
    const st = S.settings, hd = st.header || {};
    const nav = S.pages.filter(p => p.nav).map(p => `<a href="#/${esc(p.slug)}" class="${route.page && route.page.id === p.id ? 'on' : ''}">${esc(p.title)}</a>`).join('');
    return `<header class="site-header ${route.page && route.page.blocks[0] && ['fullbleed', 'poster'].includes(route.page.blocks[0].variant) ? '' : 'solid'}" id="hdr"><div class="wrap nav">
      <a href="#/" class="logo"><span>//</span>${esc(st.short)}<small>${esc(st.name)}</small></a><nav class="nav-links">${nav}</nav>
      <div class="nav-cta">${CART_ICO}<a class="btn btn-ghost btn-sm" href="#/mitglieder" data-memberbtn>${esc(ME ? firstName(ME) : hd.memberLabel || 'Mitglieder')}</a><a class="btn btn-primary btn-sm" href="${esc(hd.ctaHref || '#kontakt')}">${esc(hd.ctaLabel || 'Online buchen')}</a>
      <button class="burger" aria-label="Menü" data-burger><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div></div></header>
      <nav class="mobile-menu" id="mm">${nav}<a href="#/mitglieder" data-memberbtn>${esc(ME ? firstName(ME) : hd.memberLabel || 'Mitglieder')}</a></nav>`;
  }
  function footer() {
    const st = S.settings;
    const ig = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
    const fb = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V7c0-1 .5-1.5 1.5-1.5H17V2h-2.5C11.5 2 10 4 10 6.5V9H8v3.5h2V22h4v-9.5h2.5L17 9h-3z"/></svg>';
    return `<footer class="site-footer"><div class="wrap"><div class="foot"><a href="#/" class="logo"><span>//</span>${esc(st.short)}</a>
      <form class="newsletter" data-newsletter style="display:flex;gap:10px;max-width:420px;width:100%"><input type="email" required placeholder="Keine News verpassen – E-Mail" style="flex:1;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:12px 18px;color:#fff;font:14px Inter"><button class="btn btn-primary btn-sm">Abonnieren</button></form>
      <div class="social">${st.social.instagram ? `<a href="${esc(st.social.instagram)}" aria-label="Instagram" target="_blank" rel="noopener">${ig}</a>` : ''}${st.social.facebook ? `<a href="${esc(st.social.facebook)}" aria-label="Facebook" target="_blank" rel="noopener">${fb}</a>` : ''}</div></div>
      <div class="foot" style="margin-top:36px"><div class="foot-links">${S.pages.filter(p => p.nav).map(p => `<a href="#/${esc(p.slug)}">${esc(p.title)}</a>`).join('')}<a href="#">Impressum</a><a href="#">Datenschutz</a><a href="#">AGB</a><a href="#">Widerruf</a></div>
      <span style="font-size:13px;color:var(--muted)">© ${new Date().getFullYear()} ${esc(st.name)} · ${esc(st.contact.city)}</span></div>
      ${st.demoNote ? `<p class="demo">${esc(st.demoNote)}</p>` : ''}</div></footer>
      <button class="cart-fab" data-cart-open aria-label="Warenkorb öffnen" hidden>${CART_SVG}<span>Warenkorb</span><b data-cart-count>0</b></button>
      <div class="sticky-cta"><a class="btn btn-primary" href="${esc((st.header || {}).ctaHref || '#kontakt')}">Termin buchen</a><a class="btn btn-ghost" style="background:var(--bg)" href="tel:${esc(st.contact.phone.replace(/\s/g, ''))}">Anrufen</a></div>`;
  }

  function md(s) {
    return String(s || '').split(/\n{2,}/).map(par => {
      if (par.startsWith('## ')) return `<h2>${esc(par.slice(3))}</h2>`;
      return `<p>${esc(par).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`;
    }).join('').replace(/<p>## (.+?)<br>/g, '<h2>$1</h2><p>');
  }
  function article(post) {
    return `<article class="article"><div class="wrap"><a class="back" href="#/blog">← Alle Beiträge</a><div class="post" style="background:none;border:0"><div class="meta" style="margin-top:30px">${fmtDate(post.date)} · ${esc(post.readMin)} Min. Lesezeit · ${lines(post.tags).map(esc).join(', ')}</div></div>
      <h1 class="display"${ed(`c:posts:${post.id}:title`)}>${esc(post.title)}</h1><p class="lead" style="font-size:20px;color:#d4d4d8">${esc(post.excerpt)}</p>
      <div class="cover"${bg(post.cover)}${im(`c:posts:${post.id}:cover`)}></div><div class="content">${md(post.body)}</div>
      <div class="cta-outline" style="margin-top:50px"><div class="box"><div><h2 class="display">Lust auf mehr?</h2><p>Im Check-up finden wir deine größten Hebel.</p></div><a href="#/training" class="btn btn-primary">Check-up buchen</a></div></div></div></article>`;
  }

  /* ---------- Routing & Render ---------- */
  function resolve() {
    if (EDIT) { const page = S.pages.find(p => p.id === editPageId) || S.pages[0]; return { page }; }
    const h = location.hash;
    const path = h.startsWith('#/') ? h.slice(2) : '';
    if (path.startsWith('blog/')) { const post = col('posts').find(p => p.slug === path.slice(5)); if (post) return { post }; }
    const page = S.pages.find(p => p.slug === path.replace(/\/$/, '')) || S.pages.find(p => p.slug === '') || S.pages[0];
    return { page };
  }
  function setSEO(route) {
    const st = S.settings;
    let title, desc;
    if (route.post) { title = route.post.seoTitle || `${route.post.title} | ${st.name}`; desc = route.post.seoDesc || route.post.excerpt; }
    else { title = (route.page.seo || {}).title || (route.page.slug ? `${route.page.title} | ${st.name}` : st.seo.title); desc = (route.page.seo || {}).description || st.seo.description; }
    document.title = title;
    let m = document.querySelector('meta[name=description]'); if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); } m.content = desc || '';
    let ld = document.getElementById('ld'); if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ld'; document.head.appendChild(ld); }
    const biz = { '@context': 'https://schema.org', '@type': 'HealthClub', name: st.name, telephone: st.contact.phone, email: st.contact.email,
      address: { '@type': 'PostalAddress', streetAddress: st.contact.street, postalCode: st.contact.zip, addressLocality: st.contact.city, addressCountry: 'DE' } };
    ld.textContent = JSON.stringify(route.post ? { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: route.post.title, datePublished: route.post.date, description: desc, publisher: { '@type': 'Organization', name: st.name } } : biz);
  }
  function applyTheme() {
    const a = S.settings.accent || '#f2611d';
    document.documentElement.style.setProperty('--accent', a);
    const n = parseInt(a.slice(1), 16); const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    document.documentElement.style.setProperty('--on-accent', lum > 0.55 ? '#0a0a0b' : (lum > 0.4 ? '#0a0a0b' : '#ffffff'));
  }

  function renderBlock(b) {
    const fn = R[b.type];
    let inner;
    try { inner = fn ? fn(b, b.props || {}) : `<div class="wrap empty">Unbekannter Block: ${esc(b.type)}</div>`; }
    catch (e) { console.error(e); inner = `<div class="wrap empty">Fehler im Block ${esc(b.type)}: ${esc(e.message)}</div>`; }
    const label = (META[b.type] || {}).label || b.type;
    const vlabel = ((META[b.type] || {}).variants || {})[b.variant] || b.variant;
    const bar = EDIT ? `<div class="blk-bar"><span class="lbl">${esc(label)} · ${esc(vlabel)}</span><button class="handle" title="Ziehen zum Verschieben">⠿</button><button data-act="up" title="Nach oben">↑</button><button data-act="down" title="Nach unten">↓</button><button data-act="dup" title="Duplizieren">⧉</button><button data-act="hide" title="${b.hidden ? 'Einblenden' : 'Ausblenden'}">${b.hidden ? '◌' : '◉'}</button><button data-act="del" title="Löschen">✕</button></div>` : '';
    return `<section class="blk ${b.hidden ? 'hidden-blk' : ''} ${selected === b.id ? 'sel' : ''}" data-bid="${esc(b.id)}" data-type="${esc(b.type)}">${bar}${inner}</section>`;
  }

  function render(keepScroll) {
    if (!S) return;
    const y = scrollY;
    applyTheme();
    const route = resolve();
    setSEO(route);
    let main;
    if (route.post) main = article(route.post);
    else {
      const blocks = route.page.blocks.filter(b => EDIT || !b.hidden);
      main = blocks.map(renderBlock).join('') || `<div class="empty-page">${EDIT ? '<h2 class="display" style="font-size:48px">Leere Seite</h2><p>Zieh einen Block aus der Bibliothek hierher.</p>' : 'Diese Seite hat noch keine Inhalte.'}</div>`;
    }
    app.innerHTML = header(route) + `<main id="main">${main}</main>` + footer();
    init();
    if (keepScroll) scrollTo(0, y);
  }

  /* ---------- Verhalten ---------- */
  let io;
  function init() {
    const hdr = document.getElementById('hdr');
    const onScroll = () => hdr && hdr.classList.toggle('scrolled', scrollY > 40);
    removeEventListener('scroll', window.__mptScroll || (() => { })); window.__mptScroll = onScroll; addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (io) io.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    document.querySelector('[data-burger]')?.addEventListener('click', () => document.getElementById('mm').classList.toggle('open'));
    document.getElementById('mm')?.addEventListener('click', e => { if (e.target.tagName === 'A') e.currentTarget.classList.remove('open'); });

    // Vorher/Nachher-Regler
    document.querySelectorAll('[data-cmp]').forEach(c => {
      const set = x => { const r = c.getBoundingClientRect(); c.style.setProperty('--pos', Math.max(0, Math.min(100, (x - r.left) / r.width * 100)) + '%'); };
      c.addEventListener('pointerdown', e => { if (EDIT && e.target.closest('[data-img]') && e.altKey) return; c.setPointerCapture(e.pointerId); set(e.clientX); c.onpointermove = ev => set(ev.clientX); });
      c.addEventListener('pointerup', () => { c.onpointermove = null; });
    });
    // Kursplan (Live-Belegung, Wochen-Navigation, Buchung)
    document.querySelectorAll('[data-schedule]').forEach(initSchedule);
    // Events
    document.querySelectorAll('[data-event]').forEach(b => b.onclick = () => {
      const e = col('events').find(x => x.id === b.dataset.event); if (!e) return;
      const blk = b.closest('.blk'); const blockDef = findBlock(blk?.dataset.bid);
      const m = modal(e.title, `${fmtDate(e.date)} · ${e.time} Uhr · ${e.price}`, formHTML((blockDef && blockDef.props.formId) || 'golf', { subject: `Anmeldung: ${e.title} (${fmtDate(e.date)})` }));
      bindForms(m);
    });
    // Komplette Rangliste
    document.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => {
      const c = col('challenges').find(x => x.id === b.dataset.lb); if (!c) return;
      modal(`${c.icon || ''} ${c.title}`, `${c.desc || ''} · ${monthLabel(c.month)}`, `<div style="padding:10px 36px 30px">${fullBoard(c)}</div>`);
    });
    // Countdown
    document.querySelectorAll('[data-countdown]').forEach(c => {
      const tick = () => { const ms = Math.max(0, Number(c.dataset.countdown) - Date.now()); const v = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60]; c.querySelectorAll('b').forEach((b, i) => b.textContent = v[i]); };
      tick(); clearInterval(c._t); c._t = setInterval(tick, 30000);
    });
    // Gutschein-Beträge
    document.querySelectorAll('.gift .amounts').forEach(a => a.querySelectorAll('button').forEach(b => b.onclick = () => { a.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }));
    // Rabattcodes kopieren
    document.querySelectorAll('[data-copy]').forEach(c => c.onclick = () => { if (EDIT) return; navigator.clipboard?.writeText(c.textContent); const t = c.textContent; c.textContent = 'Kopiert ✓'; setTimeout(() => c.textContent = t, 1100); });
    // Newsletter
    document.querySelector('[data-newsletter]')?.addEventListener('submit', e => { e.preventDefault(); if (!EDIT) e.target.innerHTML = '<span class="acc">Danke für deinen Support! Bitte bestätige die E-Mail (Double-Opt-in).</span>'; });
    // Mitgliederbereich & Shop
    document.querySelectorAll('[data-marea]').forEach(initMember);
    document.querySelectorAll('[data-shop]').forEach(initShop);
    updateCartUI();
    bindForms(document);
    // Live-Status jede Minute aktualisieren
    clearInterval(window.__mptStatus);
    window.__mptStatus = setInterval(() => document.querySelectorAll('[data-status]').forEach(el => { el.outerHTML = statusHTML(); }), 60000);
    if (EDIT) setupEditDom();
    else if (location.hash && !location.hash.startsWith('#/')) document.querySelector(location.hash)?.scrollIntoView();
  }
  function bindForms(root) {
    root.querySelectorAll('form[data-form]').forEach(f => { if (f._b) return; f._b = 1; f.addEventListener('submit', e => { e.preventDefault(); submitForm(f); }); });
  }
  function findBlock(id) { for (const p of S.pages) { const b = p.blocks.find(x => x.id === id); if (b) return b; } return null; }

  /* ---------- Editier-Modus ---------- */
  const A = () => window.parent && window.parent.ADMIN;
  function rawFor(path) {
    const [k, a, b, c] = path.split(':');
    if (k === 'b') { const blk = findBlock(a); return blk ? get(blk.props, b) : ''; }
    if (k === 'c') { const it = col(a).find(x => x.id === b); return it ? get(it, c) : ''; }
    return '';
  }
  function setupEditDom() {
    document.querySelectorAll('[data-e]').forEach(el => { if (!el.dataset.e) return; el.setAttribute('contenteditable', 'plaintext-only'); if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true'); el.spellcheck = false; });
  }
  if (EDIT) {
    document.addEventListener('focusin', e => {
      const el = e.target.closest && e.target.closest('[data-e]'); if (!el || !el.dataset.e) return;
      el.dataset.orig = el.innerHTML; el.classList.add('editing'); el.textContent = rawFor(el.dataset.e) ?? '';
      const blk = el.closest('.blk'); if (blk) A()?.select(blk.dataset.bid, true);
    });
    document.addEventListener('focusout', e => {
      const el = e.target.closest && e.target.closest('[data-e]'); if (!el || !el.dataset.e) return;
      const c = el.cloneNode(true); c.querySelectorAll('br').forEach(br => br.replaceWith('\n')); c.querySelectorAll('div,p').forEach(x => x.prepend('\n'));
      const v = c.textContent.replace(/\u00a0/g, ' ').replace(/\n+$/, '');
      el.classList.remove('editing');
      if (v !== String(rawFor(el.dataset.e) ?? '')) A()?.update(el.dataset.e, v); else el.innerHTML = el.dataset.orig;
    });
    document.addEventListener('keydown', e => {
      const el = e.target.closest && e.target.closest('[data-e]');
      if (el && (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey)))) { e.preventDefault(); el.blur(); }
      if (!el && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); A()?.undo(e.shiftKey); }
    });
    document.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a) {
        e.preventDefault();
        const href = a.getAttribute('href') || '';
        if (a.closest('.site-header,.mobile-menu,.site-footer') && href.startsWith('#/')) A()?.navigate(href.slice(2));
      }
      const act = e.target.closest('.blk-bar [data-act]');
      const blk = e.target.closest('.blk');
      if (act && blk) { e.stopPropagation(); A()?.action(blk.dataset.bid, act.dataset.act); return; }
      if (blk && !e.target.closest('.blk-bar')) A()?.select(blk.dataset.bid);
      if (!blk && !e.target.closest('.modal')) A()?.select(null);
    }, true);
    document.addEventListener('submit', e => e.preventDefault(), true);
    // Bilder per Datei-Drop tauschen
    document.addEventListener('dragover', e => {
      if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
      const t = e.target.closest && e.target.closest('[data-img]');
      document.querySelectorAll('[data-img].drop').forEach(x => x !== t && x.classList.remove('drop'));
      if (t) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; t.classList.add('drop'); }
    });
    document.addEventListener('dragleave', e => { if (e.target.closest) e.target.closest('[data-img]')?.classList.remove('drop'); });
    document.addEventListener('drop', e => {
      const t = e.target.closest && e.target.closest('[data-img]');
      if (!t) { e.preventDefault(); return; }
      e.preventDefault(); t.classList.remove('drop');
      const file = [...(e.dataTransfer.files || [])].find(f => f.type.startsWith('image/'));
      if (file) A()?.uploadTo(t.dataset.img, file);
    });
    // Block per Griff innerhalb der Vorschau verschieben
    document.addEventListener('pointerdown', e => {
      const h = e.target.closest('.blk-bar .handle'); if (!h) return;
      e.preventDefault();
      const blk = h.closest('.blk'); const blocks = [...document.querySelectorAll('#main > .blk')]; const from = blocks.indexOf(blk);
      h.setPointerCapture(e.pointerId); blk.style.opacity = '.5';
      h.onpointermove = ev => { MPT.dropAt(ev.clientY, 'Hierher verschieben'); if (ev.clientY < 60) scrollBy(0, -20); else if (ev.clientY > innerHeight - 60) scrollBy(0, 20); };
      h.onpointerup = ev => { h.onpointermove = h.onpointerup = null; blk.style.opacity = ''; const to = MPT.dropAt(ev.clientY); MPT.clearDrop(); if (to !== from && to !== from + 1) A()?.move(from, to > from ? to - 1 : to); };
    });
  }

  /* ---------- API für den Admin ---------- */
  window.MPT = {
    load(cfg, pageId, meta) { S = cfg; META = meta || META; if (pageId) editPageId = pageId; render(true); },
    goto(pageId) { editPageId = pageId; render(false); scrollTo(0, 0); },
    select(id, noScroll) {
      selected = id;
      document.querySelectorAll('.blk').forEach(b => b.classList.toggle('sel', b.dataset.bid === id));
      const el = id && document.querySelector(`.blk[data-bid="${CSS.escape(id)}"]`);
      if (el && !noScroll) { const r = el.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * .7) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    },
    dropAt(clientY, label = 'Hier einfügen') {
      const blocks = [...document.querySelectorAll('#main > .blk')];
      let idx = blocks.length, y;
      for (let i = 0; i < blocks.length; i++) { const r = blocks[i].getBoundingClientRect(); if (clientY < r.top + r.height / 2) { idx = i; y = r.top; break; } }
      if (y === undefined) { const last = blocks[blocks.length - 1]; y = last ? last.getBoundingClientRect().bottom : (document.getElementById('main').getBoundingClientRect().top + 40); }
      let line = document.getElementById('dropline'); if (!line) { line = document.createElement('div'); line.id = 'dropline'; line.className = 'drop-line'; document.body.appendChild(line); }
      line.style.top = (y + scrollY - 3) + 'px'; line.dataset.label = label;
      return idx;
    },
    clearDrop() { document.getElementById('dropline')?.remove(); },
    scrollBy(dy) { scrollBy(0, dy); },
    status: liveStatus
  };

  /* ---------- Start ---------- */
  if (EDIT) { A()?.ready(); }
  else {
    fetch('/api/site').then(r => r.ok ? r.json() : Promise.reject()).then(d => d.pages ? d : Promise.reject())
      .catch(() => fetch('data/site.json').then(r => r.json()))
      .then(async d => { S = d; await loadMe(); render(); addEventListener('hashchange', () => { if (location.hash.startsWith('#/') || location.hash === '') { render(); scrollTo(0, 0); } else document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }); }); })
      .catch(() => { app.innerHTML = '<div class="empty-page">Inhalte konnten nicht geladen werden. Bitte über <code>python3 server.py</code> starten.</div>'; });
  }
})();
