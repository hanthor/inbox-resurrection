/* Inbox Reborn web app — functional Phase-0/G1 client.
   Local-first: state in memory + localStorage. Mirrors core/ rule semantics
   (cluster predicates, throttling, snooze presets) for the no-backend stage;
   a GmailApi adapter interface marks where the backend takes over. */
'use strict';

const STORE_KEY = 'inbox-reborn-v1';
const DAY = 864e5;

/* ---------- seed data ---------- */
function seed() {
  const now = Date.now();
  const morning = new Date(); morning.setHours(9, 12, 0, 0);
  return {
    threads: [
      { id: 't1', kind: 'mail', from: 'Chris Sadler', subject: 'Business trip',
        snippet: 'I made a reservation for the hotel you talked about…',
        assist: null, ts: morning.getTime(), bundleId: null,
        pinned: true, done: false, snoozedUntil: 0 },
      { id: 't2', kind: 'mail', from: 'Japan Airlines', subject: 'Flight confirmation SFO → NRT',
        snippet: 'Departs Friday 11:20 · Terminal 3', assist: 'Departs Fri 11:20 · Terminal 3 · On time',
        ts: morning.getTime() - 36e5, bundleId: 'travel',
        pinned: false, done: false, snoozedUntil: 0 },
      { id: 't3', kind: 'mail', from: 'Imperial Tokyo', subject: 'Hotel: 3 nights, confirmation #TK-881',
        snippet: 'Check-in from 3 PM', assist: 'Check-in 3 PM · map · #TK-881',
        ts: morning.getTime() - 72e5, bundleId: 'travel',
        pinned: false, done: false, snoozedUntil: 0 },
      { id: 't4', kind: 'mail', from: 'Shoehop', subject: 'Your order has shipped',
        snippet: 'Tracking 1Z-8842 · arrives Thursday', assist: 'Tracking 1Z-8842 · arrives Thu',
        ts: morning.getTime() - 1e5, bundleId: 'purchases',
        pinned: false, done: false, snoozedUntil: 0 },
      { id: 't5', kind: 'mail', from: 'Debra Kumar', subject: 'Weekend at Yosemite',
        snippet: 'Here are photos from our weekend trip. [2 photos]',
        assist: '2 photos attached', ts: morning.getTime() + 18e5, bundleId: null,
        pinned: false, done: false, snoozedUntil: 0 },
      { id: 't6', kind: 'mail', from: 'Richard, Matthew, me', subject: 'Photography classes',
        snippet: 'I really would love to get some photos… (4 messages)',
        assist: null, ts: morning.getTime() - DAY, bundleId: null,
        pinned: false, done: false, snoozedUntil: 0 },
      { id: 'r1', kind: 'reminder', from: '', subject: 'Call the dentist',
        snippet: 'Reminder', assist: null, ts: morning.getTime(), bundleId: null,
        pinned: false, done: false, snoozedUntil: 0 },
    ],
    bundles: [
      { id: 'travel', name: 'Travel', icon: 'T', throttling: 'as-arrives' },
      { id: 'purchases', name: 'Purchases', icon: 'P', throttling: 'as-arrives' },
      { id: 'finance', name: 'Finance', icon: 'F', throttling: 'once-a-day' },
    ],
  };
}

/* ---------- state ---------- */
let state = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* fresh seed below */ }
  return seed();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
}
// Return due snoozes on launch.
for (const t of state.threads) {
  if (t.snoozedUntil && t.snoozedUntil <= Date.now()) t.snoozedUntil = 0;
}

let tab = 'inbox';
let pinnedOnly = false;
let query = '';
let undoStack = [];
let sheetTarget = null; // thread ids awaiting a snooze choice

