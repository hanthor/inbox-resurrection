/* Backend adapter: talks to backend/src/index.mjs when configured.
   Setup: paste backend URL + OAuth access token once (stored locally).
   Without it the app runs fully local (MailAdapter.isLocal). */
'use strict';

const Backend = {
  get base() { return localStorage.getItem('inbox-backend-url') || ''; },
  get token() { return localStorage.getItem('inbox-token') || ''; },
  get on() { return !!(this.base && this.token); },

  configure() {
    const base = prompt('Backend URL (e.g. http://localhost:8787)', this.base || 'http://localhost:8787');
    if (!base) return false;
    const token = prompt('Google OAuth access token (Bearer)', this.token);
    if (!token) return false;
    localStorage.setItem('inbox-backend-url', base.replace(/\/$/, ''));
    localStorage.setItem('inbox-token', token);
    return true;
  },

  async call(path, opts = {}) {
    const res = await fetch(this.base + path, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + this.token, 'content-type': 'application/json' },
    });
    if (!res.ok) throw new Error(`backend ${path} -> ${res.status}`);
    return res.json();
  },

  /** Pull live threads + reminders, mapped to local shape. */
  async sync(state) {
    const { threads = [] } = await this.call('/api/threads');
    const { reminders = [] } = await this.call('/api/reminders').catch(() => ({ reminders: [] }));
    const mapped = threads.map((t, i) => ({
      id: t.id, kind: 'mail', from: t.from, subject: t.subject, snippet: t.snippet,
      assist: null, ts: Date.now() - i * 6e5, bundleId: null,
      pinned: false, done: false, snoozedUntil: 0,
    }));
    // Enrich in one batch per thread (small inbox slice only).
    for (const m of mapped.slice(0, 25)) {
      try {
        const { assists = [], bundle = null } =
          await this.call('/api/enrich', { method: 'POST', body: JSON.stringify(m) });
        if (assists.length) m.assist = assists.map((a) => a.text).join(' · ');
        if (bundle) m.bundleId = bundle;
      } catch (_) { /* offline-tolerant */ }
    }
    state.threads = mapped.concat(reminders.map((r) => ({
      id: r.id, kind: 'reminder', from: '', subject: r.subject, snippet: r.snippet || 'Reminder',
      assist: null, ts: Date.now(), bundleId: null, pinned: false,
      done: !!r.done, snoozedUntil: 0,
    })));
  },

  /** Fire-and-forget server mirror of a local op (local state stays primary). */
  mirror(path, payload) {
    if (!this.on) return;
    this.call(path, { method: 'POST', body: JSON.stringify(payload) }).catch(() => {});
  },
};
window.Backend = Backend;
