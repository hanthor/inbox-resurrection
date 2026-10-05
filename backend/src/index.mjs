import http from 'node:http';
import { GmailClient, threadSummary } from './gmail.js';
import { TasksClient } from './tasks.js';
import { extractAssists, classifyBundle } from './enrich.js';
import { SnoozeStore } from './scheduler.js';

// Phase 1 service: Gmail triage ops + Tasks sync + snooze tick + enrichment.
// Auth: callers send their OAuth access token as `Authorization: Bearer …`.
// Without a token the API serves demo data (local mode, mirrors web seed).

const store = new SnoozeStore(process.env.SNOOZE_DB ?? null);
const port = process.env.PORT ?? 8787;

function tokenOf(req) {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, phase: 1 });
    }
    const token = tokenOf(req);
    if (!token) return json(res, 200, { local: true, note: 'send Bearer token for live Gmail' });

    const gmail = new GmailClient(token);
    const tasks = new TasksClient(token);

    if (req.method === 'GET' && url.pathname === '/api/threads') {
      const { threads = [] } = await gmail.listInbox();
      const full = await Promise.all(threads.slice(0, 25).map((t) => gmail.getThread(t.id)));
      return json(res, 200, { threads: full.map(threadSummary) });
    }
    if (req.method === 'POST' && url.pathname === '/api/done') {
      const { id } = await body(req);
      await gmail.markDone(id);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/pin') {
      const { id, pinned } = await body(req);
      await gmail.ensureLabels();
      await gmail.setPinned(id, !!pinned);
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/snooze') {
      const { id, fireAt } = await body(req);
      await gmail.snoozeOut(id);
      store.schedule(id, Number(fireAt));
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/tick') {
      const due = store.due();
      await Promise.all(due.map((id) => gmail.unsnooze(id)));
      return json(res, 200, { returned: due });
    }
    if (req.method === 'GET' && url.pathname === '/api/reminders') {
      const listId = await tasks.ensureInboxList();
      const { items = [] } = await tasks.listTasks(listId);
      return json(res, 200, { reminders: items.map((t) => tasks.toReminder(t)) });
    }
    if (req.method === 'POST' && url.pathname === '/api/reminders') {
      const { title, notes, dueAt } = await body(req);
      const listId = await tasks.ensureInboxList();
      const created = await tasks.fromReminder(listId, { title, notes, dueAt });
      return json(res, 200, { task: tasks.toReminder(created) });
    }
    if (req.method === 'POST' && url.pathname === '/api/enrich') {
      const msg = await body(req);
      return json(res, 200, {
        assists: extractAssists(msg),
        bundle: classifyBundle(msg),
      });
    }
    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 500, { error: String(e.message ?? e) });
  }
});

server.listen(port, () => console.log(`inbox backend phase-1 on :${port}`));