/* ---------- snooze presets (mirrors core/src/snooze.mjs) ---------- */
function at(d, h, m = 0) { const t = new Date(d); t.setHours(h, m, 0, 0); return t; }
function resolveSnooze(preset, base = new Date()) {
  const d = new Date(base);
  switch (preset) {
    case 'later-today': return at(d, 20);
    case 'tomorrow': d.setDate(d.getDate() + 1); return at(d, 8);
    case 'this-weekend': d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return at(d, 8);
    case 'next-week': d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return at(d, 8);
    case 'someday': d.setDate(d.getDate() + 30); return at(d, 8);
    default: return null;
  }
}
const PRESETS = [
  ['later-today', 'Later today'], ['tomorrow', 'Tomorrow'],
  ['this-weekend', 'This weekend'], ['next-week', 'Next week'],
  ['someday', 'Someday'], ['pick', 'Pick date…'],
];
function fmtDate(t) {
  return new Date(t).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/* ---------- Gmail adapter seam (backend takes over in Phase 1) ---------- */
const MailAdapter = {
  // async pullThreads() / pushOp(op) land here; local state stands in for now.
  isLocal: true,
};

/* ---------- rendering ---------- */
const stream = document.getElementById('stream');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function visible() {
  const now = Date.now();
  let ts = state.threads.filter((t) => {
    if (query && !(t.subject + ' ' + t.snippet + ' ' + t.from).toLowerCase().includes(query)) return false;
    if (pinnedOnly && !t.pinned) return false;
    const snoozed = t.snoozedUntil > now;
    if (tab === 'inbox') return !t.done && !snoozed;
    if (tab === 'snoozed') return !t.done && snoozed;
    if (tab === 'done') return t.done;
    if (tab === 'reminders') return t.kind === 'reminder' && !t.done && !snoozed;
    return false;
  });
  ts.sort((a, b) => b.ts - a.ts);
  if (tab === 'inbox' && pinnedOnly) ts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return ts;
}

function dayLabel(ts) {
  const d = new Date(ts), n = new Date();
  const day = (x) => x.getFullYear() * 1000 + Math.floor((x.getMonth() * 31 + x.getDate()));
  const diff = day(n) - day(d);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function threadHtml(t) {
  const av = t.kind === 'reminder' ? 'rem' : (t.bundleId ? 'bundle' : '');
  const letter = esc((t.kind === 'reminder' ? 'R' : (t.from || 'U')).trim()[0] || '•');
  const pin = t.pinned ? '📌 ' : '';
  const assist = t.assist ? `<div class="assist">${esc(t.assist)}</div>` : '';
  const clock = t.snoozedUntil ? `<div class="clock">Snoozed until ${esc(fmtDate(t.snoozedUntil))}</div>` : '';
  const meta = t.kind === 'reminder' ? 'Reminder' : esc(t.from);
  const act = tab === 'done'
    ? `<button data-op="restore" title="Restore">↩</button>`
    : `<button data-op="pin" title="Pin">${t.pinned ? '★' : '☆'}</button>
       <button data-op="snooze" title="Snooze">◷</button>
       <button data-op="done" class="done" title="Done">✓</button>`;
  return `<div class="thread${t.pinned ? ' pinned' : ''}" data-id="${t.id}">
    <div class="avatar ${av}">${letter}</div>
    <div class="body"><div class="subj">${pin}${esc(t.subject)} <span class="meta">${meta}</span></div>
    <div class="snip">${esc(t.snippet)}</div>${assist}${clock}</div>
    <div class="rowbtns">${act}</div></div>`;
}

function render() {
  const counts = {
    inbox: state.threads.filter((t) => !t.done && !(t.snoozedUntil > Date.now())).length,
    snoozed: state.threads.filter((t) => !t.done && t.snoozedUntil > Date.now()).length,
    done: state.threads.filter((t) => t.done).length,
    reminders: state.threads.filter((t) => t.kind === 'reminder' && !t.done).length,
  };
  document.getElementById('cInbox').textContent = counts.inbox || '';
  document.getElementById('cSnoozed').textContent = counts.snoozed || '';
  document.getElementById('cDone').textContent = counts.done || '';
  document.getElementById('cRem').textContent = counts.reminders || '';

  const items = visible();
  if (!items.length) {
    const msg = tab === 'done' ? 'Nothing done yet.' : tab === 'snoozed'
      ? 'Anything you snooze will wait here.' : 'Inbox Zero — enjoy the sunshine.';
    stream.innerHTML = `<div class="empty"><div class="sun">☀</div><p>${msg}</p></div>`;
    return;
  }
  let html = '', lastDay = null;
  if (tab === 'inbox') {
    // Bundle rows first, then loose threads grouped by day.
    const bundled = items.filter((t) => t.bundleId);
    const loose = items.filter((t) => !t.bundleId);
    const byBundle = {};
    for (const t of bundled) (byBundle[t.bundleId] ??= []).push(t);
    for (const [bid, ts] of Object.entries(byBundle)) {
      const b = state.bundles.find((x) => x.id === bid) || { name: bid, icon: '•' };
      const fresh = ts.filter((t) => Date.now() - t.ts < DAY).length;
      html += `<div class="thread" data-bundle="${bid}">
        <div class="avatar bundle">${esc(b.icon)}</div>
        <div class="body"><div class="subj">${esc(b.name)} <span class="meta">${fresh ? fresh + ' new' : ts.length + ' items'}</span></div>
        <div class="snip">${esc(ts.slice(0, 3).map((t) => t.subject).join(' · '))}</div></div>
        <div class="rowbtns"><button data-bop="sweep" title="Sweep bundle">✓✓</button></div></div>`;
    }
    for (const t of loose) {
      const dl = dayLabel(t.ts);
      if (dl !== lastDay) { html += `<div class="day">${dl}</div>`; lastDay = dl; }
      html += threadHtml(t);
    }
  } else {
    for (const t of items) html += threadHtml(t);
  }
  stream.innerHTML = html;
}

/* ---------- ops + undo ---------- */
function pushUndo(label, apply) { undoStack.push({ label, apply }); }
function toast(text, undoLabel) {
  const el = document.getElementById('toast');
  el.innerHTML = '';
  el.append(document.createTextNode(text));
  if (undoLabel) {
    const b = document.createElement('button');
    b.textContent = 'UNDO';
    b.onclick = () => {
      const u = undoStack.pop();
      if (u) { u.apply(); save(); render(); }
      el.hidden = true;
    };
    el.append(b);
  }
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 7000);
}

stream.addEventListener('click', (e) => {
  const bRow = e.target.closest('[data-bundle]');
  if (e.target.closest('[data-bop="sweep"]')) {
    const bid = e.target.closest('[data-bundle]').dataset.bundle;
    const affected = state.threads.filter((t) => t.bundleId === bid && !t.done).map((t) => t.id);
    state.threads.forEach((t) => { if (affected.includes(t.id)) t.done = true; });
    pushUndo('sweep', () => state.threads.forEach((t) => { if (affected.includes(t.id)) t.done = false; }));
    save(); render(); toast(`Swept bundle.`, true);
    return;
  }
  if (bRow && !e.target.closest('button')) { openBundle(bRow.dataset.bundle); return; }
  const btn = e.target.closest('button[data-op]');
  if (!btn) return;
  const id = e.target.closest('.thread').dataset.id;
  const t = state.threads.find((x) => x.id === id);
  const op = btn.dataset.op;
  if (op === 'done') {
    t.done = true;
    pushUndo('done', () => { t.done = false; });
    save(); render(); toast(`Marked "${t.subject}" done.`, true);
  } else if (op === 'restore') {
    t.done = false; save(); render();
  } else if (op === 'pin') {
    t.pinned = !t.pinned; save(); render();
  } else if (op === 'snooze') {
    openSheet([id]);
  }
});

function openBundle(bid) {
  const b = state.bundles.find((x) => x.id === bid);
  const ts = state.threads.filter((t) => t.bundleId === bid && !t.done);
  stream.innerHTML = `<div class="bundle-head">${esc(b?.icon ?? '•')} ${esc(b?.name ?? bid)}
    <span class="meta">${ts.length}</span><button class="sweep" id="sweepBtn">✓ Sweep</button></div>`
    + (ts.map(threadHtml).join('') || '<div class="empty"><p>Nothing here.</p></div>')
    + `<div class="empty"><button id="backBtn" class="cancel">← Back to inbox</button></div>`;
  document.getElementById('backBtn').onclick = render;
  document.getElementById('sweepBtn').onclick = () => {
    const ids = ts.map((t) => t.id);
    state.threads.forEach((t) => { if (ids.includes(t.id)) t.done = true; });
    pushUndo('sweep', () => state.threads.forEach((t) => { if (ids.includes(t.id)) t.done = false; }));
    save(); render(); toast('Swept bundle.', true);
  };
}

/* ---------- snooze sheet ---------- */
const sheet = document.getElementById('sheet');
const sheetGrid = document.getElementById('sheetGrid');
function openSheet(ids) {
  sheetTarget = ids;
  document.getElementById('sheetTitle').textContent = 'Snooze until…';
  document.getElementById('sheetCustom').hidden = true;
  sheetGrid.innerHTML = '';
  for (const [key, label] of PRESETS) {
    const d = key === 'pick' ? null : resolveSnooze(key);
    const b = document.createElement('button');
    b.innerHTML = `${label}${d ? `<small>${fmtDate(d)}</small>` : ''}`;
    b.onclick = () => {
      if (key === 'pick') { document.getElementById('sheetCustom').hidden = false; return; }
      applySnooze(ids, d.getTime());
    };
    sheetGrid.append(b);
  }
  sheet.hidden = false;
}
function applySnooze(ids, when) {
  const prev = ids.map((id) => [id, state.threads.find((t) => t.id === id).snoozedUntil]);
  state.threads.forEach((t) => { if (ids.includes(t.id)) t.snoozedUntil = when; });
  pushUndo('snooze', () => prev.forEach(([id, v]) => { state.threads.find((t) => t.id === id).snoozedUntil = v; }));
  sheet.hidden = true;
  save(); render(); toast(`Snoozed until ${fmtDate(when)}.`, true);
}
document.getElementById('sheetCancel').onclick = () => { sheet.hidden = true; };
document.getElementById('customGo').onclick = () => {
  const v = document.getElementById('customDate').value;
  if (v) applySnooze(sheetTarget, new Date(v).getTime());
};

/* ---------- reminders ---------- */
const remDialog = document.getElementById('remDialog');
document.getElementById('fab').onclick = () => {
  const m = document.getElementById('fabMenu');
  m.hidden = !m.hidden;
};
document.getElementById('addMail').onclick = () => {
  document.getElementById('fabMenu').hidden = true;
  toast('Mail compose connects to Gmail in Phase 1.');
};
document.getElementById('addReminder').onclick = () => {
  document.getElementById('fabMenu').hidden = true;
  const g = document.getElementById('remGrid');
  g.innerHTML = '';
  for (const [key, label] of PRESETS) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      const title = document.getElementById('remTitle').value.trim() || 'Untitled reminder';
      const when = key === 'pick' ? Date.now() + DAY : resolveSnooze(key).getTime();
      state.threads.push({
        id: 'r' + Date.now(), kind: 'reminder', from: '', subject: title,
        snippet: 'Reminder', assist: null, ts: Date.now(), bundleId: null,
        pinned: false, done: false, snoozedUntil: 0,
      });
      const added = state.threads[state.threads.length - 1];
      if (when > Date.now()) added.snoozedUntil = 0; // reminders start in inbox
      save(); remDialog.hidden = true;
      document.getElementById('remTitle').value = '';
      render(); toast(`Reminder "${title}" added.`, false);
    };
    g.append(b);
  }
  remDialog.hidden = false;
};
document.getElementById('remCancel').onclick = () => { remDialog.hidden = true; };

/* ---------- nav / search / filter ---------- */
document.getElementById('menuBtn').onclick = () => {
  const d = document.getElementById('drawer');
  d.hidden = !d.hidden;
};
document.querySelectorAll('#drawer button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('#drawer button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    tab = b.dataset.tab;
    render();
  };
});
document.getElementById('pinFilter').onclick = function () {
  pinnedOnly = !pinnedOnly;
  this.classList.toggle('dim', !pinnedOnly);
  this.classList.toggle('lit', pinnedOnly);
  render();
};
document.getElementById('searchBtn').onclick = () => {
  const bar = document.getElementById('searchBar');
  bar.hidden = !bar.hidden;
  if (!bar.hidden) document.getElementById('searchInput').focus();
};
document.getElementById('searchInput').oninput = function () {
  query = this.value.trim().toLowerCase();
  render();
};

render();
