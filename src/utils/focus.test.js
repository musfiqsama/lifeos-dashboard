import test from 'node:test';
import assert from 'node:assert/strict';
import { focusMinutesToday, nextBreakMode, normalizeTimerSettings, remainingTimerSeconds } from './focus.js';

test('running timer derives remaining time from endsAt', () => {
  assert.equal(remainingTimerSeconds({ running: true, endsAt: '2026-08-05T12:01:00.000Z' }, Date.parse('2026-08-05T12:00:00.000Z')), 60);
});

test('focus minutes are grouped by local date field', () => {
  assert.equal(focusMinutesToday([{ minutes: 25, dateISO: '2026-08-05' }, { minutes: 50, dateISO: '2026-08-04' }], '2026-08-05'), 25);
});

test('long break follows configured focus cycle', () => {
  const settings = normalizeTimerSettings({ sessionsBeforeLongBreak: 3 });
  assert.equal(nextBreakMode(2, settings), 'shortBreak');
  assert.equal(nextBreakMode(3, settings), 'longBreak');
});
