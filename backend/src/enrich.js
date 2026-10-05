// Assists/Highlights extraction: order/flight/bill signals -> glance lines.
// Pure functions over subject+snippet; server enrichment (live status APIs)
// plugs in behind enrichAsync() in Phase 4. See SPEC.md §6.

const PATTERNS = [
  {
    kind: 'flight',
    re: /\b([A-Z]{2})\s?(\d{2,4})\b/,
    describe: (m, text) => {
      const conf = text.match(/(?:confirmation|conf\.?|record locator)\s*[#: ]?\s*([A-Z0-9]{5,8})/i);
      return `Flight ${m[1]}${m[2]}${conf ? ` · #${conf[1].toUpperCase()}` : ''}`;
    },
  },
  {
    kind: 'tracking',
    re: /\b(1Z[0-9A-Z]{12,})\b/i,
    describe: (m) => `Tracking ${m[1].toUpperCase()}`,
  },
  {
    kind: 'tracking',
    re: /\b(\d{12,15})\b/,
    describe: (m) => `Tracking ${m[1]}`,
  },
  {
    kind: 'bill',
    re: /\b(due|payment due|amount due)[^.\n]{0,40}(\$[\d,]+\.\d{2}|\d+\s?(USD|EUR))?/i,
    describe: (m) => `Bill ${m[2] ? m[2] : 'due — consider a reminder'}`,
  },
  {
    kind: 'event',
    re: /\b(check-?in|reservation|booking)[^.\n]{0,60}/i,
    describe: (m) => m[0].length > 80 ? m[0].slice(0, 80) + '…' : m[0],
  },
];

/** @returns { kind, text }[] glance lines, empty when nothing detected. */
export function extractAssists({ subject = '', snippet = '' } = {}) {
  const text = `${subject}\n${snippet}`;
  const out = [];
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) out.push({ kind: p.kind, text: p.describe(m, text) });
  }
  return out;
}

/** Classify into a default bundle id (rule-engine v1; ML classifier is Phase 4). */
export function classifyBundle({ from = '', subject = '', snippet = '' } = {}) {
  const t = `${from} ${subject} ${snippet}`.toLowerCase();
  if (/airline|flight|hotel|booking|itinerary|boarding|check-in/.test(t)) return 'travel';
  if (/order|shipped|tracking|delivery|receipt/.test(t)) return 'purchases';
  if (/invoice|statement|payment due|bill|bank/.test(t)) return 'finance';
  if (/unsubscribe|promo|sale|deal|offer/.test(t)) return 'promos';
  return null;
}
