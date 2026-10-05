import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesFilter, validateBundleName, shouldSurface, THROTTLING } from '../src/cluster.mjs';
import { resolveSnooze } from '../src/snooze.mjs';

test('AND predicates: from + excludes', () => {
  const filter = { predicates: [
    { field: 'from', value: 'shoehop' },
    { field: 'excludes', value: 'refund' },
  ] };
  assert.equal(matchesFilter(filter, { from: 'orders@shoehop.com', subject: 'Your order', snippet: '' }), true);
  assert.equal(matchesFilter(filter, { from: 'orders@shoehop.com', subject: 'Refund issued', snippet: '' }), false);
  assert.equal(matchesFilter(filter, { from: 'bank.com', subject: 'Statement', snippet: '' }), false);
});

test('to/subject/includes predicates', () => {
  assert.equal(matchesFilter({ predicates: [{ field: 'to', value: 'alice' }] }, { to: ['Alice@x.com'], subject: '', snippet: '' }), true);
  assert.equal(matchesFilter({ predicates: [{ field: 'subject', value: 'invoice' }] }, { subject: 'Invoice #4', snippet: '' }), true);
  assert.equal(matchesFilter({ predicates: [{ field: 'includes', value: 'boarding' }] }, { subject: '', snippet: 'boarding pass attached' }), true);
});

test('bundle name validation mirrors APK errors', () => {
  assert.equal(validateBundleName(''), 'Cannot create without a name');
  assert.equal(validateBundleName('a^b'), '^ is not allowed');
  assert.equal(validateBundleName('x'.repeat(51)), 'Too long');
  assert.equal(validateBundleName('Trips', ['trips']), 'Already exists');
  assert.equal(validateBundleName('Receipts', ['trips']), null);
});

test('throttling surfaces at 7AM daily / Mon 7AM weekly', () => {
  const mon7 = new Date(2026, 9, 5, 7, 0); // a Monday
  const mon9 = new Date(2026, 9, 5, 9, 0);
  const tue7 = new Date(2026, 9, 6, 7, 0);
  assert.equal(shouldSurface(THROTTLING.AS_ARRIVES, mon9), true);
  assert.equal(shouldSurface(THROTTLING.DAILY, mon7), true);
  assert.equal(shouldSurface(THROTTLING.DAILY, mon9), false);
  assert.equal(shouldSurface(THROTTLING.WEEKLY, mon7), true);
  assert.equal(shouldSurface(THROTTLING.WEEKLY, tue7), false);
});

test('snooze presets resolve forward in time', () => {
  const now = new Date(2026, 9, 5, 10, 0); // Mon 10:00
  assert.ok(resolveSnooze('later-today', now) > now);
  assert.ok(resolveSnooze('tomorrow', now) > now);
  assert.equal(resolveSnooze('next-week', now).getDay(), 1);
  assert.ok(resolveSnooze('someday', now) > now);
  assert.equal(resolveSnooze('pick-place', now), null);
});
