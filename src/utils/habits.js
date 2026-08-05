import { todayLocalISO } from './date.js';

const DAY_MS = 86400000;

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(stamp);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? parsed : null;
}

export function addDaysISO(value, amount) {
  const date = parseISO(value);
  if (!date) return '';
  return new Date(date.getTime() + Number(amount || 0) * DAY_MS).toISOString().slice(0, 10);
}

export function dayOfWeek(value) {
  return parseISO(value)?.getUTCDay() ?? -1;
}

export function normalizeCustomDays(value, frequency = 'Daily') {
  const days = Array.isArray(value) ? [...new Set(value.map(Number).filter((day) => day >= 0 && day <= 6))].sort() : [];
  if (frequency === 'Daily') return [0, 1, 2, 3, 4, 5, 6];
  if (frequency === 'Weekdays') return [1, 2, 3, 4, 5];
  if (frequency === 'Weekly') return days.length ? [days[0]] : [1];
  return days.length ? days : [1, 2, 3, 4, 5];
}

export function normalizeCheckins(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([date]) => Boolean(parseISO(date)))
    .map(([date, count]) => [date, Math.max(0, Math.round(Number(count) || 0))])
    .filter(([, count]) => count > 0));
}

export function habitScheduledOn(habit, dateISO) {
  if (!parseISO(dateISO) || (habit?.startDate && dateISO < habit.startDate)) return false;
  const frequency = habit?.frequency || 'Daily';
  return normalizeCustomDays(habit?.customDays, frequency).includes(dayOfWeek(dateISO));
}

export function habitCheckinCount(habit, dateISO) {
  return Math.max(0, Number(habit?.checkins?.[dateISO]) || 0);
}

export function habitTarget(habit) {
  return Math.max(1, Math.round(Number(habit?.target) || 1));
}

export function habitCompletedOn(habit, dateISO) {
  return habitScheduledOn(habit, dateISO) && habitCheckinCount(habit, dateISO) >= habitTarget(habit);
}

export function updateHabitCheckin(habit, dateISO, change = 1) {
  const next = { ...normalizeCheckins(habit?.checkins) };
  const count = Math.max(0, habitCheckinCount(habit, dateISO) + Number(change || 0));
  if (count) next[dateISO] = count;
  else delete next[dateISO];
  return next;
}

export function currentHabitStreak(habit, todayISO = todayLocalISO()) {
  if (!habit || habit.archived) return 0;
  let cursor = todayISO;
  if (habitScheduledOn(habit, cursor) && !habitCompletedOn(habit, cursor)) cursor = addDaysISO(cursor, -1);
  let streak = 0;
  let inspected = 0;
  while (inspected < 730) {
    if (habitScheduledOn(habit, cursor)) {
      if (!habitCompletedOn(habit, cursor)) break;
      streak += 1;
    }
    cursor = addDaysISO(cursor, -1);
    inspected += 1;
  }
  return streak;
}

export function longestHabitStreak(habit, todayISO = todayLocalISO()) {
  const checkinDates = Object.keys(normalizeCheckins(habit?.checkins)).sort();
  const start = checkinDates[0] || todayISO;
  let cursor = start;
  let current = 0;
  let longest = 0;
  let inspected = 0;
  while (cursor && cursor <= todayISO && inspected < 1460) {
    if (habitScheduledOn(habit, cursor)) {
      if (habitCompletedOn(habit, cursor)) {
        current += 1;
        longest = Math.max(longest, current);
      } else current = 0;
    }
    cursor = addDaysISO(cursor, 1);
    inspected += 1;
  }
  return longest;
}

export function habitPeriodSummary(habit, days = 7, todayISO = todayLocalISO()) {
  let scheduled = 0;
  let completed = 0;
  let totalCheckins = 0;
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDaysISO(todayISO, -offset);
    if (habitScheduledOn(habit, date)) scheduled += 1;
    if (habitCompletedOn(habit, date)) completed += 1;
    totalCheckins += habitCheckinCount(habit, date);
  }
  return { scheduled, completed, totalCheckins, percentage: scheduled ? Math.round((completed / scheduled) * 100) : 0 };
}

export function buildHabitHeatmap(habit, days = 35, todayISO = todayLocalISO()) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDaysISO(todayISO, index - (days - 1));
    const scheduled = habitScheduledOn(habit, date);
    const count = habitCheckinCount(habit, date);
    return { date, scheduled, count, completed: scheduled && count >= habitTarget(habit) };
  });
}

export function migrateLegacyHabitWeek(habit, todayISO = todayLocalISO()) {
  const checkins = normalizeCheckins(habit?.checkins);
  if (Object.keys(checkins).length) return checkins;
  const week = Array.isArray(habit?.week) ? habit.week.slice(0, 7) : [];
  const todayDay = dayOfWeek(todayISO);
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  week.forEach((checked, index) => {
    if (checked) checkins[addDaysISO(todayISO, mondayOffset + index)] = Math.max(1, Number(habit?.target) || 1);
  });
  if (habit?.checked) checkins[todayISO] = Math.max(checkins[todayISO] || 0, Math.max(1, Number(habit?.target) || 1));
  return checkins;
}
