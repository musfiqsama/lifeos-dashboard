import { todayLocalISO } from './date.js';

export const defaultTimerSettings = {
  id: 'timer-settings',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  dailyGoalMinutes: 120,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  logToAnalyzer: true,
};

export const defaultTimerState = {
  id: 'active-pomodoro',
  mode: 'focus',
  running: false,
  remainingSeconds: 25 * 60,
  endsAt: '',
  startedAt: '',
  cycleCount: 0,
  taskId: '',
  courseId: '',
  topic: '',
};

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export function normalizeTimerSettings(value = {}) {
  return {
    ...defaultTimerSettings,
    ...value,
    id: value.id || defaultTimerSettings.id,
    focusMinutes: clamp(value.focusMinutes, 1, 180, 25),
    shortBreakMinutes: clamp(value.shortBreakMinutes, 1, 60, 5),
    longBreakMinutes: clamp(value.longBreakMinutes, 1, 90, 15),
    sessionsBeforeLongBreak: Math.round(clamp(value.sessionsBeforeLongBreak, 1, 12, 4)),
    dailyGoalMinutes: Math.round(clamp(value.dailyGoalMinutes, 1, 1440, 120)),
    autoStartBreak: Boolean(value.autoStartBreak),
    autoStartFocus: Boolean(value.autoStartFocus),
    soundEnabled: value.soundEnabled !== false,
    logToAnalyzer: value.logToAnalyzer !== false,
  };
}

export function durationForMode(mode, settings = defaultTimerSettings) {
  const safe = normalizeTimerSettings(settings);
  if (mode === 'longBreak') return safe.longBreakMinutes;
  if (mode === 'shortBreak') return safe.shortBreakMinutes;
  return safe.focusMinutes;
}

export function normalizeTimerState(value = {}, settings = defaultTimerSettings) {
  const safeSettings = normalizeTimerSettings(settings);
  const mode = ['focus', 'shortBreak', 'longBreak'].includes(value.mode) ? value.mode : 'focus';
  return {
    ...defaultTimerState,
    ...value,
    id: value.id || defaultTimerState.id,
    mode,
    running: Boolean(value.running && value.endsAt),
    remainingSeconds: Math.max(0, Math.round(Number(value.remainingSeconds) || durationForMode(mode, safeSettings) * 60)),
    endsAt: value.endsAt || '',
    startedAt: value.startedAt || '',
    cycleCount: Math.max(0, Math.round(Number(value.cycleCount) || 0)),
    taskId: String(value.taskId || ''),
    courseId: String(value.courseId || ''),
    topic: String(value.topic || ''),
  };
}

export function remainingTimerSeconds(timer, now = Date.now()) {
  if (!timer?.running || !timer?.endsAt) return Math.max(0, Math.round(Number(timer?.remainingSeconds) || 0));
  const end = new Date(timer.endsAt).getTime();
  return Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / 1000)) : 0;
}

export function focusMinutesToday(sessions = [], todayISO = todayLocalISO()) {
  return sessions.reduce((sum, session) => {
    const date = session.dateISO || String(session.completedAt || session.date || '').slice(0, 10);
    return date === todayISO ? sum + Number(session.minutes || 0) : sum;
  }, 0);
}

export function nextBreakMode(cycleCount, settings = defaultTimerSettings) {
  const safe = normalizeTimerSettings(settings);
  return cycleCount > 0 && cycleCount % safe.sessionsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak';
}

export function formatTimer(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
