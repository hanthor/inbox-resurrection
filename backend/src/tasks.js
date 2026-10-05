// Google Tasks integration: Inbox reminders <-> task list items.
// Reminder -> task: title, notes (source), due (RFC3339), status.
// Task -> reminder: title, due, completed maps to done.
import { gapi } from './google.js';

const BASE = 'https://tasks.googleapis.com/tasks/v1';

export class TasksClient {
  constructor(accessToken, fetchFn = fetch) {
    this.token = accessToken;
    this.fetch = fetchFn;
  }
  call(path, opts = {}) {
    return gapi(`${BASE}${path}`, this.token, { ...opts, fetchFn: this.fetch });
  }

  async lists() {
    return this.call('/users/@me/lists');
  }

  /** Ensure a dedicated "Inbox Reminders" list exists; returns its id. */
  async ensureInboxList(title = 'Inbox Reminders') {
    const { items = [] } = await this.lists();
    const found = items.find((l) => l.title === title);
    if (found) return found.id;
    const created = await this.call('/users/@me/lists', { method: 'POST', body: { title } });
    return created.id;
  }

  async listTasks(listId, showCompleted = false) {
    return this.call(`/lists/${listId}/tasks?showCompleted=${showCompleted}`);
  }

  /** Create a task from an Inbox reminder. dueAt: epoch millis or 0. */
  async fromReminder(listId, { title, notes = '', dueAt = 0 }) {
    const body = { title, notes };
    if (dueAt) body.due = new Date(dueAt).toISOString();
    return this.call(`/lists/${listId}/tasks`, { method: 'POST', body });
  }

  /** Map a task back to reminder shape for the clients. */
  toReminder(task) {
    return {
      id: `task:${task.id}`,
      kind: 'reminder',
      subject: task.title ?? '',
      snippet: task.notes ?? '',
      done: task.status === 'completed',
      dueAt: task.due ? Date.parse(task.due) : 0,
    };
  }

  async complete(listId, taskId) {
    return this.call(`/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH', body: { status: 'completed' },
    });
  }

  async reopen(listId, taskId) {
    return this.call(`/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH', body: { status: 'needsAction' },
    });
  }

  async remove(listId, taskId) {
    return this.call(`/lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
  }
}
