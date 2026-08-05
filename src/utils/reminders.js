import { buildCalendarEvents, shiftISODate } from './calendar.js';
import { toLocalISODate } from './date.js';

export const defaultNotificationSettings = {
  id: 'notification-settings',
  inAppEnabled: true,
  browserEnabled: false,
  defaultLeadMinutes: 30,
  lookAheadDays: 14,
  quietStart: '22:00',
  quietEnd: '07:00',
};

function localDateTime(dateISO, time = '09:00') {
  if (!dateISO) return null;
  const parsed = new Date(`${dateISO}T${time || '09:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function reminderKey(event) {
  return `${event.sourceType || 'event'}:${event.sourceId || event.id}:${event.date}:${event.startTime || 'all-day'}`;
}

export function buildReminderCandidates(data = {}, now = new Date(), settings = defaultNotificationSettings) {
  const today = toLocalISODate(now);
  const end = shiftISODate(today, Math.max(1, Number(settings.lookAheadDays) || 14));
  return buildCalendarEvents(data, today, end)
    .filter((event) => Number(event.reminderMinutes) >= 0 && event.status !== 'Cancelled')
    .map((event) => {
      const occursAt = localDateTime(event.date, event.startTime || '09:00');
      if (!occursAt) return null;
      const leadMinutes = Number.isFinite(Number(event.reminderMinutes)) ? Number(event.reminderMinutes) : Number(settings.defaultLeadMinutes || 30);
      const remindAt = new Date(occursAt.getTime() - leadMinutes * 60000);
      return { ...event, key: reminderKey(event), occursAt: occursAt.toISOString(), remindAt: remindAt.toISOString(), leadMinutes };
    })
    .filter(Boolean)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt));
}

function timeInQuietHours(date, settings) {
  if (!settings.quietStart || !settings.quietEnd || settings.quietStart === settings.quietEnd) return false;
  const current = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (settings.quietStart < settings.quietEnd) return current >= settings.quietStart && current < settings.quietEnd;
  return current >= settings.quietStart || current < settings.quietEnd;
}

export function reminderHistoryState(history = [], key) {
  return history.find((item) => item.key === key) || null;
}

export function dueReminderCandidates(candidates = [], history = [], now = new Date(), settings = defaultNotificationSettings) {
  if (timeInQuietHours(now, settings)) return [];
  const nowMs = now.getTime();
  return candidates.filter((candidate) => {
    const remindAt = new Date(candidate.remindAt).getTime();
    const occursAt = new Date(candidate.occursAt).getTime();
    if (!Number.isFinite(remindAt) || nowMs < remindAt || nowMs > occursAt + 15 * 60000) return false;
    const state = reminderHistoryState(history, candidate.key);
    if (!state) return true;
    if (state.dismissedAt) return false;
    if (state.snoozedUntil && nowMs < new Date(state.snoozedUntil).getTime()) return false;
    if (state.notifiedAt && new Date(state.notifiedAt).getTime() >= remindAt) return false;
    return true;
  });
}

export function upsertReminderHistory(history = [], key, patch = {}) {
  const existing = history.find((item) => item.key === key);
  const next = { id: existing?.id || key, key, ...existing, ...patch };
  return existing ? history.map((item) => item.key === key ? next : item) : [...history, next];
}

export function reminderLabel(candidate, now = new Date()) {
  const occurs = new Date(candidate.occursAt);
  const minutes = Math.round((occurs.getTime() - now.getTime()) / 60000);
  if (minutes <= 0) return 'Now';
  if (minutes < 60) return `In ${minutes} min`;
  if (minutes < 1440) return `In ${Math.round(minutes / 60)} hr`;
  return `In ${Math.round(minutes / 1440)} day${Math.round(minutes / 1440) === 1 ? '' : 's'}`;
}
