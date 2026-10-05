// Snooze scheduler: file-backed { threadId -> fireAt } map.
// tick() returns due ids; callers re-add INBOX via GmailClient.unsnooze().
import fs from 'node:fs';

export class SnoozeStore {
  constructor(path = null) {
    this.path = path;
    this.map = new Map();
    if (path) {
      try {
        const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
        for (const [k, v] of Object.entries(raw)) this.map.set(k, v);
      } catch (_) { /* start empty */ }
    }
  }

  save() {
    if (!this.path) return;
    fs.writeFileSync(this.path, JSON.stringify(Object.fromEntries(this.map)));
  }

  schedule(threadId, fireAt) {
    this.map.set(threadId, fireAt);
    this.save();
  }

  cancel(threadId) {
    this.map.delete(threadId);
    this.save();
  }

  /** Ids whose fire time has passed (removed from the store). */
  due(now = Date.now()) {
    const out = [];
    for (const [id, at] of this.map) {
      if (at <= now) { out.push(id); this.map.delete(id); }
    }
    if (out.length) this.save();
    return out;
  }

  pending() {
    return [...this.map.entries()].map(([id, fireAt]) => ({ id, fireAt }));
  }
}
