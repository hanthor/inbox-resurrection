import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAssists } from '../src/enrich.js';

const billOf = (subject) => extractAssists({ subject }).find((x) => x.kind === 'bill');

test('bill line shows a dollar amount with cents', () => {
  assert.deepEqual(billOf('Amount due $1,234.50'), { kind: 'bill', text: 'Bill $1,234.50' });
});

test('bill line shows a USD amount written after the keyword', () => {
  assert.deepEqual(billOf('Payment due in 30 USD'), { kind: 'bill', text: 'Bill 30 USD' });
});

test('bill line shows an EUR amount that follows words after the keyword', () => {
  assert.deepEqual(billOf('Payment due next week: 12 EUR'), { kind: 'bill', text: 'Bill 12 EUR' });
});

test('bill line nudges toward a reminder when no amount is present', () => {
  assert.deepEqual(billOf('Payment due soon'), { kind: 'bill', text: 'Bill due — consider a reminder' });
});
