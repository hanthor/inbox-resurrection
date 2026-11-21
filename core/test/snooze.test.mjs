import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSnooze, SNOOZE_OPTIONS } from '../src/snooze.mjs';
import { matchesFilter, shouldSurface, THROTTLING } from '../src/cluster.mjs';

// 2026-10-05 is a Monday; local-time constructors keep the weekday maths
// independent of the host timezone.
const day = (d, h = 10) => new Date(2026, 9, d, h, 0);
const SUN = 4, MON = 5, TUE = 6, FRI = 9, SAT = 10;

const ymdh = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

test('this-weekend and next-weekend resolve to the coming Saturday at the morning default', () => {
  for (const preset of ['this-weekend', 'next-weekend']) {
    assert.deepEqual(ymdh(resolveSnooze(preset, day(MON))), [2026, 10, 10, 8, 0], `${preset} from Monday`);
    assert.deepEqual(ymdh(resolveSnooze(preset, day(FRI))), [2026, 10, 10, 8, 0], `${preset} from Friday`);
    assert.deepEqual(ymdh(resolveSnooze(preset, day(SUN))), [2026, 10, 10, 8, 0], `${preset} from Sunday`);
  }
});

test('weekend preset on a Saturday jumps a full week instead of returning today', () => {
  const r = resolveSnooze('this-weekend', day(SAT, 6));
  assert.deepEqual(ymdh(r), [2026, 10, 17, 8, 0]);
  assert.equal(r.getDay(), 6);
});

test('next-week and later-next-week land on Monday, a full week ahead from Monday', () => {
  for (const preset of ['next-week', 'later-next-week']) {
    assert.deepEqual(ymdh(resolveSnooze(preset, day(MON))), [2026, 10, 12, 8, 0], `${preset} from Monday`);
    assert.deepEqual(ymdh(resolveSnooze(preset, day(TUE))), [2026, 10, 12, 8, 0], `${preset} from Tuesday`);
    assert.deepEqual(ymdh(resolveSnooze(preset, day(SUN))), [2026, 10, 5, 8, 0], `${preset} from Sunday`);
  }
});

test('custom morning and evening override the defaults', () => {
  const now = day(MON);
  assert.deepEqual(ymdh(resolveSnooze('later-today', now)), [2026, 10, 5, 19, 0]);
  assert.deepEqual(ymdh(resolveSnooze('later-today', now, { evening: 21 })), [2026, 10, 5, 21, 0]);
  assert.deepEqual(ymdh(resolveSnooze('tomorrow', now, { morning: 6 })), [2026, 10, 6, 6, 0]);
  assert.deepEqual(ymdh(resolveSnooze('someday', now, { morning: 9 })), [2026, 11, 4, 9, 0]);
  assert.deepEqual(ymdh(resolveSnooze('this-weekend', now, { morning: 10 })), [2026, 10, 10, 10, 0]);
});

test('resolveSnooze does not mutate the supplied now', () => {
  const now = day(MON);
  const before = now.getTime();
  for (const preset of SNOOZE_OPTIONS) resolveSnooze(preset, now);
  assert.equal(now.getTime(), before);
});

test('the interactive presets resolve to null and every implemented preset to a future date', () => {
  const now = day(MON);
  const interactive = ['pick-datetime', 'pick-place'];
  for (const preset of interactive) assert.equal(resolveSnooze(preset, now), null, preset);
  for (const preset of SNOOZE_OPTIONS.filter((p) => !interactive.includes(p) && p !== 'later-this-week')) {
    assert.ok(resolveSnooze(preset, now) > now, preset);
  }
});

test('filters: no predicates match everything, unknown field matches nothing', () => {
  const msg = { from: 'a@b.com', subject: 's', snippet: '' };
  assert.equal(matchesFilter({}, msg), true);
  assert.equal(matchesFilter({ predicates: [] }, msg), true);
  assert.equal(matchesFilter({ predicates: [{ field: 'cc', value: 'a' }] }, msg), false);
});

test('filters tolerate messages with missing fields', () => {
  assert.equal(matchesFilter({ predicates: [{ field: 'from', value: 'x' }] }, {}), false);
  assert.equal(matchesFilter({ predicates: [{ field: 'to', value: 'x' }] }, {}), false);
  assert.equal(matchesFilter({ predicates: [{ field: 'excludes', value: 'x' }] }, { subject: '', snippet: '' }), true);
});

test('shouldSurface: weekly needs Monday 7AM exactly, unknown throttling always surfaces', () => {
  assert.equal(shouldSurface(THROTTLING.WEEKLY, day(MON, 7)), true);
  assert.equal(shouldSurface(THROTTLING.WEEKLY, day(MON, 8)), false);
  assert.equal(shouldSurface(THROTTLING.DAILY, day(TUE, 7)), true);
  assert.equal(shouldSurface('hourly', day(TUE, 3)), true);
});
