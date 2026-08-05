import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReminderCandidates,
  defaultNotificationSettings,
  dueReminderCandidates,
  reminderKey,
  upsertReminderHistory,
} from './reminders.js';

test('buildReminderCandidates creates reminder timestamps from calendar events', () => {
  const now = new Date('2026-08-05T10:00:00');
  const candidates = buildReminderCandidates({
    calendarItems: [{ id: 'c1', title: 'Meeting', date: '2026-08-05', startTime: '11:00', reminderMinutes: 30 }],
  }, now, defaultNotificationSettings);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].leadMinutes, 30);
  assert.equal(new Date(candidates[0].remindAt).getTime(), new Date('2026-08-05T10:30:00').getTime());
});

test('dueReminderCandidates avoids dismissed and already notified reminders', () => {
  const candidate = {
    key: 'calendar:c1:2026-08-05:11:00',
    remindAt: new Date('2026-08-05T10:30:00').toISOString(),
    occursAt: new Date('2026-08-05T11:00:00').toISOString(),
  };
  const now = new Date('2026-08-05T10:45:00');
  assert.equal(dueReminderCandidates([candidate], [], now, { ...defaultNotificationSettings, quietStart: '', quietEnd: '' }).length, 1);
  assert.equal(dueReminderCandidates([candidate], [{ key: candidate.key, dismissedAt: now.toISOString() }], now, defaultNotificationSettings).length, 0);
  assert.equal(dueReminderCandidates([candidate], [{ key: candidate.key, notifiedAt: now.toISOString() }], now, defaultNotificationSettings).length, 0);
});

test('upsertReminderHistory updates one occurrence without duplicates', () => {
  const key = reminderKey({ sourceType: 'exam', sourceId: 'e1', date: '2026-08-10', startTime: '09:00' });
  const first = upsertReminderHistory([], key, { notifiedAt: '2026-08-09T09:00:00.000Z' });
  const second = upsertReminderHistory(first, key, { snoozedUntil: '2026-08-09T09:10:00.000Z' });
  assert.equal(second.length, 1);
  assert.equal(second[0].notifiedAt, '2026-08-09T09:00:00.000Z');
  assert.equal(second[0].snoozedUntil, '2026-08-09T09:10:00.000Z');
});
