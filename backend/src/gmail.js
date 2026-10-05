// Gmail mapping for Inbox semantics. See SPEC.md §4.
// Done    = remove INBOX (archive).  Pin = add INBOX_PINNED (stays in inbox).
// Snooze  = remove INBOX + scheduler re-adds INBOX at fire time.
import { gapi } from './google.js';

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const PIN_LABEL = 'INBOX_PINNED';

export class GmailClient {
  constructor(accessToken, fetchFn = fetch) {
    this.token = accessToken;
    this.fetch = fetchFn;
  }
  call(path, opts = {}) {
    return gapi(`${BASE}${path}`, this.token, { ...opts, fetchFn: this.fetch });
  }

  /** Ensure our labels exist; returns { pinnedId }. Creates INBOX_PINNED if missing. */
  async ensureLabels() {
    const { labels = [] } = await this.call('/labels/list');
    let pinned = labels.find((l) => l.name === PIN_LABEL);
    if (!pinned) {
      pinned = await this.call('/labels/create', {
        method: 'POST',
        body: { name: PIN_LABEL, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
      });
    }
    return { pinnedId: pinned.id };
  }

  /** Inbox stream: unread + open threads, newest first. */
  async listInbox(maxResults = 50) {
    return this.call(`/threads/list?q=in:inbox&maxResults=${maxResults}`);
  }

  async getThread(id, format = 'metadata') {
    return this.call(`/threads/get?id=${id}&format=${format}`);
  }

  async markDone(threadId) {
    return this.call(`/threads/${threadId}/modify`, {
      method: 'POST', body: { removeLabelIds: ['INBOX'] },
    });
  }

  async setPinned(threadId, pinned) {
    return this.call(`/threads/${threadId}/modify`, {
      method: 'POST',
      body: pinned ? { addLabelIds: [PIN_LABEL] } : { removeLabelIds: [PIN_LABEL] },
    });
  }

  /** Snooze-out: archive now; scheduler re-adds INBOX at fire time via unsnooze(). */
  async snoozeOut(threadId) {
    return this.call(`/threads/${threadId}/modify`, {
      method: 'POST', body: { removeLabelIds: ['INBOX'] },
    });
  }

  async unsnooze(threadId) {
    return this.call(`/threads/${threadId}/modify`, {
      method: 'POST', body: { addLabelIds: ['INBOX'] },
    });
  }

  /** Push notifications for new mail (needs a Cloud Pub/Sub topic). */
  async watch(topicName) {
    return this.call('/watch', { method: 'POST', body: { topicName } });
  }
}

/** Pull sender/subject/snippet out of a metadata-format thread. */
export function threadSummary(thread) {
  const msg = (thread.messages ?? [])[0] ?? {};
  const headers = Object.fromEntries(
    (msg.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]),
  );
  return {
    id: thread.id,
    from: headers.from ?? '',
    subject: headers.subject ?? '(no subject)',
    snippet: thread.snippet ?? '',
  };
}
