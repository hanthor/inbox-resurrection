// Cluster (bundle) rule evaluation — ported from APK string evidence.
// Predicates: From / To / Subject / Includes / Excludes, combined with AND.
// Delivery throttling: as-arrive | daily 7AM | weekly Mon 7AM.
// See SPEC.md Appendix A.

export const THROTTLING = Object.freeze({
  AS_ARRIVES: 'as-arrives',
  DAILY: 'once-a-day',
  WEEKLY: 'once-a-week',
});

const norm = (s) => (s ?? '').toLowerCase();

/** @returns true when the message satisfies every predicate in the filter. */
export function matchesFilter(filter, message) {
  const preds = filter.predicates ?? [];
  return preds.every((p) => matchesPredicate(p, message));
}

function matchesPredicate(p, message) {
  switch (p.field) {
    case 'from':
      return norm(message.from).includes(norm(p.value));
    case 'to':
      return (message.to ?? []).some((t) => norm(t).includes(norm(p.value)));
    case 'subject':
      return norm(message.subject).includes(norm(p.value));
    case 'includes':
      return norm(message.subject + ' ' + message.snippet).includes(norm(p.value));
    case 'excludes':
      return !norm(message.subject + ' ' + message.snippet).includes(norm(p.value));
    default:
      return false;
  }
}

/** Validate a new bundle name: required, no caret, length cap. */
export function validateBundleName(name, existing = []) {
  if (!name || !name.trim()) return 'Cannot create without a name';
  if (name.includes('^')) return '^ is not allowed';
  if (name.length > 50) return 'Too long';
  if (existing.some((e) => norm(e) === norm(name.trim()))) return 'Already exists';
  return null;
}

/**
 * Should a bundle surface in the inbox right now?
 * @param {string} throttling one of THROTTLING
 * @param {Date} [now]
 */
export function shouldSurface(throttling, now = new Date()) {
  if (throttling === THROTTLING.AS_ARRIVES) return true;
  const h = now.getHours();
  const isSevenAM = h === 7;
  if (throttling === THROTTLING.DAILY) return isSevenAM;
  if (throttling === THROTTLING.WEEKLY) return now.getDay() === 1 && isSevenAM;
  return true;
}
