import test from 'node:test';
import assert from 'node:assert/strict';
import { currentHabitStreak, habitCompletedOn, habitPeriodSummary, longestHabitStreak, migrateLegacyHabitWeek } from './habits.js';

const habit = { frequency: 'Daily', target: 1, checkins: { '2026-08-01': 1, '2026-08-02': 1, '2026-08-03': 1, '2026-08-05': 1 } };

test('habit completion respects targets', () => {
  assert.equal(habitCompletedOn({ frequency: 'Daily', target: 2, checkins: { '2026-08-05': 1 } }, '2026-08-05'), false);
  assert.equal(habitCompletedOn({ frequency: 'Daily', target: 2, checkins: { '2026-08-05': 2 } }, '2026-08-05'), true);
});

test('habit streak uses scheduled calendar dates', () => {
  assert.equal(currentHabitStreak(habit, '2026-08-05'), 1);
  assert.equal(longestHabitStreak(habit, '2026-08-05'), 3);
});

test('period summary excludes unscheduled weekdays', () => {
  const result = habitPeriodSummary({ frequency: 'Weekdays', target: 1, checkins: { '2026-08-03': 1, '2026-08-04': 1, '2026-08-05': 1 } }, 7, '2026-08-09');
  assert.equal(result.scheduled, 5);
  assert.equal(result.completed, 3);
  assert.equal(result.percentage, 60);
});

test('legacy week checks migrate to dated checkins', () => {
  const result = migrateLegacyHabitWeek({ week: [true, false, true, false, false, false, false], target: 1 }, '2026-08-05');
  assert.equal(result['2026-08-03'], 1);
  assert.equal(result['2026-08-05'], 1);
});
