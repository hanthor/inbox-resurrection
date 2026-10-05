// Snooze presets — verbatim option ids from APK strings
// (bt_snooze_option_*). Time-only phase; place snooze needs mobile geo.

export const SNOOZE_OPTIONS = Object.freeze([
  'later-today',
  'tomorrow',
  'later-this-week',
  'this-weekend',
  'later-next-week',
  'next-week',
  'next-weekend',
  'someday',
  'pick-datetime',
  'pick-place',
]);

const at = (d, h, m = 0) => {
  const t = new Date(d);
  t.setHours(h, m, 0, 0);
  return t;
};

/**
 * Resolve a preset to a fire-at Date.
 * Defaults mirror common Inbox behavior; user preset times override via `custom`.
 */
export function resolveSnooze(preset, now = new Date(), custom = {}) {
  const morning = custom.morning ?? 8;
  const evening = custom.evening ?? 19;
  const day = new Date(now);
  switch (preset) {
    case 'later-today':
      return at(day, evening);
    case 'tomorrow':
      day.setDate(day.getDate() + 1);
      return at(day, morning);
    case 'this-weekend':
    case 'next-weekend': {
      const d = new Date(day);
      d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
      return at(d, morning);
    }
    case 'next-week':
    case 'later-next-week': {
      const d = new Date(day);
      d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
      return at(d, morning);
    }
    case 'someday':
      day.setDate(day.getDate() + 30);
      return at(day, morning);
    default:
      return null; // pick-datetime / pick-place need UI input
  }
}
