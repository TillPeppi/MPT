/* MPT Admin: Seiten-Builder mit Live-Vorschau, Drag & Drop, Inhalte, Einstellungen, Anfragen. */
(function () {
  'use strict';
  const SC = window.SCHEMA;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));
  const demoAssets = o => (window.MPT_DEMO ? window.MPT_DEMO.assets(o) : o);   // Demo-Modus: /assets/… -> <Basis>/assets/…
  const uid = p => `${p}-${Math.random().toString(36).slice(2, 8)}`;
  const getP = (o, k) => String(k).split('.').reduce((a, x) => (a == null ? a : a[x]), o);
  const setP = (o, k, v) => { const ks = String(k).split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };
  const plain = s => String(s || '').replace(/&shy;/g, '').replace(/\*/g, '').replace(/\n/g, ' ');
  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const DRAFT = 'mpt-admin-draft';
  const _fetch = window.fetch.bind(window);
  window.fetch = async (...a) => {
    const r = await _fetch(...a);
    if (r.status === 401 && String(a[0]).startsWith('/api/')) { if (st.site) commit(); location.href = 'login.html'; }
    return r;
  };

  const st = { site: null, published: '', last: '', hist: [], fut: [], pageId: 'home', sel: null, tab: 'blocks', dev: 'desktop', coll: null, open: new Set(), setTab: 'general', inbox: [], q: '', scale: 1 };
  const META = Object.fromEntries(Object.entries(SC.blocks).map(([k, v]) => [k, { label: v.label, variants: v.variants }]));
  const frame = $('#preview');
  const P = () => { try { return frame.contentWindow && frame.contentWindow.MPT; } catch { return null; } };
  const listDefs = {};

  /* ---------- Hilfen ---------- */
  function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 2600); }
  const page = () => st.site.pages.find(p => p.id === st.pageId) || st.site.pages[0];
  const blocks = () => page().blocks;
  function findBlock(id) { for (const p of st.site.pages) { const b = p.blocks.find(x => x.id === id); if (b) return b; } return null; }
  function scopeObj(s) {
    const [k, a, b] = String(s).split(':');
    if (k === 'b') return findBlock(a)?.props;
    if (k === 'c') return (st.site.collections[a] || []).find(x => x.id === b);
    if (k === 'f') return st.site.forms.find(x => x.id === a);
    if (k === 's') return st.site.settings;
    if (k === 'p') return st.site.pages.find(x => x.id === a);
    return null;
  }

  /* ---------- Verlauf, Entwurf, Veröffentlichen ---------- */
  let commitT, prevT;
  function scheduleCommit() { clearTimeout(commitT); commitT = setTimeout(commit, 400); }
  function commit() {
    clearTimeout(commitT);
    const now = JSON.stringify(st.site);
    if (now === st.last) return;
    st.hist.push(st.last); if (st.hist.length > 80) st.hist.shift();
    st.fut = []; st.last = now; saveDraft(); updateState();
  }
  function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify({ site: st.site, at: Date.now() })); } catch { } }
  function undo(redo) {
    commit();
    if (redo) { if (!st.fut.length) return; st.hist.push(st.last); st.last = st.fut.pop(); }
    else { if (!st.hist.length) return; st.fut.push(st.last); st.last = st.hist.pop(); }
    st.site = JSON.parse(st.last); saveDraft();
    if (!st.site.pages.some(p => p.id === st.pageId)) st.pageId = st.site.pages[0].id;
    if (st.sel && !findBlock(st.sel)) st.sel = null;
    fillPages(); renderLeft(); renderRight(); pushPreview(true); updateState();
    toast(redo ? 'Wiederhergestellt' : 'Rückgängig gemacht');
  }
  function updateState() {
    const cur = JSON.stringify(st.site);
    const dirty = cur !== st.published;
    const el = $('#saveState');
    el.textContent = dirty ? 'Entwurf · nicht veröffentlicht' : 'Alles veröffentlicht';
    el.classList.toggle('dirty', dirty);
    $('#publish').disabled = !dirty;
    $('#undo').disabled = !st.hist.length && cur === st.last;
    $('#redo').disabled = !st.fut.length;
    $('#viewLive').href = '/#/' + (page().slug || '');
  }
  async function publish() {
    if (!normalizeMeasure()) return;
    commit();
    try {
      const send = force => fetch('/api/site' + (force ? '?force=1' : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(st.site) });
      let r = await send(false);
      if (r.status === 409) {
        if (!confirm('Achtung: Die Website wurde inzwischen an anderer Stelle geändert (anderes Gerät, Tab oder Update).\n\nOK = deinen Stand trotzdem veröffentlichen und die neuere Version überschreiben.\nAbbrechen = nichts tun (du kannst unter Einstellungen → Daten den Entwurf verwerfen).')) return;
        r = await send(true);
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      st.site._rev = j.rev; st.last = JSON.stringify(st.site); saveDraft();
      st.published = st.last; updateState(); $('#banner').hidden = true;
      toast('Veröffentlicht ✓ Die Website ist aktualisiert.');
    } catch (e) { toast('Veröffentlichen fehlgeschlagen: ' + e.message + '. Läuft server.py?', true); }
  }

  /* touch: nach jeder Änderung Vorschau + Verlauf aktualisieren */
  function touch(o = {}) {
    scheduleCommit(); schedulePreview(); updateState();
    if (o.left) renderLeft();
    if (o.right) renderRight();
  }
  function schedulePreview() { clearTimeout(prevT); prevT = setTimeout(() => pushPreview(false), 140); }
  function pushPreview(force) {
    const mpt = P(); if (!mpt || !st.site) return;
    try {
      const ae = frame.contentDocument.activeElement;
      if (!force && ae && ae.closest && ae.closest('[data-e]')) { prevT = setTimeout(() => pushPreview(false), 300); return; }
    } catch { }
    mpt.load(st.site, st.pageId, META);
    if (st.sel) mpt.select(st.sel, true);
  }

  /* ---------- Vorschau-Rahmen ---------- */
  function layoutFrame() {
    const wrap = $('#frameWrap');
    const W = { desktop: 1280, tablet: 820, mobile: 390 }[st.dev];
    const aw = wrap.clientWidth - 40, ah = wrap.clientHeight - 20;
    const sc = Math.min(1, aw / W);
    st.scale = sc;
    frame.style.width = W + 'px';
    frame.style.height = Math.max(300, ah / sc) + 'px';
    frame.style.top = '10px';
    frame.style.transform = `translateX(-50%) scale(${sc})`;
    try { frame.contentDocument.documentElement.style.setProperty('--ui', Math.min(2.2, 1 / sc).toFixed(2)); } catch { }
  }

  /* ---------- Seiten-Auswahl ---------- */
  function fillPages() {
    $('#pageSel').innerHTML = st.site.pages.map(p => `<option value="${esc(p.id)}" ${p.id === st.pageId ? 'selected' : ''}>${esc(p.title)}${p.slug ? ' · /' + esc(p.slug) : ' · Start'}</option>`).join('');
  }
  function switchPage(id) {
    if (!st.site.pages.some(p => p.id === id)) return;
    st.pageId = id; st.sel = null;
    fillPages(); renderLeft(); renderRight(); updateState();
    P()?.goto(id);
  }

  /* ---------- Felder ---------- */
  function linkOptions() {
    const o = st.site.pages.map(p => `#/${p.slug}`);
    return [...o, '#kontakt', '#kursplan', '#preise', '#events', ...st.site.collections.posts.map(p => `#/blog/${p.slug}`)];
  }
  function imageField(v, s, k, l) {
    return `<div class="f">${l ? `<label>${esc(l)}</label>` : ''}<div class="img-f"><div class="th" data-imgdrop data-ts="${esc(s)}" data-tk="${esc(k)}" title="Bild aus dem Finder hierher ziehen" style="${v ? `background-image:url('${esc(v)}')` : ''}">${v ? '' : 'Bild<br>ablegen'}</div>
      <div class="ctl"><input type="text" data-s="${esc(s)}" data-k="${esc(k)}" data-t="text" data-imgurl value="${esc(v || '')}" placeholder="/assets/img/…">
      <div><button class="btn ghost sm" data-pick data-ts="${esc(s)}" data-tk="${esc(k)}">Bibliothek</button><label class="btn ghost sm">Hochladen<input type="file" accept="image/*" hidden data-upload data-ts="${esc(s)}" data-tk="${esc(k)}"></label>${v ? `<button class="btn ghost sm" data-clearimg data-ts="${esc(s)}" data-tk="${esc(k)}" title="Entfernen">✕</button>` : ''}</div></div></div></div>`;
  }
  function fieldHTML(f, obj, s) {
    const v = f.k ? getP(obj, f.k) : undefined;
    const a = `data-s="${esc(s)}" data-k="${esc(f.k || '')}"`;
    const hint = f.h ? `<div class="hint">${esc(f.h)}</div>` : '';
    const lab = (x = '') => `<label>${esc(f.l)}${x}</label>`;
    const cnt = f.max ? ` <small class="count ${(v || '').length > f.max ? 'over' : ''}" data-count="${f.max}">${(v || '').length}/${f.max}</small>` : '';
    switch (f.t) {
      case 'text': return `<div class="f">${lab(cnt)}<input type="text" ${a} data-t="text" value="${esc(v ?? '')}" ${f.list ? `list="dl-${esc(f.k)}"` : ''} ${f.max ? `data-max="${f.max}"` : ''}>${f.list ? `<datalist id="dl-${esc(f.k)}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}${hint}</div>`;
      case 'link': return `<div class="f">${lab()}<input type="text" ${a} data-t="text" value="${esc(v ?? '')}" list="dl-links" placeholder="#kontakt oder https://…">${hint}</div>`;
      case 'textarea': return `<div class="f">${lab(cnt)}<textarea ${a} data-t="text" rows="${f.rows || 3}" ${f.max ? `data-max="${f.max}"` : ''}>${esc(v ?? '')}</textarea>${hint}</div>`;
      case 'number': return `<div class="f">${lab()}<input type="number" step="any" ${a} data-t="number" value="${esc(v ?? '')}">${hint}</div>`;
      case 'date': case 'time': case 'month': return `<div class="f">${lab()}<input type="${f.t}" ${a} data-t="text" value="${esc(v ?? '')}"></div>`;
      case 'color': return `<div class="f">${lab()}<div style="display:flex;gap:6px"><input type="color" ${a} data-t="text" value="${esc(v || '#f2611d')}" style="width:44px;height:32px;border:0;background:none"><input type="text" ${a} data-t="text" value="${esc(v || '')}"></div>
        <div class="chipset" style="margin-top:6px">${['#f2611d', '#ff3b30', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#f4f4f5'].map(c => `<button data-color="${c}" data-ts="${esc(s)}" data-tk="${esc(f.k)}" style="width:26px;height:26px;padding:0;background:${c}" title="${c}"></button>`).join('')}</div></div>`;
      case 'toggle': return `<label class="tg">${esc(f.l)}<input type="checkbox" ${a} data-t="toggle" ${v ? 'checked' : ''}><i></i></label>`;
      case 'select': return `<div class="f">${lab()}<select ${a} data-t="${f.num ? 'numsel' : 'text'}">${Object.entries(f.o).map(([k, l]) => `<option value="${esc(k)}" ${String(v ?? '') === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
      case 'strings': return `<div class="f">${lab(` <small>${(v || []).length}</small>`)}<textarea ${a} data-t="strings" rows="${Math.min(8, Math.max(3, (v || []).length + 1))}">${esc((v || []).join('\n'))}</textarea><div class="hint">Ein Eintrag pro Zeile</div></div>`;
      case 'image': return imageField(v, s, f.k, f.l);
      case 'images': return `<div class="f"><label>${esc(f.l)}</label>${(v || []).map((x, i) => imageField(x, s, `${f.k}.${i}`, '')).join('')}</div>`;
      case 'days': return `<div class="f">${lab()}<div class="days" ${a} data-t="days">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" value="${d}" data-s="${esc(s)}" data-k="${esc(f.k)}" data-t="days" ${(v || []).map(Number).includes(d) ? 'checked' : ''}>${DAYS[d]}</label>`).join('')}</div></div>`;
      case 'category': { const cats = [...new Set(st.site.collections.courses.map(c => c.category).filter(Boolean))]; return `<div class="f">${lab()}<select ${a} data-t="text"><option value="">Alle Kategorien</option>${cats.map(c => `<option ${v === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`; }
      case 'pcategory': { const cats = [...new Set((st.site.collections.products || []).map(c => c.category).filter(Boolean))]; return `<div class="f">${lab()}<select ${a} data-t="text"><option value="">Alle Kategorien</option>${cats.map(c => `<option ${v === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`; }
      case 'form': return `<div class="f">${lab()}<select ${a} data-t="text">${st.site.forms.map(fm => `<option value="${esc(fm.id)}" ${v === fm.id ? 'selected' : ''}>${esc(fm.name)} → ${esc(fm.recipients || 'kein Empfänger')}</option>`).join('')}</select></div>`;
      case 'challenges': { const sel = (v || []).map(String); const chs = st.site.collections.challenges.slice().sort((x, y) => y.month.localeCompare(x.month));
        return `<div class="f">${lab(` <small>${sel.length ? sel.length + ' gewählt' : 'automatisch'}</small>`)}<div class="multi">${chs.map(c => `<label class="tg"><span>${esc(c.icon || '🏆')} ${esc(c.title)} <small style="color:var(--mu);font-weight:500">${esc(c.month)}</small></span><input type="checkbox" value="${esc(c.id)}" data-s="${esc(s)}" data-k="${esc(f.k)}" data-t="multi" ${sel.includes(c.id) ? 'checked' : ''}><i></i></label>`).join('') || '<p class="hint">Noch keine Challenges.</p>'}</div>${hint}</div>`; }
      case 'challenge': return `<div class="f">${lab()}<select ${a} data-t="text"><option value="current">Automatisch: aktueller Monat</option>${st.site.collections.challenges.map(c => `<option value="${esc(c.id)}" ${v === c.id ? 'selected' : ''}>${esc(c.month)} · ${esc(c.title)}</option>`).join('')}</select></div>`;
      case 'list': return listField(f, v || [], obj, s);
      case 'collection': return `<button class="btn ghost lnk" data-open-coll="${esc(f.c)}">${esc(f.l)} →</button>`;
      case 'settings': return `<button class="btn ghost lnk" data-open-set="${esc(f.s)}">${esc(f.l)} →</button>`;
      case 'tab': return `<button class="btn ghost lnk" data-a="open-tab" data-v="${esc(f.s)}">${esc(f.l)} →</button>`;
      case 'info': return `<div class="info">${esc(f.l)}</div>`;
      default: return '';
    }
  }
  function listField(f, arr, obj, s) {
    listDefs[`${s}|${f.k}`] = f;
    return `<div class="f"><label>${esc(f.l)} <small>${arr.length}</small></label><div class="list">${arr.map((it, i) => {
      const key = `${s}|${f.k}|${i}`; const open = st.open.has(key);
      const title = plain(it.title || it.name || it.label || it.caption || it.code || (it.date ? `${it.date}${it.time ? ' ' + it.time : ''}${it.title ? ' · ' + it.title : ''}` : '') || `Eintrag ${i + 1}`);
      return `<div class="card ${open ? 'open' : ''}"><div class="ch" data-toggle="${esc(key)}"><span class="chev">›</span><b>${esc(title)}${it.highlight ? ' ★' : ''}</b>
        <button class="btn ghost sm" data-lmove="${esc(key)}|-1" title="Nach oben">↑</button><button class="btn ghost sm" data-lmove="${esc(key)}|1" title="Nach unten">↓</button><button class="btn ghost sm" data-ldup="${esc(key)}" title="Duplizieren">⧉</button><button class="btn ghost sm" data-ldel="${esc(key)}" title="Löschen">✕</button></div>
        ${open ? `<div class="cb">${f.fields.map(sf => fieldHTML({ ...sf, k: `${f.k}.${i}.${sf.k}` }, obj, s)).join('')}</div>` : ''}</div>`;
    }).join('')}<button class="btn ghost sm add" data-ladd="${esc(s)}|${esc(f.k)}">+ Hinzufügen</button></div></div>`;
  }

  /* ---------- Linkes Panel ---------- */
  function renderLeft() {
    const L = $('#left');
    const y = L.scrollTop;
    document.querySelectorAll('#rail button').forEach(b => b.classList.toggle('on', b.dataset.tab === st.tab));
    applyView();
    if (WS_TABS.has(st.tab)) return;
    L.innerHTML = ({ blocks: libHTML, layers: layersHTML, pages: pagesHTML, content: contentHTML, settings: settingsHTML, inbox: inboxHTML }[st.tab] || libHTML)()
      + `<datalist id="dl-links">${linkOptions().map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
    L.scrollTop = y;
  }
  function libHTML() {
    const q = st.q.toLowerCase();
    const groups = SC.cats.map(cat => {
      const items = Object.entries(SC.blocks).filter(([k, d]) => d.cat === cat && (!q || (d.label + d.desc).toLowerCase().includes(q)));
      if (!items.length) return '';
      return `<div class="grp">${esc(cat)}</div><div class="lib">${items.map(([k, d]) => `<div class="tile" data-type="${k}" tabindex="0" role="button" title="In die Vorschau ziehen oder klicken"><i>${d.icon}</i><b>${esc(d.label)}</b><span>${esc(d.desc)}</span></div>`).join('')}</div>`;
    }).join('');
    return `<div class="pane"><h2>Block-Bibliothek</h2><p class="sub">Block in die Vorschau ziehen – oder klicken, um ihn unter dem ausgewählten Block einzufügen.</p>
      <input class="search" id="libSearch" placeholder="Suchen …" value="${esc(st.q)}">${groups || '<p class="sub">Nichts gefunden.</p>'}</div>`;
  }
  function blockTitle(b) { const d = SC.blocks[b.type] || { label: b.type, variants: {} }; return { label: d.label, icon: d.icon || '□', variant: (d.variants || {})[b.variant] || b.variant, text: plain(b.props.title || b.props.eyebrow || (b.props.items || [])[0] || '').slice(0, 40) }; }
  function layersHTML() {
    const bl = blocks();
    return `<div class="pane"><h2>Struktur <small style="color:var(--mu);font-weight:500">${esc(page().title)}</small></h2><p class="sub">Am Griff ⠿ ziehen zum Sortieren. Klick wählt den Block aus.</p>
      <div class="layers" id="layers">${bl.map((b, i) => { const t = blockTitle(b); return `<div class="layer ${st.sel === b.id ? 'sel' : ''} ${b.hidden ? 'off' : ''}" data-layer="${esc(b.id)}" data-i="${i}">
        <span class="hd" data-lhandle>⠿</span><span class="ic">${t.icon}</span><span class="nm"><b>${esc(t.label)}</b><small>${esc(t.variant)}${t.text ? ' · ' + esc(t.text) : ''}</small></span>
        <span class="ac"><button data-bact="hide" data-bid="${esc(b.id)}" title="${b.hidden ? 'Einblenden' : 'Ausblenden'}">${b.hidden ? '◌' : '◉'}</button><button data-bact="dup" data-bid="${esc(b.id)}" title="Duplizieren">⧉</button><button data-bact="del" data-bid="${esc(b.id)}" title="Löschen">✕</button></span></div>`; }).join('') || '<p class="sub">Noch keine Blöcke. Zieh welche aus der Bibliothek in die Vorschau.</p>'}</div></div>`;
  }
  function pagesHTML() {
    return `<div class="pane"><h2>Seiten <button class="btn primary sm" data-page-add>+ Neue Seite</button></h2><p class="sub">Reihenfolge = Reihenfolge im Menü.</p><div class="cards">${st.site.pages.map((p, i) => {
      const key = 'page|' + p.id; const open = st.open.has(key);
      return `<div class="card ${p.id === st.pageId ? 'on' : ''} ${open ? 'open' : ''}"><div class="ch" data-toggle="${esc(key)}"><span class="chev">›</span><b>${esc(p.title)}</b><small>/${esc(p.slug)}${p.nav ? '' : ' · nicht im Menü'}</small>
        <button class="btn ghost sm" data-goto="${esc(p.id)}" title="Bearbeiten">✎</button></div>
        ${open ? `<div class="cb">${fieldHTML({ k: 'title', t: 'text', l: 'Titel' }, p, 'p:' + p.id)}${p.slug !== '' || p.id !== 'home' ? fieldHTML({ k: 'slug', t: 'text', l: 'URL', h: `Erreichbar unter /#/${p.slug}` }, p, 'p:' + p.id) : ''}
          ${fieldHTML({ k: 'nav', t: 'toggle', l: 'Im Menü anzeigen' }, p, 'p:' + p.id)}${fieldHTML({ k: 'seo.title', t: 'text', l: 'SEO-Titel', max: 60 }, p, 'p:' + p.id)}${fieldHTML({ k: 'seo.description', t: 'textarea', l: 'SEO-Beschreibung', max: 160 }, p, 'p:' + p.id)}
          <div class="ins-actions"><button class="btn ghost sm" data-page-move="${i}|-1">↑ Hoch</button><button class="btn ghost sm" data-page-move="${i}|1">↓ Runter</button>${p.id !== 'home' ? `<button class="btn danger sm" data-page-del="${esc(p.id)}">Löschen</button>` : '<span></span>'}</div></div>` : ''}</div>`;
    }).join('')}</div></div>`;
  }
  function contentHTML() {
    if (!st.coll) {
      return `<div class="pane"><h2>Inhalte</h2><p class="sub">Daten, die in mehreren Blöcken genutzt werden.</p><div class="colls">${Object.entries(SC.collections).map(([k, d]) => `<button class="coll" data-coll="${k}"><i>${d.icon}</i><b>${esc(d.label)}</b><small>${(st.site.collections[k] || []).length} Einträge</small></button>`).join('')}</div></div>`;
    }
    const d = SC.collections[st.coll]; const items = (st.site.collections[st.coll] = st.site.collections[st.coll] || []);
    const q = st.q.toLowerCase();
    const shown = items.map((it, i) => ({ it, i })).filter(x => !q || JSON.stringify(x.it).toLowerCase().includes(q)).sort((a, b) => d.sort ? d.sort(a.it, b.it) : 0);
    return `<div class="pane"><button class="back" data-coll="">← Alle Inhalte</button><h2>${d.icon} ${esc(d.label)} <button class="btn primary sm" data-iadd>+ Neu</button></h2>
      ${d.note ? `<div class="info" style="margin:0 0 12px">${esc(d.note)}</div>` : ''}<input class="search" id="collSearch" placeholder="Filtern …" value="${esc(st.q)}"><div class="cards">${shown.map(({ it }) => {
        const key = `c|${st.coll}|${it.id}`; const open = st.open.has(key);
        return `<div class="card ${open ? 'open' : ''}"><div class="ch" data-toggle="${esc(key)}"><span class="chev">›</span><b>${esc(plain(d.title(it)))}</b>${d.sort || q ? '' : `<button class="btn ghost sm" data-imove="${esc(it.id)}|-1" title="Nach oben">↑</button><button class="btn ghost sm" data-imove="${esc(it.id)}|1" title="Nach unten">↓</button>`}<button class="btn ghost sm" data-idup="${esc(it.id)}" title="Duplizieren">⧉</button><button class="btn ghost sm" data-idel="${esc(it.id)}" title="Löschen">✕</button></div>
          ${open ? `<div class="cb">${d.fields.map(f => fieldHTML(f, it, `c:${st.coll}:${it.id}`)).join('')}</div>` : ''}</div>`;
      }).join('') || '<p class="sub">Keine Einträge.</p>'}</div></div>`;
  }
  function settingsHTML() {
    const s = st.site.settings;
    const tabs = { general: 'Allgemein', contact: 'Kontakt', hours: 'Öffnungszeiten', forms: 'Formulare & E-Mail', booking: 'Kursbuchung', shop: 'Shop', measure: 'Messpunkte', seo: 'SEO', account: 'Konto', data: 'Daten' };
    let body = '';
    const F = (k, t, l, extra = {}) => fieldHTML({ k, t, l, ...extra }, s, 's');
    if (st.setTab === 'general') body = F('name', 'text', 'Studio-Name') + F('short', 'text', 'Kurzname (Logo)') + F('tagline', 'text', 'Slogan') + F('accent', 'color', 'Akzentfarbe') +
      F('header.ctaLabel', 'text', 'Header-Button Text') + F('header.ctaHref', 'link', 'Header-Button Link') + F('header.memberLabel', 'text', 'Mitglieder-Button') + F('demoNote', 'textarea', 'Hinweis im Footer');
    if (st.setTab === 'contact') body = F('contact.street', 'text', 'Straße') + `<div class="row2">${F('contact.zip', 'text', 'PLZ')}${F('contact.city', 'text', 'Ort')}</div>` + F('contact.phone', 'text', 'Telefon') + F('contact.email', 'text', 'E-Mail') + F('social.instagram', 'link', 'Instagram') + F('social.facebook', 'link', 'Facebook');
    if (st.setTab === 'hours') {
      const w = s.hours.week; const status = P()?.status ? P().status() : null;
      body = `${status ? `<div class="info" style="background:${status.open ? '#0f1d14' : '#1b1b1f'};border-color:${status.open ? '#1f4d2e' : 'var(--line)'};color:${status.open ? '#86efac' : 'var(--mu)'}">● Live-Status: <b>${esc(status.title)}</b><br>${esc(status.sub)}</div>` : ''}
        <div class="grp">Wochenplan</div>${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="dayrow"><b>${DAYS[d]}</b><div>${(w[d] || []).map((r, ri) => `<div class="range"><input type="time" data-s="s" data-k="hours.week.${d}.${ri}.0" data-t="text" value="${esc(r[0])}"><span>–</span><input type="time" data-s="s" data-k="hours.week.${d}.${ri}.1" data-t="text" value="${esc(r[1])}"><button data-hdel="${d}|${ri}" title="Entfernen">✕</button></div>`).join('') || '<div class="closed">Geschlossen</div>'}
          <button class="btn ghost sm" data-hadd="${d}">+ Zeitraum</button></div></div>`).join('')}
        ${F('hours.note', 'text', 'Hinweis (z. B. „Personaltraining auf Anfrage")')}
        ${listField({ k: 'hours.exceptions', l: 'Ausnahmen (Feiertage, Urlaub)', item: { date: new Date().toISOString().slice(0, 10), closed: true, from: '', to: '', note: '' }, fields: [{ k: 'date', t: 'date', l: 'Datum' }, { k: 'closed', t: 'toggle', l: 'Ganztägig geschlossen' }, { k: 'from', t: 'time', l: 'Sonst geöffnet von' }, { k: 'to', t: 'time', l: 'bis' }, { k: 'note', t: 'text', l: 'Hinweis' }] }, s.hours.exceptions || [], s, 's')}`;
    }
    if (st.setTab === 'forms') {
      const used = id => st.site.pages.flatMap(p => p.blocks.filter(b => b.props && b.props.formId === id).map(b => `${p.title} › ${(SC.blocks[b.type] || {}).label}`));
      body = `<p class="sub">Jedes Formular hat eigene Empfänger. Anfragen landen im Tab „Anfragen" und werden per E-Mail weitergeleitet, sobald SMTP am Server konfiguriert ist.</p>
        <div class="cards">${st.site.forms.map(fm => { const key = 'form|' + fm.id; const open = st.open.has(key); const u = used(fm.id);
          return `<div class="card ${open ? 'open' : ''}"><div class="ch" data-toggle="${esc(key)}"><span class="chev">›</span><b>${esc(fm.name)}</b><small>${esc(fm.recipients || '⚠ kein Empfänger')}</small></div>
          ${open ? `<div class="cb">${SC.forms.fields.map(f => fieldHTML(f, fm, 'f:' + fm.id)).join('')}<div class="info">Verwendet in: ${u.length ? u.map(esc).join(', ') : 'noch keinem Block'}</div>
          <button class="btn danger sm lnk" data-fdel="${esc(fm.id)}" ${u.length ? 'disabled title="Wird noch verwendet"' : ''}>Formular löschen</button></div>` : ''}</div>`; }).join('')}</div>
        <button class="btn primary sm lnk" data-fadd>+ Neues Formular</button>`;
    }
    if (st.setTab === 'booking') body = `<p class="sub">Regeln für die Kursbuchung auf der Website. Laufen wie alle Website-Inhalte über Entwurf und Veröffentlichen.</p>` + F('booking.weeksAhead', 'number', 'Buchbar bis … Wochen im Voraus', { h: 'Beispiel: 8 = Kunden sehen und buchen Termine der nächsten 8 Wochen.' }) + F('booking.maxSeries', 'number', 'Längste Serie (Wochen)', { h: 'Maximale Zahl wöchentlicher Wiederholungen bei einer Buchung.' }) + F('booking.cancelHours', 'number', 'Stornieren bis … Stunden vor Kursbeginn', { h: 'Danach können Kunden nicht mehr selbst stornieren. Im Admin geht es immer.' }) + F('booking.recipients', 'text', 'E-Mail-Empfänger bei Buchung/Storno', { h: 'Mehrere mit Komma trennen. Versand nur, wenn SMTP am Server konfiguriert ist.' });
    if (st.setTab === 'shop') body = `<p class="sub">Bestellung mit Abholung im Studio, Bezahlung vor Ort. Produkte pflegst du unter Inhalte → Produkte.</p>` + F('shop.recipients', 'text', 'E-Mail-Empfänger für Bestellungen', { h: 'Mehrere mit Komma trennen. Versand nur, wenn SMTP am Server konfiguriert ist.' }) + F('shop.pickupNote', 'textarea', 'Hinweis zu Abholung & Bezahlung', { h: 'Wird im Warenkorb und in der Bestätigung angezeigt.' }) + `<button class="btn ghost lnk" data-open-coll="products">Produkte bearbeiten →</button>`;
    if (st.setTab === 'measure') {
      const ml = (k, l) => listField({ k: `measure.${k}`, l, item: { label: '', key: '' }, fields: [{ k: 'label', t: 'text', l: 'Bezeichnung' }, { k: 'key', t: 'text', l: 'Key (intern)', h: 'Wird aus der Bezeichnung erzeugt. Nach dem ersten Eintragen von Messwerten nicht mehr ändern, sonst sind die alten Werte nicht mehr zugeordnet.' }] }, (s.measure || {})[k] || [], s, 's');
      body = `<p class="sub">Welche Messpunkte du im Bereich Kunden → Messungen einträgst und welche Kunden sehen. Reihenfolge = Reihenfolge der Spalten.</p>${ml('skinfolds', 'Hautfalten (mm)')}${ml('girths', 'Umfänge (cm)')}`;
    }
    if (st.setTab === 'seo') body = F('seo.title', 'text', 'Standard-Titel', { max: 60 }) + F('seo.description', 'textarea', 'Standard-Beschreibung', { max: 160 }) + '<div class="info">Pro Seite unter „Seiten", pro Beitrag unter „Inhalte → Blog" überschreibbar. Strukturierte Daten (Schema.org HealthClub / BlogPosting) werden automatisch erzeugt.</div>';
    if (st.setTab === 'account') body = `<p class="sub">Zugang zum Admin-Panel. Nach dem Ändern werden alle anderen Sitzungen abgemeldet.</p>
      <form id="pwForm" autocomplete="on"><div class="f"><label>Benutzername</label><input type="text" name="user" autocomplete="username" value="${esc(st.user || '')}"></div>
      <div class="f"><label>Aktuelles Passwort</label><input type="password" name="current" autocomplete="current-password" required></div>
      <div class="f"><label>Neues Passwort <small>mind. 8 Zeichen</small></label><input type="password" name="new" autocomplete="new-password" minlength="8" required></div>
      <div class="f"><label>Neues Passwort wiederholen</label><input type="password" name="repeat" autocomplete="new-password" required></div>
      <button class="btn primary lnk">Zugang speichern</button></form>`;
    if (st.setTab === 'data') body = `<p class="sub">Sicherung & Wiederherstellung aller Inhalte.</p><button class="btn ghost lnk" data-export>⬇ Inhalte als JSON exportieren</button>
      <label class="btn ghost lnk">⬆ JSON importieren<input type="file" accept="application/json" hidden data-import></label><button class="btn danger lnk" data-discard>Entwurf verwerfen (zurück zur veröffentlichten Version)</button>
      <div class="info">Der Server legt bei jedem Veröffentlichen automatisch ein Backup in data/backups/ an (die letzten 30).</div>`;
    return `<div class="pane"><h2>Einstellungen</h2><div class="subtabs">${Object.entries(tabs).map(([k, l]) => `<button data-settab="${k}" class="${st.setTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}</div>`;
  }
  function inboxHTML() {
    const n = st.inbox.filter(m => m.status === 'neu').length;
    return `<div class="pane"><h2>Anfragen <button class="btn ghost sm" data-inbox-reload>↻</button></h2><p class="sub">${st.inbox.length} gesamt · ${n} neu. Jede Anfrage zeigt, an wen sie weitergeleitet wurde.</p>
      ${st.inbox.map(m => `<div class="msg ${m.status === 'neu' ? 'neu' : ''}"><div class="mh"><span>${esc(m.formName)}</span><span>${esc(m.createdAt.replace('T', ' ').slice(0, 16))}</span></div>
        <b>${esc(m.fields.Name || 'Ohne Namen')} · ${esc(m.fields.Betreff || '')}</b><dl>${Object.entries(m.fields).filter(([k]) => k !== 'Name').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        <div class="route">→ ${esc((m.recipients || []).join(', ') || 'kein Empfänger')} ${m.mailed ? '· gesendet ✓' : '· gespeichert (SMTP nicht konfiguriert)'}</div>
        <div class="mf"><button class="btn ghost sm" data-istatus="${esc(m.id)}|${m.status === 'neu' ? 'erledigt' : 'neu'}">${m.status === 'neu' ? '✓ Erledigt' : '↺ Als neu markieren'}</button>${m.fields['E-Mail'] ? `<a class="btn ghost sm" href="mailto:${esc(m.fields['E-Mail'])}">Antworten</a>` : ''}<button class="btn danger sm" data-idelmsg="${esc(m.id)}">Löschen</button></div></div>`).join('') || '<p class="sub">Noch keine Anfragen. Teste ein Formular auf der Live-Seite.</p>'}</div>`;
  }
  async function loadInbox() {
    try { st.inbox = await (await fetch('/api/inbox')).json(); } catch { st.inbox = []; }
    const n = st.inbox.filter(m => m.status === 'neu').length; const b = $('#inboxCount'); b.hidden = !n; b.textContent = n;
    if (st.tab === 'inbox') renderLeft();
  }

  /* ---------- Rechtes Panel (Inspector) ---------- */
  function renderRight() {
    const R = $('#right'); const y = R.scrollTop;
    const b = st.sel && findBlock(st.sel);
    if (!b) {
      const pg = page();
      R.innerHTML = `<div class="empty-ins"><h3>${esc(pg.title)}</h3><p>${pg.blocks.length} Blöcke · /${esc(pg.slug)}</p><ol>
        <li><b>Block hinzufügen:</b> aus der Bibliothek links in die Vorschau ziehen.</li><li><b>Text ändern:</b> direkt in der Vorschau anklicken und tippen. <kbd>Esc</kbd> beendet.</li>
        <li><b>Bild tauschen:</b> Bild aus dem Finder direkt auf ein Bild in der Vorschau ziehen.</li><li><b>Stil wechseln:</b> Block anklicken → rechts „Stil" wählen.</li>
        <li><b>Sortieren:</b> am Griff ⠿ ziehen oder unter „Struktur".</li><li><b>Rückgängig:</b> <kbd>⌘Z</kbd> · Wiederholen <kbd>⇧⌘Z</kbd></li></ol>
        <p style="margin-top:16px">Änderungen werden automatisch als Entwurf gespeichert. Erst „Veröffentlichen" macht sie live.</p></div>`;
      return;
    }
    const d = SC.blocks[b.type] || { label: b.type, variants: {}, fields: [] };
    R.innerHTML = `<div class="ins-head"><i>${d.icon}</i><div><b>${esc(d.label)}</b><small>${esc(page().title)} · #${esc(b.id)}</small></div><button class="x" data-desel title="Auswahl aufheben">×</button></div>
      <div class="ins-body"><div class="grp">Stil</div><div class="chipset">${Object.entries(d.variants).map(([k, l]) => `<button data-variant="${k}" class="${b.variant === k ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
      <div class="grp">Inhalt</div>${d.fields.map(f => fieldHTML(f, b.props, 'b:' + b.id)).join('')}
      <div class="ins-actions"><button class="btn ghost sm" data-bact="dup" data-bid="${esc(b.id)}">⧉ Duplizieren</button><button class="btn ghost sm" data-bact="hide" data-bid="${esc(b.id)}">${b.hidden ? '◌ Einblenden' : '◉ Ausblenden'}</button><button class="btn danger sm" data-bact="del" data-bid="${esc(b.id)}">✕ Löschen</button></div></div>`;
    R.scrollTop = y;
  }

  /* ---------- Block-Operationen ---------- */
  function newBlock(type) {
    const d = SC.blocks[type];
    return { id: uid(type.slice(0, 3)), type, variant: Object.keys(d.variants)[0], props: demoAssets(clone(d.defaults)) };
  }
  function insertBlock(type, idx) {
    const bl = blocks(); const b = newBlock(type);
    if (idx == null) { const si = bl.findIndex(x => x.id === st.sel); idx = si >= 0 ? si + 1 : bl.length; }
    bl.splice(idx, 0, b); st.sel = b.id;
    touch({ left: true, right: true }); clearTimeout(prevT); pushPreview(true); P()?.select(b.id);
    toast(`${SC.blocks[type].label} eingefügt`);
  }
  function blockAction(id, act) {
    const bl = blocks(); const i = bl.findIndex(b => b.id === id); if (i < 0) return;
    const b = bl[i];
    if (act === 'up' && i > 0) [bl[i - 1], bl[i]] = [bl[i], bl[i - 1]];
    else if (act === 'down' && i < bl.length - 1) [bl[i + 1], bl[i]] = [bl[i], bl[i + 1]];
    else if (act === 'dup') { const c = clone(b); c.id = uid(b.type.slice(0, 3)); bl.splice(i + 1, 0, c); st.sel = c.id; }
    else if (act === 'hide') b.hidden = !b.hidden;
    else if (act === 'del') { if (!confirm(`„${(SC.blocks[b.type] || {}).label || b.type}" löschen? (Rückgängig mit ⌘Z möglich)`)) return; bl.splice(i, 1); if (st.sel === id) st.sel = null; }
    else return;
    touch({ left: true, right: true }); clearTimeout(prevT); pushPreview(true);
  }
  function moveBlock(from, to) {
    const bl = blocks(); if (from < 0 || from >= bl.length) return;
    const [b] = bl.splice(from, 1); bl.splice(Math.max(0, Math.min(to, bl.length)), 0, b); st.sel = b.id;
    touch({ left: true, right: true }); clearTimeout(prevT); pushPreview(true);
  }

  /* ---------- Bilder ---------- */
  async function uploadFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Bitte eine Bilddatei wählen', true); return null; }
    if (file.size > 8e6) { toast('Bild ist größer als 8 MB', true); return null; }
    const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, data }) });
      const j = await res.json(); if (!res.ok) throw new Error(j.error);
      toast('Bild hochgeladen ✓'); return j.url;
    } catch (e) { toast('Upload-Server nicht erreichbar – Bild wird eingebettet', true); return data; }
  }
  function setImage(s, k, url) { const o = scopeObj(s); if (!o || url == null) return; setP(o, k, url); touch({ left: true, right: true }); }
  let libTarget = null;
  async function openLibrary(s, k) {
    libTarget = { s, k }; $('#libModal').hidden = false;
    let imgs = [];
    try { imgs = await (await fetch('/api/images')).json(); } catch { imgs = ['/assets/img/studio-gym.jpg', '/assets/img/studio-bikes.jpg', '/assets/img/trainer-bench.jpg', '/assets/img/coach-marc-luca.jpg', '/assets/img/golf-simulator.jpg', '/assets/img/trackman.jpg', '/assets/img/golf-driver.jpg', '/assets/img/giftcard.jpg']; }
    $('#libGrid').innerHTML = imgs.map(u => `<button data-libimg="${esc(u)}" style="background-image:url('${esc(u)}')"><span>${esc(u.split('/').pop())}</span></button>`).join('');
  }

  /* ---------- Drag & Drop: Bibliothek → Vorschau ---------- */
  function startTileDrag(e, tile) {
    const type = tile.dataset.type; const sx = e.clientX, sy = e.clientY; let dragging = false;
    const ghost = $('#ghost'); const canvas = $('#canvas');
    tile.setPointerCapture(e.pointerId);
    let scrollT = null, lastY = 0;
    const local = ev => { const r = frame.getBoundingClientRect(); const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; return { inside, y: (ev.clientY - r.top) / st.scale, h: r.height / st.scale }; };
    const auto = () => { const m = P(); if (!m || !dragging) return; const r = frame.getBoundingClientRect(); const rel = lastY - r.top; const edge = 80; if (rel < edge) m.scrollBy(-24); else if (rel > Math.min(r.height, $('#frameWrap').clientHeight) - edge) m.scrollBy(24); };
    tile.onpointermove = ev => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!dragging) { dragging = true; canvas.classList.add('dragging'); ghost.hidden = false; ghost.textContent = '＋ ' + SC.blocks[type].label; scrollT = setInterval(auto, 30); }
      ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; lastY = ev.clientY;
      const l = local(ev); const m = P();
      if (l.inside && m) m.dropAt(l.y, '＋ ' + SC.blocks[type].label); else m?.clearDrop();
    };
    tile.onpointerup = ev => {
      tile.onpointermove = tile.onpointerup = null; clearInterval(scrollT);
      ghost.hidden = true; canvas.classList.remove('dragging');
      const m = P();
      if (!dragging) { insertBlock(type); return; }
      const l = local(ev);
      if (l.inside && m) { const idx = m.dropAt(l.y); m.clearDrop(); insertBlock(type, idx); } else m?.clearDrop();
    };
  }

  /* ---------- Drag & Drop: Struktur sortieren ---------- */
  function startLayerDrag(e, row) {
    e.preventDefault();
    const list = $('#layers'); const rows = [...list.querySelectorAll('.layer')]; const from = rows.indexOf(row);
    const h = row.querySelector('[data-lhandle]'); h.setPointerCapture(e.pointerId); row.style.opacity = '.5';
    let to = from;
    h.onpointermove = ev => {
      rows.forEach(r => r.classList.remove('drag-over-top', 'drag-over-bot'));
      to = rows.length;
      for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { to = i; break; } }
      if (to < rows.length) rows[to].classList.add('drag-over-top'); else rows[rows.length - 1].classList.add('drag-over-bot');
    };
    h.onpointerup = () => {
      h.onpointermove = h.onpointerup = null; row.style.opacity = '';
      rows.forEach(r => r.classList.remove('drag-over-top', 'drag-over-bot'));
      if (to !== from && to !== from + 1) moveBlock(from, to > from ? to - 1 : to);
    };
  }

  /* ---------- Schnittstelle für die Vorschau (iframe) ---------- */
  window.ADMIN = {
    ready() { if (st.site) pushPreview(true); },
    select(id, fromInline) {
      if (st.sel === id && fromInline) return;
      st.sel = id; renderRight(); if (st.tab === 'layers') renderLeft();
      P()?.select(id, true);
      if (id && window.innerWidth <= 900) document.querySelector('.shell').classList.add('ins');
    },
    update(path, value) {
      const [k, a, b, c] = path.split(':');
      const obj = k === 'b' ? findBlock(a)?.props : k === 'c' ? (st.site.collections[a] || []).find(x => x.id === b) : null;
      if (!obj) return;
      setP(obj, k === 'b' ? b : c, value); touch({ right: true });
      if (st.tab !== 'blocks') renderLeft();
    },
    action: blockAction,
    move: moveBlock,
    async uploadTo(path, file) {
      const [k, a, b, c] = path.split(':');
      const url = await uploadFile(file); if (!url) return;
      const obj = k === 'b' ? findBlock(a)?.props : (st.site.collections[a] || []).find(x => x.id === b);
      if (!obj) return;
      setP(obj, k === 'b' ? b : c, url); touch({ left: true, right: true });
    },
    navigate(slug) { const p = st.site.pages.find(x => x.slug === slug.replace(/^blog\/.*/, 'blog')); if (p) switchPage(p.id); },
    undo
  };

  /* ---------- Events ---------- */
  $('#rail').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) switchTab(b.dataset.tab); });
  $('#pageSel').addEventListener('change', e => switchPage(e.target.value));
  document.querySelectorAll('.devices button').forEach(b => b.onclick = () => { st.dev = b.dataset.dev; document.querySelectorAll('.devices button').forEach(x => x.classList.toggle('on', x === b)); layoutFrame(); });
  $('#undo').onclick = () => undo(false); $('#redo').onclick = () => undo(true);
  $('#publish').onclick = publish;
  $('#logout').onclick = async () => { commit(); await _fetch('/api/logout', { method: 'POST' }); location.href = 'login.html'; };
  $('#pwFix').onclick = () => { st.tab = 'settings'; st.setTab = 'account'; renderLeft(); setTimeout(() => document.querySelector('#pwForm [name=current]')?.focus(), 50); };
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'pwForm') return;
    e.preventDefault(); const f = e.target;
    if (f.new.value !== f.repeat.value) { toast('Die neuen Passwörter stimmen nicht überein', true); return; }
    const r = await fetch('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: f.user.value.trim(), current: f.current.value, new: f.new.value }) });
    const j = await r.json();
    if (!r.ok) { toast(j.error || 'Speichern fehlgeschlagen', true); return; }
    st.user = f.user.value.trim(); $('#userName').textContent = '👤 ' + st.user; $('#pwBanner').hidden = true; f.reset(); toast('Zugang gespeichert ✓');
  });
  addEventListener('resize', layoutFrame);
  frame.addEventListener('load', () => { layoutFrame(); if (st.site) pushPreview(true); });
  addEventListener('beforeunload', () => { if (st.site) commit(); });
  addEventListener('beforeunload', e => { if (wsDirty()) { e.preventDefault(); e.returnValue = ''; } });

  document.addEventListener('keydown', e => {
    const inField = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
    const inWs = WS_TABS.has(st.tab);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !inField && !inWs) { e.preventDefault(); undo(e.shiftKey); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (st.tab === 'members' && W.mem.cur) saveMember(); else if (!inWs) publish(); }
    if (e.key === 'Escape' && !$('#wsModal').hidden) closeModal();
    if (e.key === 'Escape' && !inField) { ADMIN.select(null); $('#libModal').hidden = true; }
  });

  // Feldeingaben (Delegation)
  function onField(e) {
    const el = e.target; if (!el.dataset || el.dataset.s == null || !el.dataset.k || el.type === 'file') return;
    const o = scopeObj(el.dataset.s); if (!o) return;
    let v;
    switch (el.dataset.t) {
      case 'toggle': v = el.checked; break;
      case 'number': v = el.value === '' ? '' : Number(el.value); break;
      case 'numsel': v = Number(el.value); break;
      case 'strings': v = el.value.split('\n').map(x => x.trim()).filter(Boolean); break;
      case 'days': v = [...el.closest('.days').querySelectorAll('input:checked')].map(i => Number(i.value)); break;
      case 'multi': v = [...el.closest('.multi').querySelectorAll('input:checked')].map(i => i.value); break;
      default: v = el.value;
    }
    // Messpunkte: Key folgt der Bezeichnung, solange er leer oder automatisch erzeugt ist
    const mm = /^(measure\.(?:skinfolds|girths)\.\d+)\.label$/.exec(el.dataset.k);
    if (mm) {
      const curKey = getP(o, mm[1] + '.key');
      if (!curKey || curKey === slugKey(getP(o, el.dataset.k))) { setP(o, mm[1] + '.key', slugKey(v)); const ki = document.querySelector(`input[data-s="s"][data-k="${mm[1]}.key"]`); if (ki) ki.value = slugKey(v); }
    }
    // Kurse dauern 1 h: Ende folgt dem Start, solange es nicht bewusst geändert wurde
    if (el.dataset.s.startsWith('c:courses:') && el.dataset.k === 'start') {
      const end = getP(o, 'end');
      if (!end || end === addHour(getP(o, 'start'))) { setP(o, 'end', addHour(v)); const ei = el.closest('.cb')?.querySelector('input[data-k="end"]'); if (ei) ei.value = addHour(v); }
    }
    setP(o, el.dataset.k, v);
    if (el.dataset.max) { const c = el.closest('.f')?.querySelector('[data-count]'); if (c) { c.textContent = `${el.value.length}/${el.dataset.max}`; c.classList.toggle('over', el.value.length > Number(el.dataset.max)); } }
    if (el.hasAttribute('data-imgurl')) { const th = el.closest('.img-f')?.querySelector('.th'); if (th) th.style.backgroundImage = el.value ? `url('${el.value}')` : ''; }
    if (el.type === 'color') el.parentElement.querySelector('input[type=text]').value = el.value;
    const structural = e.type === 'change' && (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color');
    if (el.dataset.k === 'slug' && el.dataset.s.startsWith('p:')) fillPages();
    touch(structural ? { left: st.tab !== 'blocks', right: el.closest('#right') && el.tagName === 'SELECT' } : {});
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', e => {
    if (e.target.matches('[data-upload]')) { const f = e.target.files[0]; const { ts, tk } = e.target.dataset; uploadFile(f).then(url => setImage(ts, tk, url)); return; }
    if (e.target.matches('[data-import]')) { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (!d.pages || !d.settings) throw new Error('Keine MPT-Inhalte'); st.site = d; st.pageId = d.pages[0].id; st.sel = null; touch({ left: true, right: true }); fillPages(); pushPreview(true); toast('Importiert ✓ (noch nicht veröffentlicht)'); } catch (err) { toast('Import fehlgeschlagen: ' + err.message, true); } }); return; }
    if (e.target.matches('#libFile')) { [...e.target.files].reduce((p, f) => p.then(() => uploadFile(f)), Promise.resolve()).then(() => openLibrary(libTarget?.s, libTarget?.k)); return; }
    onField(e);
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'libSearch' || e.target.id === 'collSearch') { st.q = e.target.value; const pos = e.target.selectionStart; renderLeft(); const n = document.getElementById(e.target.id); n.focus(); n.setSelectionRange(pos, pos); }
  });

  // Klicks (Delegation)
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-toggle],[data-ladd],[data-lmove],[data-ldup],[data-ldel],[data-open-coll],[data-open-set],[data-pick],[data-clearimg],[data-variant],[data-bact],[data-desel],[data-layer],[data-coll],[data-iadd],[data-imove],[data-idup],[data-idel],[data-goto],[data-page-add],[data-page-del],[data-page-move],[data-settab],[data-fadd],[data-fdel],[data-hadd],[data-hdel],[data-istatus],[data-idelmsg],[data-inbox-reload],[data-export],[data-discard],[data-libimg],[data-close],[data-color]');
    if (!t) { if (e.target === $('#libModal')) $('#libModal').hidden = true; return; }
    const D = t.dataset;
    if (D.toggle != null && !e.target.closest('button')) { st.open.has(D.toggle) ? st.open.delete(D.toggle) : st.open.add(D.toggle); t.closest('#right') ? renderRight() : renderLeft(); return; }
    if (D.toggle != null) return;
    const listOp = (key, fn) => { const [s, k, i] = key.split('|'); const o = scopeObj(s); const arr = getP(o, k); if (!Array.isArray(arr)) return; fn(arr, Number(i), s, k); touch({ left: true, right: true }); };
    if (D.ladd) { const [s, k] = D.ladd.split('|'); const o = scopeObj(s); const def = listDefs[D.ladd]; if (!o || !def) return; let arr = getP(o, k); if (!Array.isArray(arr)) { setP(o, k, []); arr = getP(o, k); } arr.push(clone(def.item)); st.open.add(`${s}|${k}|${arr.length - 1}`); touch({ left: true, right: true }); return; }
    if (D.lmove) { const parts = D.lmove.split('|'); const dir = Number(parts.pop()); listOp(parts.join('|'), (arr, i) => { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }); return; }
    if (D.ldup) { listOp(D.ldup, (arr, i) => arr.splice(i + 1, 0, clone(arr[i]))); return; }
    if (D.ldel) { listOp(D.ldel, (arr, i) => arr.splice(i, 1)); return; }
    if (D.openColl) { st.tab = 'content'; st.coll = D.openColl; st.q = ''; renderLeft(); return; }
    if (D.openSet) { st.tab = 'settings'; st.setTab = D.openSet; renderLeft(); return; }
    if (D.pick != null) { openLibrary(D.ts, D.tk); return; }
    if (D.clearimg != null) { setImage(D.ts, D.tk, ''); return; }
    if (D.libimg) { if (libTarget && libTarget.s) setImage(libTarget.s, libTarget.k, D.libimg); $('#libModal').hidden = true; return; }
    if (D.close != null) { $('#libModal').hidden = true; return; }
    if (D.color) { setImage(D.ts, D.tk, D.color); return; }
    if (D.variant) { const b = findBlock(st.sel); if (b) { b.variant = D.variant; touch({ left: true, right: true }); clearTimeout(prevT); pushPreview(true); } return; }
    if (D.bact) { blockAction(D.bid, D.bact); return; }
    if (D.desel != null) { ADMIN.select(null); document.querySelector('.shell').classList.remove('ins'); return; }
    if (D.layer && !e.target.closest('button,[data-lhandle]')) { ADMIN.select(D.layer); P()?.select(D.layer); return; }
    if (D.coll != null) { st.coll = D.coll || null; st.q = ''; renderLeft(); return; }
    if (D.iadd != null) { const d = SC.collections[st.coll]; const it = { id: uid(st.coll.slice(0, 2)), ...d.item() }; const arr = st.site.collections[st.coll];
      // ohne feste Sortierung (z. B. Team) zählt die Reihenfolge: neue Einträge ans Ende
      if (d.sort) arr.unshift(it); else arr.push(it);
      st.open.add(`c|${st.coll}|${it.id}`); touch({ left: true });
      if (!d.sort) requestAnimationFrame(() => document.querySelector(`#left [data-idel="${CSS.escape(it.id)}"]`)?.closest('.card')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
      return; }
    if (D.imove) { const [id, dir] = D.imove.split('|'); const arr = st.site.collections[st.coll]; const i = arr.findIndex(x => x.id === id); const j = i + Number(dir); if (i < 0 || j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; touch({ left: true }); return; }
    if (D.idup) { const arr = st.site.collections[st.coll]; const i = arr.findIndex(x => x.id === D.idup); const c = clone(arr[i]); c.id = uid(st.coll.slice(0, 2)); if (c.slug) c.slug += '-kopie'; arr.splice(i + 1, 0, c); touch({ left: true }); return; }
    if (D.idel) { if (!confirm('Eintrag löschen?')) return; st.site.collections[st.coll] = st.site.collections[st.coll].filter(x => x.id !== D.idel); touch({ left: true }); return; }
    if (D.goto) { switchPage(D.goto); return; }
    if (D.pageAdd != null) {
      const title = prompt('Name der neuen Seite:', 'Neue Seite'); if (!title) return;
      const slug = title.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seite';
      const id = uid('pg'); const hero = newBlock('hero'); hero.variant = 'compact'; hero.props.title = title; hero.props.eyebrow = st.site.settings.short;
      st.site.pages.push({ id, slug: st.site.pages.some(p => p.slug === slug) ? slug + '-2' : slug, title, nav: true, seo: { title: '', description: '' }, blocks: [hero, newBlock('contact')] });
      fillPages(); switchPage(id); st.tab = 'blocks'; touch({ left: true }); toast('Seite angelegt – zieh jetzt Blöcke hinein'); return;
    }
    if (D.pageDel) { if (!confirm('Seite inklusive aller Blöcke löschen?')) return; st.site.pages = st.site.pages.filter(p => p.id !== D.pageDel); if (st.pageId === D.pageDel) st.pageId = st.site.pages[0].id; fillPages(); touch({ left: true, right: true }); pushPreview(true); return; }
    if (D.pageMove) { const [i, dir] = D.pageMove.split('|').map(Number); const arr = st.site.pages; const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; fillPages(); touch({ left: true }); return; }
    if (D.settab) { st.setTab = D.settab; renderLeft(); return; }
    if (D.fadd != null) { const f = SC.forms.item(); st.site.forms.push(f); st.open.add('form|' + f.id); touch({ left: true }); return; }
    if (D.fdel) { if (!confirm('Formular löschen?')) return; st.site.forms = st.site.forms.filter(f => f.id !== D.fdel); touch({ left: true }); return; }
    if (D.hadd != null) { const w = st.site.settings.hours.week; (w[D.hadd] = w[D.hadd] || []).push(['16:00', '21:00']); touch({ left: true }); return; }
    if (D.hdel) { const [d, i] = D.hdel.split('|'); st.site.settings.hours.week[d].splice(Number(i), 1); touch({ left: true }); return; }
    if (D.istatus) { const [id, status] = D.istatus.split('|'); fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).then(loadInbox); return; }
    if (D.idelmsg) { if (!confirm('Anfrage löschen?')) return; fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: D.idelmsg, delete: true }) }).then(loadInbox); return; }
    if (D.inboxReload != null) { loadInbox(); return; }
    if (D.export != null) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(st.site, null, 2)], { type: 'application/json' })); a.download = `mpt-inhalte-${new Date().toISOString().slice(0, 10)}.json`; a.click(); return; }
    if (D.discard != null) { if (!e.target.closest('.banner.warn') && !confirm('Alle unveröffentlichten Änderungen verwerfen?')) return; commit(); st.hist.push(st.last); st.site = JSON.parse(st.published); st.last = st.published; st.sel = null; saveDraft(); fillPages(); renderLeft(); renderRight(); pushPreview(true); updateState(); $('#banner').hidden = true; toast('Entwurf verworfen'); return; }
  });

  // Pointer: Bibliothek & Struktur
  document.addEventListener('pointerdown', e => {
    const tile = e.target.closest('.tile[data-type]'); if (tile && e.button === 0) { startTileDrag(e, tile); return; }
    const h = e.target.closest('[data-lhandle]'); if (h) startLayerDrag(e, h.closest('.layer'));
  });
  document.addEventListener('keydown', e => {
    const tile = e.target.closest?.('.tile[data-type]'); if (tile && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); insertBlock(tile.dataset.type); }
  });

  // Datei-Drop auf Bild-Felder im Panel und in der Bibliothek
  document.addEventListener('dragover', e => {
    const t = e.target.closest('[data-imgdrop],#libDrop'); if (!t) return;
    e.preventDefault(); t.classList.add('drop');
  });
  document.addEventListener('dragleave', e => e.target.closest?.('[data-imgdrop],#libDrop')?.classList.remove('drop'));
  document.addEventListener('drop', e => {
    const t = e.target.closest('[data-imgdrop],#libDrop'); if (!t) { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); return; }
    e.preventDefault(); t.classList.remove('drop');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (t.id === 'libDrop') { files.reduce((p, f) => p.then(() => uploadFile(f)), Promise.resolve()).then(() => openLibrary(libTarget?.s, libTarget?.k)); return; }
    if (files[0]) uploadFile(files[0]).then(url => setImage(t.dataset.ts, t.dataset.tk, url));
  });

  /* ---------- Arbeitsbereiche: Kunden, Buchungen, Bestellungen ----------
     Eigene Daten (members/bookings/orders), völlig getrennt vom Website-Entwurf: kein Undo, kein Veröffentlichen. */
  const WS_TABS = new Set(['members', 'bookings', 'orders']);
  const WSEL = $('#workspace');
  const mid = p => `${p}_${Math.random().toString(36).slice(2, 8)}`;
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const mondayOf = s => addDays(s, -((parseYmd(s).getDay() + 6) % 7));
  const today = () => ymd(new Date());
  const fmtDate = (s, o) => s ? parseYmd(s).toLocaleDateString('de-DE', o || { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const fmtTs = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }); };
  const eur = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const fmtNum = v => (v == null || v === '') ? '' : String(v).replace('.', ',');
  const addHour = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? `${String((+m[1] + 1) % 24).padStart(2, '0')}:${m[2]}` : ''; };
  const slugKey = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const isoWeek = s => { const d = parseYmd(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
  const DEF_MEASURE = {
    skinfolds: [['kinn', 'Kinn'], ['wange', 'Wange'], ['brust', 'Brust'], ['trizeps', 'Trizeps'], ['subskapular', 'Schulterblatt'], ['achsel', 'Mittlere Achsel'], ['suprailiakal', 'Hüfte (Suprailiakal)'], ['bauch', 'Bauch (Nabel)'], ['knie', 'Knie'], ['wade', 'Wade'], ['oberschenkel', 'Oberschenkel vorne'], ['hamstring', 'Oberschenkel hinten']].map(([key, label]) => ({ key, label })),
    girths: [['brust', 'Brust'], ['bauch', 'Bauch'], ['huefte', 'Hüfte'], ['oberarm', 'Oberarm'], ['oberschenkel', 'Oberschenkel']].map(([key, label]) => ({ key, label }))
  };
  const measure = () => { const m = (st.site && st.site.settings && st.site.settings.measure) || {}; return { skinfolds: m.skinfolds || DEF_MEASURE.skinfolds, girths: m.girths || DEF_MEASURE.girths }; };
  // vor dem Veröffentlichen: leere Keys aus der Bezeichnung füllen, leere Zeilen entfernen, doppelte Keys melden
  function normalizeMeasure() {
    const m = st.site && st.site.settings && st.site.settings.measure; if (!m) return true;
    for (const k of ['skinfolds', 'girths']) {
      if (!Array.isArray(m[k])) continue;
      m[k] = m[k].filter(x => (x.label || '').trim() || (x.key || '').trim());
      m[k].forEach(x => { x.label = (x.label || '').trim(); x.key = slugKey(x.key || x.label); });
      const dup = m[k].find((x, i) => m[k].findIndex(y => y.key === x.key) !== i);
      if (dup) { toast(`Messpunkte: Der Key „${dup.key}" kommt doppelt vor. Bitte eindeutig machen.`, true); st.tab = 'settings'; st.setTab = 'measure'; renderLeft(); return false; }
    }
    return true;
  }
  async function api(path, body) {
    const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch { }
    if (!r.ok) throw new Error((j && j.error) || `Server-Fehler ${r.status}`);
    return j || {};
  }
  const W = {
    mem: { list: null, state: 'idle', err: '', q: '', cur: null, snap: '', loadingId: null, sub: 'data', planId: null, trainPlan: null, log: null, logTouched: false, invite: null, saving: false },
    bk: { week: mondayOf(today()), items: [], state: 'idle', err: '' },
    or: { items: [], state: 'idle', err: '', filter: 'all' }
  };
  const snapOf = m => { const c = { ...m }; delete c.hasPassword; delete c.invitePending; return JSON.stringify(c); };
  const wsDirty = () => !!(W.mem.cur && (snapOf(W.mem.cur) !== W.mem.snap || W.mem.logTouched));
  const wsLeaveOk = () => !wsDirty() || confirm('Es gibt ungespeicherte Änderungen am Kunden.\n\nOK = verwerfen und weitermachen\nAbbrechen = zurück und speichern');
  const tag = (t, c = '') => `<span class="tag ${c}">${esc(t)}</span>`;
  const stateBox = (title, text, act) => `<div class="ws-state ${act && act.err ? 'err' : ''}"><b>${esc(title)}</b>${esc(text)}${act ? `<div><button class="btn ghost sm" data-a="${act.a}" data-v="${esc(act.v || '')}">${esc(act.l)}</button></div>` : ''}</div>`;
  const wIn = (path, v, o = {}) => `<input type="${o.type || 'text'}" data-w="${esc(path)}" data-wt="${o.wt || 'text'}" value="${esc(o.wt === 'dec' || o.wt === 'int' ? fmtNum(v) : v ?? '')}"${o.ph != null ? ` placeholder="${esc(o.ph)}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''}${o.label ? ` aria-label="${esc(o.label)}"` : ''}${o.autofocus ? ' data-autofocus' : ''}>`;

  /* Ansicht: Vorschau-Iframe oder Arbeitsbereich */
  let wasWs = false;
  function applyView() {
    const ws = WS_TABS.has(st.tab);
    $('.shell').classList.toggle('ws', ws);
    if (ws) $('.shell').classList.remove('ins');
    WSEL.hidden = !ws; $('#frameWrap').hidden = ws;
    if (!ws && wasWs) { layoutFrame(); pushPreview(true); }
    wasWs = ws;
  }
  function switchTab(t) {
    if (t === st.tab) return;
    if (st.tab === 'members' && !wsLeaveOk()) return;
    st.tab = t; st.q = '';
    if (t === 'inbox') loadInbox();
    renderLeft();
    if (WS_TABS.has(t)) wsEnter();
  }
  function wsEnter() {
    renderWs();
    if (st.tab === 'members') loadMembers(!!W.mem.list);
    if (st.tab === 'bookings') loadBookings();
    if (st.tab === 'orders') loadOrders();
  }
  function renderWs() {
    if (!WS_TABS.has(st.tab)) return;
    const y = WSEL.scrollTop;
    WSEL.innerHTML = ({ members: memHTML, bookings: bkHTML, orders: orHTML }[st.tab])();
    WSEL.scrollTop = y;
    if (st.tab === 'members') { renderMemRows(); renderMemMain(); }
  }
  function openModal(html) { $('#wsBox').innerHTML = html; $('#wsModal').hidden = false; setTimeout(() => $('#wsBox').querySelector('select,input')?.focus(), 30); }
  function closeModal() { $('#wsModal').hidden = true; $('#wsBox').innerHTML = ''; }

  /* ---------- Kunden: Liste ---------- */
  async function loadMembers(quiet) {
    const M = W.mem;
    if (!quiet) { M.state = 'load'; if (st.tab === 'members') renderMemRows(); }
    try { const j = await api('/api/admin/members'); M.list = Array.isArray(j) ? j : (j.members || []); M.state = 'ok'; }
    catch (e) { if (!M.list) M.state = 'err'; M.err = e.message; }
    if (st.tab === 'members') renderMemRows();
  }
  const lastDate = x => !x ? '' : typeof x === 'string' ? x : (x.date || '');
  function memHTML() {
    return `<div class="ws-members" id="mWrap"><div class="ws-list"><div class="ws-lh"><h2>Kunden <small id="mCount"></small></h2><button class="btn primary sm" data-a="m-new">+ Neuer Kunde</button></div>
      <input class="search" id="mSearch" placeholder="Name oder E-Mail suchen …" value="${esc(W.mem.q)}" aria-label="Kunden suchen"><div class="ws-rows" id="mRows"></div></div><div class="ws-main" id="mMain"></div></div>`;
  }
  function renderMemRows() {
    const M = W.mem, el = $('#mRows'); if (!el) return;
    if (M.state === 'load' || M.state === 'idle') { el.innerHTML = '<p class="sub" style="padding:8px 4px">Kunden werden geladen …</p>'; return; }
    if (M.state === 'err') { el.innerHTML = stateBox('Kunden konnten nicht geladen werden', M.err, { a: 'm-reload', l: 'Erneut versuchen', err: true }); return; }
    const q = M.q.trim().toLowerCase();
    const rows = (M.list || []).filter(x => !q || `${x.name} ${x.email}`.toLowerCase().includes(q)).sort((a, b) => String(a.name).localeCompare(b.name, 'de'));
    $('#mCount').textContent = (M.list || []).length ? `${(M.list || []).length}` : '';
    el.innerHTML = rows.map(x => {
      const status = x.hasPassword ? tag('Zugang aktiv', 'ok') : x.invitePending ? tag('Einladung offen', 'warn') : tag('Kein Zugang');
      const ll = lastDate(x.lastLog), lm = lastDate(x.lastMeasurement);
      return `<button class="mrow ${M.cur && M.cur.id === x.id ? 'on' : ''} ${x.active === false ? 'off' : ''}" data-a="m-open" data-v="${esc(x.id)}"><b>${esc(x.name || 'Ohne Namen')}</b><small>${esc(x.email)}</small>
        <span class="tags">${status}${x.activePlans ? tag(`${x.activePlans} aktiv${x.activePlans === 1 ? 'er Plan' : 'e Pläne'}`, 'ac') : ''}${x.active === false ? tag('inaktiv', 'err') : ''}</span>
        ${ll || lm ? `<small>${ll ? 'Training ' + esc(fmtDate(ll)) : ''}${ll && lm ? ' · ' : ''}${lm ? 'Messung ' + esc(fmtDate(lm)) : ''}</small>` : ''}</button>`;
    }).join('') || (q ? '<p class="sub" style="padding:8px 4px">Kein Treffer.</p>' : stateBox('Noch keine Kunden', 'Lege den ersten Kunden mit „+ Neuer Kunde" an.'));
  }

  /* ---------- Kunden: Laden, Speichern, Einladen ---------- */
  const sortMeas = m => { if (Array.isArray(m.measurements)) m.measurements.sort((a, b) => String(a.date).localeCompare(b.date)); return m; };
  function setCurrent(m) {
    const M = W.mem; m.plans = m.plans || []; m.measurements = m.measurements || [];
    m.plans.forEach(p => { p.days = p.days || []; p.logs = p.logs || []; p.days.forEach(d => { d.exercises = d.exercises || []; }); });
    sortMeas(m); M.cur = m; M.snap = snapOf(m); M.loadingId = null;
  }
  async function openMember(id) {
    const M = W.mem;
    if (M.cur && M.cur.id === id) return;
    if (!wsLeaveOk()) return;
    M.loadingId = id; M.cur = null; M.sub = 'data'; M.planId = null; M.trainPlan = null; M.log = null; M.logTouched = false; M.invite = null;
    renderMemMain(); renderMemRows();
    try { setCurrent(await api('/api/admin/member?id=' + encodeURIComponent(id))); }
    catch (e) { M.loadingId = null; toast('Kunde konnte nicht geladen werden: ' + e.message, true); }
    renderMemMain(); renderMemRows();
  }
  function newMember() {
    if (!wsLeaveOk()) return;
    const M = W.mem;
    Object.assign(M, { sub: 'data', planId: null, trainPlan: null, log: null, logTouched: false, invite: null, loadingId: null });
    setCurrent({ name: '', email: '', phone: '', active: true, notes: '', plans: [], measurements: [] });
    renderMemMain(); renderMemRows();
    $('#mMain [data-autofocus]')?.focus();
  }
  async function saveMember() {
    const M = W.mem, m = M.cur; if (!m || M.saving) return false;
    m.name = (m.name || '').trim(); m.email = (m.email || '').trim();
    if (!m.name) { toast('Bitte einen Namen eintragen', true); M.sub = 'data'; renderMemMain(); return false; }
    if (!/^\S+@\S+\.\S+$/.test(m.email)) { toast('Bitte eine gültige E-Mail-Adresse eintragen', true); M.sub = 'data'; renderMemMain(); return false; }
    M.saving = true; updateMemDirty();
    try {
      const out = clone(m); delete out.hasPassword; delete out.invitePending;
      const j = await api('/api/admin/member', { member: out });
      const saved = j.member || j;
      if (!saved.id) throw new Error('Unerwartete Antwort vom Server');
      if (saved.hasPassword === undefined) saved.hasPassword = m.hasPassword;
      if (saved.invitePending === undefined) saved.invitePending = m.invitePending;
      setCurrent(saved);
      if (M.planId && !saved.plans.some(p => p.id === M.planId)) M.planId = null;
      toast('Kunde gespeichert ✓');
      M.saving = false; renderMemMain(); loadMembers(true);
      return true;
    } catch (e) { toast('Speichern fehlgeschlagen: ' + e.message, true); M.saving = false; updateMemDirty(); return false; }
  }
  async function inviteMember() {
    const M = W.mem, m = M.cur; if (!m) return;
    if (!m.id || wsDirty()) { if (!(await saveMember())) return; }
    if (m.hasPassword && !confirm('Dieser Kunde hat bereits ein Passwort. Der neue Link setzt es zurück, sobald er ihn nutzt. Fortfahren?')) return;
    try {
      const j = await api('/api/admin/member/invite', { id: W.mem.cur.id });
      M.invite = { url: location.origin + j.link, exp: j.expires, mailed: !!j.mailed };
      M.cur.invitePending = true; renderMemMain(); loadMembers(true);
      toast('Einladungslink erstellt ✓');
    } catch (e) { toast('Einladung fehlgeschlagen: ' + e.message, true); }
  }
  async function deleteMember() {
    const m = W.mem.cur; if (!m || !m.id) { W.mem.cur = null; renderMemMain(); renderMemRows(); return; }
    if (!confirm(`Kunde „${m.name}" samt Plänen, Trainings und Messungen endgültig löschen?\n\nBuchungen bleiben als Gast-Einträge erhalten.`)) return;
    try { await api('/api/admin/member/delete', { id: m.id }); W.mem.cur = null; W.mem.snap = ''; W.mem.logTouched = false; toast('Kunde gelöscht'); renderMemMain(); loadMembers(true); }
    catch (e) { toast('Löschen fehlgeschlagen: ' + e.message, true); }
  }
  async function copyText(text, input) {
    try { await navigator.clipboard.writeText(text); toast('Link kopiert ✓'); }
    catch { if (input) { input.select(); document.execCommand('copy'); toast('Link kopiert ✓'); } else toast('Kopieren nicht möglich, bitte markieren und ⌘C', true); }
  }

  /* ---------- Kunden: Editor ---------- */
  function renderMemMain() {
    const el = $('#mMain'); if (!el) return;
    const y = el.scrollTop;
    el.innerHTML = memMainHTML(); el.scrollTop = y;
    $('#mWrap').classList.toggle('has-cur', !!(W.mem.cur || W.mem.loadingId));
    updateMemDirty();
  }
  function updateMemDirty() {
    const M = W.mem, d = $('#mDirty'), b = $('#mSave'); if (!d || !M.cur) return;
    const dirty = wsDirty();
    d.textContent = M.saving ? 'Speichert …' : M.logTouched ? 'Training noch nicht gespeichert' : dirty ? 'ungespeichert' : M.cur.id ? 'gespeichert' : 'noch nicht angelegt';
    d.classList.toggle('on', dirty);
    b.disabled = M.saving || (!dirty && !!M.cur.id);
  }
  function memMainHTML() {
    const M = W.mem, m = M.cur;
    if (M.loadingId) return '<div class="ws-body"><p class="sub" style="margin-top:20px">Kunde wird geladen …</p></div>';
    if (!m) return `<div class="ws-body">${stateBox('Kein Kunde gewählt', 'Wähle links einen Kunden oder lege mit „+ Neuer Kunde" einen an. Pläne, Trainingswerte und Messungen trägst nur du ein, die Kunden sehen sie in ihrem Mitgliederbereich.')}</div>`;
    const subs = [['data', 'Stammdaten'], ['plans', `Pläne (${m.plans.length})`], ['train', 'Training eintragen'], ['meas', `Messungen (${m.measurements.length})`]];
    const body = { data: memDataHTML, plans: plansHTML, train: trainHTML, meas: measHTML }[M.sub](m);
    return `<div class="ws-bar"><button class="btn ghost sm ws-back" data-a="m-back">‹ Liste</button><div class="who"><b id="mName">${esc(m.name || 'Neuer Kunde')}</b><small>${esc(m.email || 'noch keine E-Mail')}</small></div>
      <span class="dirty" id="mDirty"></span><button class="btn primary" id="mSave" data-a="m-save">Speichern</button></div>
      <div class="ws-body"><div class="subtabs">${subs.map(([k, l]) => `<button data-a="m-sub" data-v="${k}" class="${M.sub === k ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>${body}</div>`;
  }
  function memDataHTML(m) {
    const inv = W.mem.invite;
    const status = m.hasPassword ? tag('Passwort gesetzt', 'ok') : m.invitePending ? tag('Einladung offen', 'warn') : tag('Noch kein Zugang');
    return `<div class="wcard"><h3>Stammdaten</h3><div class="grid2">
        <div class="f"><label>Name</label>${wIn('name', m.name, { autofocus: !m.id })}</div>
        <div class="f"><label>E-Mail (Login)</label>${wIn('email', m.email, { type: 'email' })}</div>
        <div class="f"><label>Telefon</label>${wIn('phone', m.phone, { mode: 'tel' })}</div>
        <label class="tg wtg">Kunde aktiv<input type="checkbox" data-w="active" data-wt="bool" ${m.active !== false ? 'checked' : ''}><i></i></label></div>
        <div class="f"><label>Notizen <small>nur intern, nie für Kunden sichtbar</small></label><textarea data-w="notes" data-wt="text" rows="3">${esc(m.notes)}</textarea></div></div>
      <div class="wcard"><h3>Zugang zum Mitgliederbereich ${status}</h3>
        <p class="sub" style="margin:4px 0 0">${m.hasPassword ? 'Der Kunde kann sich anmelden. Ein neuer Link setzt das Passwort zurück (z. B. bei „Passwort vergessen").' : 'Der Kunde legt sein Passwort über einen Einladungslink selbst fest. Der Link ist 7 Tage gültig.'}</p>
        <div class="acts"><button class="btn ghost" data-a="m-invite">${m.hasPassword || m.invitePending ? 'Neuen Einladungslink erstellen' : 'Einladungslink erstellen'}</button>${m.id ? '' : '<small style="color:var(--mu)">Der Kunde wird dafür zuerst gespeichert.</small>'}</div>
        ${inv ? `<div class="invite-box"><input type="text" readonly id="inviteUrl" value="${esc(inv.url)}" aria-label="Einladungslink"><button class="btn primary" data-a="m-copy">Kopieren</button></div>
          <p class="hint2">Gültig bis ${esc(inv.exp ? new Date(inv.exp * 1000).toLocaleDateString('de-DE') : '–')}. ${inv.mailed ? 'Der Link wurde zusätzlich per E-Mail verschickt.' : 'Es wurde keine E-Mail verschickt (SMTP nicht konfiguriert). Schick den Link selbst, z. B. per WhatsApp.'}</p>` : ''}</div>
      <div class="wcard"><h3>Kunde löschen</h3><p class="sub" style="margin:4px 0 0">Entfernt Stammdaten, Pläne, Trainings und Messungen unwiderruflich. Wenn du den Kunden nur pausieren willst, schalte oben „Kunde aktiv" aus.</p>
        <div class="acts"><button class="btn danger" data-a="m-del">${m.id ? 'Kunde endgültig löschen' : 'Eingabe verwerfen'}</button></div></div>`;
  }

  /* ---------- Kunden: Pläne ---------- */
  const findPlan = id => (W.mem.cur ? W.mem.cur.plans.find(p => p.id === id) : null);
  const planCount = p => `${p.days.length} ${p.days.length === 1 ? 'Tag' : 'Tage'} · ${p.days.reduce((n, d) => n + d.exercises.length, 0)} Übungen · ${p.logs.length} ${p.logs.length === 1 ? 'Training' : 'Trainings'}`;
  const blankEx = (group = '') => ({ id: mid('e'), group, name: '', sets: 4, reps: '6-8', tempo: '', rest: 60, note: '' });
  function plansHTML(m) {
    const M = W.mem;
    const pi = m.plans.findIndex(p => p.id === M.planId);
    if (pi >= 0) return planEditHTML(m.plans[pi], pi);
    const row = p => `<div class="prow"><div class="pt"><b>${esc(p.title || 'Ohne Titel')}</b><small>${esc(p.start ? 'ab ' + fmtDate(p.start) : 'ohne Startdatum')}${p.end ? ' bis ' + esc(fmtDate(p.end)) : ''} · ${esc(planCount(p))}</small></div>
      <div class="acts"><button class="btn ghost sm" data-a="p-open" data-v="${esc(p.id)}">Bearbeiten</button>${p.status === 'active' ? `<button class="btn ghost sm" data-a="p-train" data-v="${esc(p.id)}">Training eintragen</button>` : ''}<button class="btn ghost sm" data-a="p-dup" data-v="${esc(p.id)}" title="Kopie ohne Trainings als neuer aktiver Plan">Duplizieren</button>
      <button class="btn ghost sm" data-a="p-status" data-v="${esc(p.id)}">${p.status === 'active' ? 'Abschließen' : 'Reaktivieren'}</button><button class="btn danger sm" data-a="p-del" data-v="${esc(p.id)}">Löschen</button></div></div>`;
    const act = m.plans.filter(p => p.status !== 'done'), done = m.plans.filter(p => p.status === 'done');
    return `<div class="wcard"><h3>Aktive Pläne <button class="btn primary sm" data-a="p-new">+ Neuer Plan</button></h3>${act.map(row).join('') || '<p class="sub" style="margin:8px 0 0">Kein aktiver Plan. Lege mit „+ Neuer Plan" einen an oder dupliziere einen früheren.</p>'}</div>
      ${done.length ? `<div class="wcard"><h3>Abgeschlossene Pläne</h3>${done.map(row).join('')}</div>` : ''}`;
  }
  function planEditHTML(p, pi) {
    const pre = `plans.${pi}`;
    return `<div class="wcard"><button class="back" data-a="p-list">← Alle Pläne</button>
      <div class="grid4"><div class="f"><label>Titel</label>${wIn(`${pre}.title`, p.title)}</div><div class="f"><label>Start</label>${wIn(`${pre}.start`, p.start, { type: 'date' })}</div><div class="f"><label>Ende <small>optional</small></label>${wIn(`${pre}.end`, p.end, { type: 'date' })}</div><div class="f"><label>Ziel</label>${wIn(`${pre}.goal`, p.goal)}</div></div>
      <div class="f"><label>Notiz zum Plan <small>Kunden sehen sie</small></label><textarea data-w="${pre}.note" data-wt="text" rows="2">${esc(p.note)}</textarea></div></div>
      ${p.days.map((d, di) => `<div class="wcard dayblock" style="margin-top:16px"><div class="dh">${wIn(`${pre}.days.${di}.name`, d.name, { label: 'Name des Tages' })}
        <button class="btn danger sm" data-a="d-del" data-v="${esc(p.id)}|${esc(d.id)}">Tag löschen</button></div>
        <div class="tblwrap"><table class="t plan"><thead><tr><th class="c-g">Einheit</th><th class="c-n">Übung</th><th class="c-s">Sätze</th><th class="c-r">WH</th><th class="c-t">Tempo</th><th class="c-p">Pause (s)</th><th class="c-o">Notiz</th><th></th></tr></thead><tbody>
        ${d.exercises.map((x, xi) => { const q = `${pre}.days.${di}.exercises.${xi}`, key = `${esc(p.id)}|${esc(d.id)}|${esc(x.id)}`; return `<tr><td>${wIn(`${q}.group`, x.group, { label: 'Einheit', ph: 'A1' })}</td><td>${wIn(`${q}.name`, x.name, { label: 'Übung', ph: 'Übung' })}</td><td>${wIn(`${q}.sets`, x.sets, { wt: 'int', mode: 'numeric', label: 'Sätze' })}</td><td>${wIn(`${q}.reps`, x.reps, { label: 'Wiederholungen', ph: '6-8' })}</td><td>${wIn(`${q}.tempo`, x.tempo, { label: 'Tempo', ph: '4010' })}</td><td>${wIn(`${q}.rest`, x.rest, { wt: 'int', mode: 'numeric', label: 'Pause in Sekunden' })}</td><td>${wIn(`${q}.note`, x.note, { label: 'Notiz' })}</td>
          <td class="ra"><button class="ib" data-a="x-move" data-v="${key}|-1" title="Nach oben" aria-label="Übung nach oben">↑</button><button class="ib" data-a="x-move" data-v="${key}|1" title="Nach unten" aria-label="Übung nach unten">↓</button><button class="ib" data-a="x-del" data-v="${key}" title="Übung löschen" aria-label="Übung löschen">✕</button></td></tr>`; }).join('') || '<tr><td colspan="8" style="color:var(--mu);padding:14px">Noch keine Übung in diesem Tag.</td></tr>'}</tbody></table></div>
        <div class="acts"><button class="btn ghost sm" data-a="x-add" data-v="${esc(p.id)}|${esc(d.id)}">+ Übung</button></div></div>`).join('')}
      <div class="acts"><button class="btn ghost" data-a="d-add" data-v="${esc(p.id)}">+ Tag hinzufügen</button></div>`;
  }
  function planAction(a, v) {
    const M = W.mem, m = M.cur; if (!m) return;
    const [pid, did, xid, dir] = String(v || '').split('|');
    const p = findPlan(pid), d = p && p.days.find(x => x.id === did);
    if (a === 'p-new') {
      const n = m.plans.length + 1;
      const np = { id: mid('pl'), title: `${(m.name || 'Plan').split(' ')[0]} ${'①②③④⑤⑥⑦⑧⑨'[n - 1] || n}`, status: 'active', start: today(), end: null, goal: '', note: '', days: [{ id: mid('d'), name: 'Einheit 1', exercises: [blankEx('A1')] }], logs: [] };
      m.plans.unshift(np); M.planId = np.id;
    } else if (a === 'p-open') M.planId = v;
    else if (a === 'p-list') M.planId = null;
    else if (a === 'p-train') { M.sub = 'train'; M.trainPlan = v; M.log = null; }
    else if (a === 'p-dup' && p) {
      const c = clone(p); c.id = mid('pl'); c.title = `${p.title} (Kopie)`; c.status = 'active'; c.start = today(); c.end = null; c.logs = [];
      c.days.forEach(dd => { dd.id = mid('d'); dd.exercises.forEach(x => { x.id = mid('e'); }); });
      m.plans.unshift(c); toast('Kopie ohne Trainings angelegt');
    } else if (a === 'p-status' && p) { if (p.status === 'active') { p.status = 'done'; if (!p.end) p.end = today(); } else { p.status = 'active'; p.end = null; } }
    else if (a === 'p-del' && p) {
      if (!confirm(`Plan „${p.title}" mit ${p.logs.length} Trainings löschen? Das lässt sich nicht rückgängig machen.`)) return;
      m.plans = m.plans.filter(x => x.id !== pid); if (M.planId === pid) M.planId = null; if (M.trainPlan === pid) { M.trainPlan = null; M.log = null; }
    } else if (a === 'd-add' && p) p.days.push({ id: mid('d'), name: `Einheit ${p.days.length + 1}`, exercises: [blankEx('A1')] });
    else if (a === 'd-del' && p && d) {
      const n = p.logs.filter(l => l.dayId === did).length;
      if (!confirm(`Tag „${d.name}" löschen?${n ? `\n\nDie ${n} zugehörigen Trainings werden ebenfalls gelöscht.` : ''}`)) return;
      p.days = p.days.filter(x => x.id !== did); p.logs = p.logs.filter(l => l.dayId !== did); if (M.log && M.log.dayId === did) M.log = null;
    } else if (a === 'x-add' && d) { const last = d.exercises[d.exercises.length - 1]; const g = last && /^([A-Z])(\d+)$/.test(last.group || '') ? last.group.replace(/\d+$/, x => +x + 1) : ''; d.exercises.push(blankEx(g)); }
    else if (a === 'x-del' && d) {
      const x = d.exercises.find(e => e.id === xid); if (!x) return;
      if ((x.name || '').trim() && !confirm(`Übung „${x.name}" löschen?`)) return;
      d.exercises = d.exercises.filter(e => e.id !== xid);
    } else if (a === 'x-move' && d) { const i = d.exercises.findIndex(e => e.id === xid), j = i + Number(dir); if (i < 0 || j < 0 || j >= d.exercises.length) return; [d.exercises[i], d.exercises[j]] = [d.exercises[j], d.exercises[i]]; }
    else return;
    renderMemMain(); renderMemRows();
  }

  /* ---------- Kunden: Training eintragen ---------- */
  function lastSets(plan, dayId, exId, exceptId) {
    const logs = [...plan.logs].reverse().filter(l => l.dayId === dayId && l.id !== exceptId && Array.isArray(l.sets && l.sets[exId])).sort((a, b) => String(b.date).localeCompare(a.date));
    return logs[0] ? { date: logs[0].date, sets: logs[0].sets[exId] } : null;
  }
  function newLog(plan) {
    const prev = [...plan.logs].sort((a, b) => String(a.date).localeCompare(b.date)).pop();
    const pi = prev ? plan.days.findIndex(d => d.id === prev.dayId) : -1;
    return { planId: plan.id, id: null, dayId: plan.days[(pi + 1) % plan.days.length].id, date: today(), note: '', raw: {} };
  }
  const logToRaw = log => { const raw = {}; for (const [k, arr] of Object.entries(log.sets || {})) raw[k] = (arr || []).map(s => s ? { reps: fmtNum(s.reps), kg: fmtNum(s.kg) } : { reps: '', kg: '' }); return raw; };
  const setsText = arr => (arr || []).map(s => s ? `${fmtNum(s.reps)}×${fmtNum(s.kg)}` : '–').join(' · ');
  function trainHTML(m) {
    const M = W.mem;
    if (!m.plans.length) return `<div class="wcard"><h3>Training eintragen</h3>${stateBox('Noch kein Plan', 'Lege zuerst unter „Pläne" einen Plan mit Tagen und Übungen an.', { a: 'm-sub', v: 'plans', l: 'Zu den Plänen' })}</div>`;
    const plan = m.plans.find(p => p.id === M.trainPlan) || m.plans.find(p => p.status !== 'done') || m.plans[0];
    M.trainPlan = plan.id;
    if (!plan.days.length) return `<div class="wcard"><h3>Training eintragen</h3>${stateBox('Plan ohne Tage', `„${plan.title}" hat noch keinen Tag.`, { a: 'p-open', v: plan.id, l: 'Plan bearbeiten' })}</div>`;
    if (!M.log || M.log.planId !== plan.id) M.log = newLog(plan);
    const L = M.log;
    const day = plan.days.find(d => d.id === L.dayId) || (L.dayId = plan.days[0].id, plan.days[0]);
    const exs = day.exercises;
    const maxN = Math.max(1, ...exs.map(x => Math.max(Number(x.sets) || 0, (L.raw[x.id] || []).length)));
    const grid = exs.length ? `<div class="tblwrap"><table class="t lg"><thead><tr><th class="sticky">Übung</th>${Array.from({ length: maxN }, (_, i) => `<th>Satz ${i + 1} <small style="text-transform:none;letter-spacing:0">WH × kg</small></th>`).join('')}</tr></thead><tbody>
      ${exs.map(x => {
        const n = Math.max(Number(x.sets) || 0, (L.raw[x.id] || []).length), prev = lastSets(plan, day.id, x.id, L.id), r = L.raw[x.id] || [];
        return `<tr><td class="ex sticky"><b>${esc(x.group ? x.group + ' · ' : '')}${esc(x.name || 'Ohne Namen')}</b><small>Soll: ${esc(x.sets)} × ${esc(x.reps || '–')} · Tempo ${esc(x.tempo || '–')} · Pause ${esc(x.rest || '–')} s</small>${prev ? `<small>Zuletzt ${esc(fmtDate(prev.date))}: ${esc(setsText(prev.sets))}</small>` : ''}</td>
          ${Array.from({ length: maxN }, (_, i) => i < n ? `<td class="lgc"><div class="lgp"><input class="lg-in" data-wl="${esc(x.id)}|${i}|reps" value="${esc(r[i] ? r[i].reps : '')}" placeholder="${esc(prev && prev.sets[i] ? fmtNum(prev.sets[i].reps) : 'WH')}" inputmode="numeric" enterkeyhint="next" aria-label="${esc(x.name)} Satz ${i + 1} Wiederholungen"><b>×</b><input class="lg-in" data-wl="${esc(x.id)}|${i}|kg" value="${esc(r[i] ? r[i].kg : '')}" placeholder="${esc(prev && prev.sets[i] ? fmtNum(prev.sets[i].kg) : 'kg')}" inputmode="decimal" enterkeyhint="next" aria-label="${esc(x.name)} Satz ${i + 1} Gewicht in Kilogramm"></div></td>` : '<td class="na"></td>').join('')}</tr>`;
      }).join('')}</tbody></table></div>` : stateBox('Tag ohne Übungen', 'Füge dem Tag zuerst Übungen hinzu.', { a: 'p-open', v: plan.id, l: 'Plan bearbeiten' });
    const logs = [...plan.logs].sort((a, b) => String(b.date).localeCompare(a.date));
    return `<div class="wcard"><h3>${L.id ? 'Training bearbeiten' : 'Training eintragen'}</h3>
      <div class="lg-top"><div class="f"><label>Plan</label><select data-wsel="l-plan" aria-label="Plan">${m.plans.map(p => `<option value="${esc(p.id)}" ${p.id === plan.id ? 'selected' : ''}>${esc(p.title)}${p.status === 'done' ? ' (abgeschlossen)' : ''}</option>`).join('')}</select></div>
        <div class="f"><label>Tag</label><select data-wsel="l-day" aria-label="Tag">${plan.days.map(d => `<option value="${esc(d.id)}" ${d.id === day.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
        <div class="f"><label>Datum</label><input type="date" data-wlf="date" value="${esc(L.date)}"></div></div>
      ${grid}
      ${exs.length ? `<div class="f"><label>Notiz zum Training <small>optional</small></label><input type="text" data-wlf="note" value="${esc(L.note)}"></div>
      <p class="hint2">Graue Vorgaben in den Feldern sind die Werte vom letzten Training. Enter springt zum nächsten Feld. Leeres kg-Feld mit Wiederholungen zählt als 0 kg (Körpergewicht). Leere Sätze bleiben leer.</p>
      <div class="acts"><button class="btn primary" data-a="l-save">${L.id ? 'Änderungen speichern' : 'Training speichern'}</button><button class="btn ghost" data-a="l-fill">Letzte Werte übernehmen</button><button class="btn ghost" data-a="l-cancel">${L.id ? 'Abbrechen' : 'Zurücksetzen'}</button></div>` : ''}</div>
      <div class="wcard"><h3>Bisherige Trainings <small style="color:var(--mu);font-weight:500">${esc(plan.title)}</small></h3>${logs.map(l => { const dd = plan.days.find(d => d.id === l.dayId); const n = Object.values(l.sets || {}).reduce((s, a) => s + (a || []).filter(Boolean).length, 0);
        return `<div class="logrow"><div class="pt"><b>${esc(fmtDate(l.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }))}</b> · ${esc(dd ? dd.name : 'gelöschter Tag')}<br><small>${n} Sätze${l.note ? ' · ' + esc(l.note) : ''}</small></div>
          <button class="btn ghost sm" data-a="l-edit" data-v="${esc(l.id)}">Bearbeiten</button><button class="btn danger sm" data-a="l-del" data-v="${esc(l.id)}">Löschen</button></div>`; }).join('') || '<p class="sub" style="margin:8px 0 0">Noch kein Training eingetragen.</p>'}</div>`;
  }
  async function logAction(a, v) {
    const M = W.mem, m = M.cur; if (!m) return;
    const plan = m.plans.find(p => p.id === M.trainPlan); if (!plan) return;
    if (a === 'l-cancel') { M.log = null; M.logTouched = false; }
    else if (a === 'l-fill') {
      const L = M.log, day = plan.days.find(d => d.id === L.dayId); if (!day) return;
      for (const x of day.exercises) { const prev = lastSets(plan, day.id, x.id, L.id); if (!prev) continue; const r = (L.raw[x.id] = L.raw[x.id] || []); for (let i = 0; i < (Number(x.sets) || 0); i++) { const c = (r[i] = r[i] || { reps: '', kg: '' }); const p = prev.sets[i]; if (p && c.reps === '' && c.kg === '') { c.reps = fmtNum(p.reps); c.kg = fmtNum(p.kg); M.logTouched = true; } } }
    } else if (a === 'l-edit') { const l = plan.logs.find(x => x.id === v); if (!l) return; if (M.logTouched && !confirm('Das aktuell eingetragene Training verwerfen?')) return; M.log = { planId: plan.id, id: l.id, dayId: l.dayId, date: l.date, note: l.note || '', raw: logToRaw(l) }; M.logTouched = false; }
    else if (a === 'l-del') {
      const l = plan.logs.find(x => x.id === v); if (!l) return;
      if (!confirm(`Training vom ${fmtDate(l.date)} löschen?`)) return;
      plan.logs = plan.logs.filter(x => x.id !== v); if (M.log && M.log.id === v) { M.log = null; M.logTouched = false; }
      toast('Training gelöscht. Zum Übernehmen noch „Speichern" klicken.');
    } else if (a === 'l-save') {
      const L = M.log, day = plan.days.find(d => d.id === L.dayId); if (!L || !day) return;
      if (!L.date) { toast('Bitte ein Datum wählen', true); return; }
      const orig = L.id && plan.logs.find(x => x.id === L.id);
      const sets = orig ? clone(orig.sets || {}) : {}; let any = false;
      try { for (const x of day.exercises) {
        const arr = (L.raw[x.id] || []).map((c, i) => {
          const reps = num(c.reps), kg = num(c.kg);
          if (reps == null && kg == null) return null;
          if (reps == null) throw new Error(`${x.name || 'Übung'}, Satz ${i + 1}: Es fehlen die Wiederholungen.`);
          return { reps, kg: kg == null ? 0 : kg };
        });
        while (arr.length && !arr[arr.length - 1]) arr.pop();
        if (arr.some(Boolean)) { sets[x.id] = arr; any = true; } else delete sets[x.id];
      } } catch (err) { toast(err.message, true); return; }
      if (!any) { toast('Trage mindestens einen Satz ein', true); return; }
      const log = { id: L.id || mid('lg'), dayId: L.dayId, date: L.date, note: (L.note || '').trim(), sets };
      L.id = log.id;
      const i = plan.logs.findIndex(x => x.id === log.id); if (i >= 0) plan.logs[i] = log; else plan.logs.push(log);
      const ok = await saveMember();
      if (ok) { W.mem.log = null; W.mem.logTouched = false; renderMemMain(); toast('Training gespeichert ✓'); }
      return;
    }
    renderMemMain();
  }

  /* ---------- Kunden: Messungen ---------- */
  const sumFolds = ms => { const ks = measure().skinfolds.map(x => x.key); const vals = ks.map(k => ms.skinfolds && ms.skinfolds[k]).filter(v => typeof v === 'number'); return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10 : null; };
  function measHTML(m) {
    const me = measure();
    const th = (l, u) => `<th>${esc(l)} <small style="text-transform:none;letter-spacing:0">${u}</small></th>`;
    return `<div class="wcard"><h3>Messungen <button class="btn primary sm" data-a="ms-add">+ Neue Messung</button></h3>
      <p class="sub" style="margin:4px 0 12px">Hautfalten in mm, Umfänge in cm. Das Körperfett (%) trägst du selbst ein, die Σ Hautfalten rechnet die Tabelle automatisch. Welche Messpunkte es gibt, stellst du unter Einstellungen → Messpunkte ein.</p>
      ${m.measurements.length ? `<div class="tblwrap"><table class="t meas"><thead><tr><th class="c-d sticky">Datum</th>${th('Gewicht', 'kg')}${th('KF', '%')}${me.skinfolds.map(x => th(x.label, 'mm')).join('')}<th>Σ mm</th>${me.girths.map(x => th(x.label, 'cm')).join('')}<th class="c-o">Notiz</th><th></th></tr></thead><tbody>
        ${m.measurements.map((x, i) => { const q = `measurements.${i}`; const s = sumFolds(x); return `<tr><td class="sticky">${wIn(`${q}.date`, x.date, { type: 'date', label: 'Datum' })}</td><td>${wIn(`${q}.weight`, x.weight, { wt: 'dec', mode: 'decimal', label: 'Gewicht in kg' })}</td><td>${wIn(`${q}.bodyfat`, x.bodyfat, { wt: 'dec', mode: 'decimal', label: 'Körperfett in Prozent' })}</td>
          ${me.skinfolds.map(f => `<td>${wIn(`${q}.skinfolds.${f.key}`, x.skinfolds && x.skinfolds[f.key], { wt: 'dec', mode: 'decimal', label: `${f.label} in mm` })}</td>`).join('')}<td class="sum" data-sum="${i}">${s == null ? '–' : esc(fmtNum(s))}</td>
          ${me.girths.map(f => `<td>${wIn(`${q}.girths.${f.key}`, x.girths && x.girths[f.key], { wt: 'dec', mode: 'decimal', label: `${f.label} in cm` })}</td>`).join('')}<td>${wIn(`${q}.note`, x.note, { label: 'Notiz' })}</td>
          <td class="ra"><button class="ib" data-a="ms-del" data-v="${i}" title="Messung löschen" aria-label="Messung löschen">✕</button></td></tr>`; }).join('')}</tbody></table></div>` : stateBox('Noch keine Messung', 'Mit „+ Neue Messung" legst du eine Zeile für heute an.')}</div>`;
  }
  function msAction(a, v) {
    const m = W.mem.cur; if (!m) return;
    if (a === 'ms-add') m.measurements.push({ id: mid('ms'), date: today(), weight: null, bodyfat: null, skinfolds: {}, girths: {}, note: '' });
    else if (a === 'ms-del') { const x = m.measurements[Number(v)]; if (!x || !confirm(`Messung vom ${fmtDate(x.date)} löschen?`)) return; m.measurements.splice(Number(v), 1); }
    renderMemMain();
    if (a === 'ms-add') { const rows = document.querySelectorAll('table.meas tbody tr'); const r = rows[rows.length - 1]; if (r) { r.scrollIntoView({ block: 'nearest' }); r.querySelector('input[data-wt=dec]')?.focus(); } }
  }

  /* ---------- Eingaben im Arbeitsbereich ---------- */
  function wset(path, v) {
    const m = W.mem.cur;
    if (v === null && /\.(skinfolds|girths)\.[^.]+$/.test(path)) { const ks = path.split('.'); const k = ks.pop(); const o = getP(m, ks.join('.')); if (o) delete o[k]; return; }
    setP(m, path, v);
  }
  function onWsInput(e) {
    const el = e.target, M = W.mem; if (!el.dataset) return;
    if (el.id === 'mSearch') { M.q = el.value; renderMemRows(); return; }
    if (el.dataset.wsel) { if (e.type === 'change') onWsSelect(el); return; }
    if (!M.cur) return;
    if (el.dataset.w != null) {
      let v;
      switch (el.dataset.wt) {
        case 'bool': v = el.checked; break;
        case 'dec': v = num(el.value); break;
        case 'int': v = el.value === '' ? null : Math.max(0, Math.round(num(el.value) || 0)); break;
        default: v = el.value;
      }
      if (/\.(start|end)$/.test(el.dataset.w) && v === '') v = null;
      wset(el.dataset.w, v);
      if (el.dataset.w === 'name') $('#mName').textContent = el.value || 'Neuer Kunde';
      if (el.dataset.w === 'email') { const sm = $('#mName')?.nextElementSibling; if (sm) sm.textContent = el.value || 'noch keine E-Mail'; }
      const sm = /^measurements\.(\d+)\./.exec(el.dataset.w);
      if (sm) { const c = document.querySelector(`[data-sum="${sm[1]}"]`); const s = sumFolds(M.cur.measurements[Number(sm[1])]); if (c) c.textContent = s == null ? '–' : fmtNum(s); }
      updateMemDirty(); return;
    }
    if (el.dataset.wl && M.log) {
      const [exId, i, f] = el.dataset.wl.split('|'); const arr = (M.log.raw[exId] = M.log.raw[exId] || []);
      (arr[Number(i)] = arr[Number(i)] || { reps: '', kg: '' })[f] = el.value;
      for (let k = 0; k < Number(i); k++) arr[k] = arr[k] || { reps: '', kg: '' };
      M.logTouched = true; updateMemDirty(); return;
    }
    if (el.dataset.wlf && M.log) { M.log[el.dataset.wlf] = el.value; if (el.dataset.wlf === 'note') { M.logTouched = true; updateMemDirty(); } }
  }
  function onWsSelect(el) {
    const M = W.mem, v = el.value, k = el.dataset.wsel;
    if (k === 'l-plan' || k === 'l-day') {
      if (M.logTouched && !confirm('Das aktuell eingetragene Training verwerfen?')) { renderMemMain(); return; }
      M.logTouched = false;
      if (k === 'l-plan') { M.trainPlan = v; M.log = null; } else { M.log = { ...M.log, id: null, dayId: v, raw: {}, note: '' }; }
      renderMemMain();
    } else if (k === 'bk-date') { if (v) { W.bk.week = mondayOf(v); loadBookings(); } }
    else if (k === 'bk-member') el.closest('form').classList.toggle('is-member', !!v);
  }
  // Tablet-freundlich: Enter springt zum nächsten Feld im Trainingsraster, Fokus markiert den Inhalt
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('.lg-in')) return;
    e.preventDefault();
    const all = [...WSEL.querySelectorAll('.lg-in')]; const nx = all[all.indexOf(e.target) + 1];
    if (nx) nx.focus(); else e.target.blur();
  });
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('.lg-in, table.meas input[inputmode=decimal]')) setTimeout(() => e.target.select && e.target.select(), 0); });
  document.addEventListener('input', onWsInput);
  document.addEventListener('change', onWsInput);

  /* ---------- Buchungen ---------- */
  async function loadBookings(quiet) {
    const B = W.bk, wk = B.week;
    if (!quiet) { B.state = 'load'; renderWs(); }
    try { const j = await api(`/api/admin/bookings?from=${wk}&to=${addDays(wk, 6)}`); if (wk !== B.week) return; B.items = j.bookings || []; B.state = 'ok'; }
    catch (e) { if (wk !== B.week) return; B.state = 'err'; B.err = e.message; }
    if (st.tab === 'bookings') renderWs();
  }
  function slotHTML(c, date, list) {
    const booked = list.filter(b => b.status === 'booked'), wait = list.filter(b => b.status === 'waitlist'), canc = list.filter(b => b.status === 'cancelled').length;
    const cap = Number(c.spots) || 0, now = new Date(), past = date < today() || (date === today() && (c.start || '') < now.toTimeString().slice(0, 5));
    const person = b => `<div class="pl"><div class="pn"><b>${esc(b.name || 'Ohne Namen')}</b>${b.memberId ? '' : ' ' + tag('Gast')}${b.seriesId ? ' ' + tag('Serie', 'ac') : ''}<small>${esc(b.email || '')}${b.by === 'admin' ? (b.email ? ' · ' : '') + 'vom Studio eingetragen' : ''}</small></div>`;
    return `<div class="slot ${past ? 'past' : ''}"><div class="sh"><span class="tm">${esc(c.start)}${c.end ? '–' + esc(c.end) : ''}</span><div class="tt"><b>${esc(c.title)}</b><small>${esc(c.trainer || '')}${past ? (c.trainer ? ' · ' : '') + 'vorbei' : ''}</small></div><span class="occ ${booked.length > cap ? 'over' : booked.length >= cap ? 'full' : ''}" title="Belegung">${booked.length}/${cap}</span></div>
      ${booked.map(b => `${person(b)}<button class="btn danger sm" data-a="bk-cancel" data-v="${esc(b.id)}" aria-label="${esc(b.name)} stornieren">Stornieren</button></div>`).join('') || '<div class="none">Noch keine Teilnehmer.</div>'}
      ${wait.length ? `<h4>Warteliste (${wait.length})</h4>${wait.map(b => `${person(b)}<button class="btn ghost sm" data-a="bk-promote" data-v="${esc(b.id)}" title="Auf die Teilnehmerliste setzen">Nachrücken</button><button class="btn danger sm" data-a="bk-cancel" data-v="${esc(b.id)}" aria-label="${esc(b.name)} entfernen">✕</button></div>`).join('')}` : ''}
      <div class="sf"><button class="btn ghost sm" data-a="bk-add" data-v="${esc(c.id)}|${date}">+ Teilnehmer</button><small>${canc ? canc + ' storniert' : ''}</small></div></div>`;
  }
  function bkHTML() {
    const B = W.bk, end = addDays(B.week, 6), courses = st.site.collections.courses || [];
    const short = s => fmtDate(s, { day: '2-digit', month: '2-digit' });
    let body = '';
    if (B.state === 'load' || B.state === 'idle') body = '<p class="sub" style="margin-top:18px">Buchungen werden geladen …</p>';
    else if (B.state === 'err') body = stateBox('Buchungen konnten nicht geladen werden', B.err, { a: 'bk-reload', l: 'Erneut versuchen', err: true });
    else {
      const used = new Set(); let days = '';
      for (let i = 0; i < 7; i++) {
        const date = addDays(B.week, i), dow = parseYmd(date).getDay();
        const cs = courses.filter(c => Number(c.day) === dow).sort((a, b) => String(a.start).localeCompare(b.start));
        if (!cs.length) continue;
        days += `<div class="daygrp"><h3>${esc(fmtDate(date, { weekday: 'long' }))} <small>${esc(fmtDate(date))}${date === today() ? ' · heute' : ''}</small></h3><div class="slots">${cs.map(c => { const list = B.items.filter(b => b.courseId === c.id && b.date === date); list.forEach(b => used.add(b.id)); return slotHTML(c, date, list); }).join('')}</div></div>`;
      }
      const orphans = B.items.filter(b => !used.has(b.id) && b.status !== 'cancelled');
      body = (days || stateBox('Keine Kurse im Kursplan', 'Lege unter Inhalte → Kursplan Kurse an, dann erscheinen hier die Termine.', { a: 'open-tab-coll', v: 'courses', l: 'Kursplan öffnen' })) +
        (orphans.length ? `<div class="daygrp"><h3>Buchungen ohne passenden Kurs <small>Kurs wurde geändert oder gelöscht</small></h3><div class="slots"><div class="slot">${orphans.map(b => `<div class="pl"><div class="pn"><b>${esc(b.name)}</b> ${tag(b.status === 'waitlist' ? 'Warteliste' : 'gebucht')}<small>${esc(fmtDate(b.date))} ${esc(b.start || '')} · ${esc(b.title || '')}</small></div><button class="btn danger sm" data-a="bk-cancel" data-v="${esc(b.id)}">Stornieren</button></div>`).join('')}</div></div></div>` : '');
    }
    return `<div class="ws-pad"><div class="ws-head"><h2>Buchungen <small>KW ${isoWeek(B.week)} · ${esc(short(B.week))}–${esc(fmtDate(end))}</small></h2><div class="ws-tools"><button class="btn ghost sm" data-a="bk-week" data-v="-1">‹ Vorwoche</button><button class="btn ghost sm" data-a="bk-week" data-v="0">Diese Woche</button><button class="btn ghost sm" data-a="bk-week" data-v="1">Nächste Woche ›</button>
      <input type="date" data-wsel="bk-date" value="${esc(B.week)}" aria-label="Zu einer Woche springen"><button class="btn ghost sm" data-a="bk-reload" title="Neu laden" aria-label="Neu laden">↻</button></div></div>
      <p class="ws-sub">Die Belegung kommt live aus den Buchungen. Kurszeiten und Plätze pflegst du unter Inhalte → Kursplan. Als Studio darfst du auch über die Kapazität hinaus eintragen.</p>${body}</div>`;
  }
  async function openBkAdd(courseId, date) {
    const c = (st.site.collections.courses || []).find(x => x.id === courseId); if (!c) return;
    if (!W.mem.list) await loadMembers(true);
    const members = (W.mem.list || []).filter(x => x.active !== false).sort((a, b) => String(a.name).localeCompare(b.name, 'de'));
    const max = Number((st.site.settings.booking || {}).maxSeries) || 12;
    openModal(`<form data-wform="bk-add" data-cid="${esc(courseId)}" data-date="${esc(date)}"><div class="lib-head"><b>Teilnehmer eintragen</b><button type="button" class="x" data-a="wclose" aria-label="Schließen">×</button></div>
      <div class="wm-body"><p class="sub"><b>${esc(c.title)}</b> · ${esc(fmtDate(date, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }))} · ${esc(c.start)} Uhr</p>
        <div class="f"><label>Teilnehmer</label><select name="member" data-wsel="bk-member"><option value="">Gast (ohne Kundenkonto)</option>${members.map(x => `<option value="${esc(x.id)}">${esc(x.name)} · ${esc(x.email)}</option>`).join('')}</select>${W.mem.state === 'err' ? '<div class="hint">Kundenliste konnte nicht geladen werden, nur Gäste möglich.</div>' : ''}</div>
        <div class="guest"><div class="f"><label>Name des Gasts</label><input type="text" name="name" autocomplete="off"></div><div class="f"><label>E-Mail <small>optional</small></label><input type="email" name="email" autocomplete="off"></div></div>
        <div class="f"><label>Anzahl Wochen <small>1 = nur dieser Termin</small></label><input type="number" name="weeks" min="1" max="${max}" value="1"><div class="hint">Bei mehr als 1 wird jede Woche am selben Tag gebucht (höchstens ${max}).</div></div></div>
      <div class="wm-foot"><button type="button" class="btn ghost" data-a="wclose">Abbrechen</button><button class="btn primary">Eintragen</button></div></form>`);
  }
  async function submitBkAdd(f) {
    const body = { action: 'create', courseId: f.dataset.cid, date: f.dataset.date, weeks: Math.max(1, Math.round(Number(f.weeks.value) || 1)) };
    if (f.member.value) body.memberId = f.member.value;
    else { body.name = f.name.value.trim(); body.email = f.email.value.trim(); if (!body.name) { toast('Bitte einen Namen eintragen', true); f.name.focus(); return; } }
    try {
      const j = await api('/api/admin/bookings', body);
      closeModal();
      const sk = (j.skipped || []).length;
      toast(`Eingetragen ✓${j.created && j.created.length > 1 ? ` (${j.created.length} Termine)` : ''}${sk ? ` · ${sk} übersprungen: ${(j.skipped[0].reason || '')}` : ''}`);
      loadBookings(true);
    } catch (e) { toast('Eintragen fehlgeschlagen: ' + e.message, true); }
  }
  async function bkAction(a, v) {
    if (a === 'bk-week') { W.bk.week = v === '0' ? mondayOf(today()) : addDays(W.bk.week, 7 * Number(v)); loadBookings(); return; }
    if (a === 'bk-reload') { loadBookings(); return; }
    const b = W.bk.items.find(x => x.id === v); if (!b) return;
    try {
      if (a === 'bk-cancel') {
        if (!confirm(`${b.name} für ${b.title || 'den Kurs'} am ${fmtDate(b.date)} ${b.start || ''} stornieren?${b.status === 'booked' ? '\n\nDie Warteliste rückt automatisch nach.' : ''}`)) return;
        await api('/api/admin/bookings', { action: 'cancel', id: v }); toast('Buchung storniert');
      } else if (a === 'bk-promote') { await api('/api/admin/bookings', { action: 'status', id: v, status: 'booked' }); toast(`${b.name} ist jetzt auf der Teilnehmerliste`); }
      loadBookings(true);
    } catch (e) { toast('Aktion fehlgeschlagen: ' + e.message, true); }
  }

  /* ---------- Bestellungen ---------- */
  function setOrderBadge(items) { const n = items.filter(o => o.status === 'neu').length; const b = $('#orderCount'); b.hidden = !n; b.textContent = n; }
  async function refreshOrderBadge() { try { const j = await api('/api/admin/orders'); setOrderBadge(j.orders || []); } catch { } }
  async function loadOrders(quiet) {
    const O = W.or;
    if (!quiet) { O.state = 'load'; renderWs(); }
    try { const j = await api('/api/admin/orders'); O.items = j.orders || []; O.state = 'ok'; setOrderBadge(O.items); }
    catch (e) { O.state = 'err'; O.err = e.message; }
    if (st.tab === 'orders') renderWs();
  }
  const ORD = { neu: ['Neu', 'ac'], bereit: ['Liegt bereit', 'warn'], abgeholt: ['Abgeholt', 'ok'], storniert: ['Storniert', 'err'] };
  function orHTML() {
    const O = W.or;
    const cnt = k => k === 'all' ? O.items.length : O.items.filter(o => o.status === k).length;
    let body = '';
    if (O.state === 'load' || O.state === 'idle') body = '<p class="sub" style="margin-top:18px">Bestellungen werden geladen …</p>';
    else if (O.state === 'err') body = stateBox('Bestellungen konnten nicht geladen werden', O.err, { a: 'or-reload', l: 'Erneut versuchen', err: true });
    else {
      const list = O.items.filter(o => O.filter === 'all' || o.status === O.filter);
      body = list.map(o => {
        const c = o.customer || {}, s = ORD[o.status] || [o.status, ''];
        const next = { neu: ['bereit', 'Bereit zur Abholung'], bereit: ['abgeholt', 'Als abgeholt markieren'] }[o.status];
        return `<div class="order s-${esc(o.status)}"><div class="oh"><b class="no">${esc(o.no)}</b>${tag(s[0], s[1])}<small>${esc(fmtTs(o.createdAt))}</small><span class="tot">${esc(eur(o.total))}</span></div>
          <div class="cu"><b>${esc(c.name)}</b>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : ''}</div>
          ${c.note ? `<div class="nt">${esc(c.note)}</div>` : ''}
          <table class="items"><tbody>${(o.items || []).map(i => `<tr><td class="n">${esc(i.qty)} ×</td><td>${esc(i.name)}${i.variant ? ` <small style="color:var(--mu)">· ${esc(i.variant)}</small>` : ''}</td><td class="n">${esc(eur(i.price))}</td><td class="n">${esc(eur(i.sum))}</td></tr>`).join('')}</tbody></table>
          <div class="acts">${next ? `<button class="btn primary sm" data-a="or-status" data-v="${esc(o.id)}|${next[0]}">${next[1]}</button>` : ''}${o.status === 'abgeholt' ? `<button class="btn ghost sm" data-a="or-status" data-v="${esc(o.id)}|bereit">Zurück auf „bereit"</button>` : ''}${o.status === 'storniert' ? `<button class="btn ghost sm" data-a="or-status" data-v="${esc(o.id)}|neu">Wieder auf „neu"</button>` : ''}
          ${o.status === 'neu' || o.status === 'bereit' ? `<button class="btn ghost sm" data-a="or-status" data-v="${esc(o.id)}|storniert">Stornieren</button>` : ''}<button class="btn danger sm" data-a="or-del" data-v="${esc(o.id)}">Löschen</button></div></div>`;
      }).join('') || (O.items.length ? stateBox('Keine Bestellungen in dieser Ansicht', 'Wähle oben einen anderen Filter.') : stateBox('Noch keine Bestellungen', 'Sobald jemand im Shop bestellt, erscheint die Bestellung hier und im Zähler an „Bestell." links.'));
    }
    const chips = [['all', 'Alle'], ['neu', 'Neu'], ['bereit', 'Liegt bereit'], ['abgeholt', 'Abgeholt'], ['storniert', 'Storniert']];
    return `<div class="ws-pad"><div class="ws-head"><h2>Bestellungen <small>${O.items.length} gesamt · ${cnt('neu')} neu</small></h2><div class="ws-tools"><button class="btn ghost sm" data-a="or-reload" title="Neu laden" aria-label="Neu laden">↻</button></div></div>
      <p class="ws-sub">Ablauf: neu → liegt bereit → abgeholt. Bezahlt wird vor Ort im Studio.</p>
      <div class="chiprow">${chips.map(([k, l]) => `<button data-a="or-filter" data-v="${k}" class="${O.filter === k ? 'on' : ''}">${l} (${cnt(k)})</button>`).join('')}</div>${body}</div>`;
  }
  async function orAction(a, v) {
    const O = W.or;
    if (a === 'or-filter') { O.filter = v; renderWs(); return; }
    if (a === 'or-reload') { loadOrders(); return; }
    const [id, status] = String(v).split('|'); const o = O.items.find(x => x.id === id); if (!o) return;
    try {
      if (a === 'or-del') { if (!confirm(`Bestellung ${o.no} von ${(o.customer || {}).name || 'unbekannt'} endgültig löschen?`)) return; await api('/api/admin/orders', { id, delete: true }); toast('Bestellung gelöscht'); }
      else {
        if (status === 'storniert' && !confirm(`Bestellung ${o.no} stornieren?`)) return;
        await api('/api/admin/orders', { id, status }); toast(`${o.no}: ${(ORD[status] || [status])[0]}`);
      }
      loadOrders(true);
    } catch (e) { toast('Aktion fehlgeschlagen: ' + e.message, true); }
  }

  /* ---------- Klicks & Formulare im Arbeitsbereich (Delegation über data-a) ---------- */
  document.addEventListener('click', e => {
    if (e.target.id === 'wsModal') { closeModal(); return; }
    const t = e.target.closest('[data-a]'); if (!t) return;
    const a = t.dataset.a, v = t.dataset.v;
    if (a === 'open-tab') { switchTab(v); return; }
    if (a === 'open-tab-coll') { if (st.tab === 'members' && !wsLeaveOk()) return; st.tab = 'content'; st.coll = v; st.q = ''; renderLeft(); return; }
    if (a === 'wclose') { closeModal(); return; }
    if (a === 'm-new') newMember();
    else if (a === 'm-open') openMember(v);
    else if (a === 'm-reload') loadMembers();
    else if (a === 'm-back') { if (wsLeaveOk()) { W.mem.cur = null; W.mem.snap = ''; W.mem.logTouched = false; renderMemMain(); renderMemRows(); } }
    else if (a === 'm-save') saveMember();
    else if (a === 'm-sub') { W.mem.sub = v; renderMemMain(); }
    else if (a === 'm-invite') inviteMember();
    else if (a === 'm-copy') copyText(W.mem.invite.url, $('#inviteUrl'));
    else if (a === 'm-del') deleteMember();
    else if (/^[pdx]-/.test(a)) planAction(a, v);
    else if (/^l-(save|fill|cancel|edit|del)$/.test(a)) logAction(a, v);
    else if (a === 'ms-add' || a === 'ms-del') msAction(a, v);
    else if (a === 'bk-add') { const [cid, date] = v.split('|'); openBkAdd(cid, date); }
    else if (a.startsWith('bk-')) bkAction(a, v);
    else if (a.startsWith('or-')) orAction(a, v);
  });
  document.addEventListener('submit', e => { if (e.target.dataset && e.target.dataset.wform === 'bk-add') { e.preventDefault(); submitBkAdd(e.target); } });

  /* ---------- Start ---------- */
  (async function boot() {
    try {
      const me = await _fetch('/api/me');
      if (me.status === 401) { location.href = 'login.html'; return; }
      if (me.ok) { const m = await me.json(); st.user = m.user; $('#userName').textContent = '👤 ' + m.user; $('#pwBanner').hidden = !m.defaultPassword; }
    } catch { }
    let pub = null;
    try { const r = await fetch('/api/site'); pub = await r.json(); if (!pub.pages) throw 0; } catch { try { pub = await (await fetch('../data/site.json')).json(); } catch { } }
    if (!pub || !pub.pages) { $('#saveState').textContent = 'Fehler'; toast('Inhalte konnten nicht geladen werden. Läuft „python3 server.py"?', true); return; }
    st.published = JSON.stringify(pub);
    let draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { }
    if (draft && draft.site && draft.site.pages && JSON.stringify(draft.site) !== st.published) {
      st.site = draft.site;
      const stale = (draft.site._rev || 0) !== (pub._rev || 0);
      const bn = $('#banner'); bn.hidden = false; bn.classList.toggle('warn', stale);
      bn.innerHTML = stale
        ? `⚠ Dein Entwurf vom ${new Date(draft.at).toLocaleString('de-DE')} basiert auf einer <b>älteren Version</b> der Website. Die Website wurde inzwischen geändert.<button class="btn primary sm" data-discard>Neuste Version laden</button><button class="btn ghost sm" id="bnKeep">Entwurf behalten</button>`
        : `Unveröffentlichter Entwurf vom ${new Date(draft.at).toLocaleString('de-DE')} geladen.<button class="btn ghost sm" data-discard>Verwerfen</button><button class="btn primary sm" id="bnPub">Jetzt veröffentlichen</button>`;
      if ($('#bnPub')) $('#bnPub').onclick = publish;
      if ($('#bnKeep')) $('#bnKeep').onclick = () => { bn.hidden = true; layoutFrame(); };
    } else st.site = pub;
    st.last = JSON.stringify(st.site);
    st.pageId = st.site.pages[0].id;
    fillPages(); renderLeft(); renderRight(); layoutFrame(); updateState(); loadInbox(); refreshOrderBadge();
    pushPreview(true);
    setInterval(loadInbox, 60000); setInterval(refreshOrderBadge, 60000);
  })();
})();
