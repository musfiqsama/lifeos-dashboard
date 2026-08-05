import test from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, toLocalISODate } from './date.js';

test('toLocalISODate formats a local calendar date', () => {
  assert.equal(toLocalISODate(new Date(2026, 7, 5, 23, 30)), '2026-08-05');
});

test('daysBetween is stable across calendar boundaries', () => {
  assert.equal(daysBetween('2026-08-05', '2026-08-06'), 1);
  assert.equal(daysBetween('2026-08-06', '2026-08-05'), -1);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
  assert.equal(daysBetween('invalid', '2026-08-05'), null);
});
