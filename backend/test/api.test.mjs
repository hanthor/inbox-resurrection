import test from 'node:test';
import assert from 'node:assert/strict';
import { GmailClient, threadSummary, PIN_LABEL } from '../src/gmail.js';
import { TasksClient } from '../src/tasks.js';
import { extractAssists, classifyBundle } from '../src/enrich.js';
import { SnoozeStore } from '../src/scheduler.js';

function mockFetch(routes) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    for (const [match, response] of routes) {
      if (url.includes(match)) {
        return { ok: true, status: 200, json: async () => response };
      }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  fn.calls = calls;
  return fn;
}

test('markDone archives (removes INBOX)', async () => {
  const fetch = mockFetch([['/modify', {}]]);
  await new GmailClient('tok', fetch).markDone('abc');
  assert.deepEqual(fetch.calls[0].body, { removeLabelIds: ['INBOX'] });
  assert.ok(fetch.calls[0].url.includes('/threads/abc/modify'));
});

test('setPinned toggles INBOX_PINNED', async () => {
  const fetch = mockFetch([['/modify', {}]]);
  await new GmailClient('tok', fetch).setPinned('abc', true);
  assert.deepEqual(fetch.calls[0].body, { addLabelIds: [PIN_LABEL] });
  await new GmailClient('tok', fetch).setPinned('abc', false);
  assert.deepEqual(fetch.calls[1].body, { removeLabelIds: [PIN_LABEL] });
});

test('ensureLabels creates INBOX_PINNED when missing', async () => {
  const fetch = mockFetch([
    ['/labels/list', { labels: [] }],
    ['/labels/create', { id: 'Label_9', name: PIN_LABEL }],
  ]);
  const { pinnedId } = await new GmailClient('tok', fetch).ensureLabels();
  assert.equal(pinnedId, 'Label_9');
  assert.equal(fetch.calls[0].url.includes('/labels/list'), true);
});

test('threadSummary pulls sender/subject/snippet', () => {
  const s = threadSummary({
    id: 't', snippet: 'hi',
    messages: [{ payload: { headers: [
      { name: 'From', value: 'a@x.com' }, { name: 'Subject', value: 'Hey' },
    ] } }],
  });
  assert.deepEqual(s, { id: 't', from: 'a@x.com', subject: 'Hey', snippet: 'hi' });
});

test('reminder -> task maps title/notes/due', async () => {
  const fetch = mockFetch([['/lists/L1/tasks', { id: 'T1', title: 'Call', status: 'needsAction' }]]);
  const c = new TasksClient('tok', fetch);
  await c.fromReminder('L1', { title: 'Call', notes: 'n', dueAt: Date.parse('2026-10-06T08:00:00Z') });
  const body = fetch.calls[0].body;
  assert.equal(body.title, 'Call');
  assert.ok(body.due.startsWith('2026-10-06'));
});

test('task -> reminder maps completed and due', () => {
  const c = new TasksClient('tok', mockFetch([]));
  const r = c.toReminder({ id: 'T1', title: 'Call', notes: 'n', status: 'completed', due: '2026-10-06T08:00:00.000Z' });
  assert.equal(r.done, true);
  assert.equal(r.id, 'task:T1');
  assert.ok(r.dueAt > 0);
});

test('extractAssists finds flight + tracking + bill', () => {
  const a = extractAssists({
    subject: 'Flight confirmation JL516, conf ABC123',
    snippet: 'Tracking 1Z9999999999999999. Payment due $123.45',
  });
  const kinds = a.map((x) => x.kind);
  assert.ok(kinds.includes('flight'));
  assert.ok(kinds.includes('tracking'));
  assert.ok(kinds.includes('bill'));
});

test('classifyBundle routes travel/purchases/finance/promos', () => {
  assert.equal(classifyBundle({ subject: 'Your boarding pass' }), 'travel');
  assert.equal(classifyBundle({ subject: 'Order shipped' }), 'purchases');
  assert.equal(classifyBundle({ subject: 'Statement ready' }), 'finance');
  assert.equal(classifyBundle({ subject: 'Weekend SALE -50%' }), 'promos');
  assert.equal(classifyBundle({ subject: 'Hello' }), null);
});

test('SnoozeStore due/pending round-trip', () => {
  const s = new SnoozeStore(null);
  s.schedule('a', Date.now() - 1000);
  s.schedule('b', Date.now() + 999999);
  assert.deepEqual(s.due(), ['a']);
  assert.deepEqual(s.pending().map((p) => p.id), ['b']);
  s.cancel('b');
  assert.deepEqual(s.pending(), []);
});
