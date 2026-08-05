import test from 'node:test';
import assert from 'node:assert/strict';
import { clampNumber, hasTimeConflict, matchesSearch } from './entity.js';

test('matchesSearch is case-insensitive and checks multiple fields', () => {
  assert.equal(matchesSearch('data', 'CSE 2203', 'Data Structures'), true);
  assert.equal(matchesSearch('physics', 'CSE 2203', 'Data Structures'), false);
});

test('clampNumber constrains values safely', () => {
  assert.equal(clampNumber(150), 100);
  assert.equal(clampNumber(-10), 0);
  assert.equal(clampNumber('4', 1, 5), 4);
});

test('hasTimeConflict detects overlapping routine entries', () => {
  const routines = [{ id: 'one', day: 'Sunday', startTime: '10:00', endTime: '11:00' }];
  assert.equal(hasTimeConflict(routines, { day: 'Sunday', startTime: '10:30', endTime: '11:30' }), true);
  assert.equal(hasTimeConflict(routines, { day: 'Sunday', startTime: '11:00', endTime: '12:00' }), false);
  assert.equal(hasTimeConflict(routines, { day: 'Monday', startTime: '10:30', endTime: '11:30' }), false);
});
