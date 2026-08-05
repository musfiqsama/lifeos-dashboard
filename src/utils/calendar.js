import { toLocalISODate, todayLocalISO } from './date.js';
import { examPreparationProgress, goalProgress, taskScheduleState } from './planning.js';
import { habitCompletedOn, habitScheduledOn } from './habits.js';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_MS = 86400000;
const pad = (value) => String(value).padStart(2, '0');

export function parseLocalISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function shiftISODate(value, amount) {
  const date = parseLocalISO(value);
  if (!date) return '';
  date.setDate(date.getDate() + Number(amount || 0));
  return toLocalISODate(date);
}

export function monthStartISO(value) {
  const date = parseLocalISO(value) || new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

export function monthEndISO(value) {
  const date = parseLocalISO(value) || new Date();
  return toLocalISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}

export function shiftMonthISO(value, amount) {
  const date = parseLocalISO(value) || new Date();
  return toLocalISODate(new Date(date.getFullYear(), date.getMonth() + Number(amount || 0), Math.min(date.getDate(), 28), 12));
}

export function startOfWeekISO(value, weekStartsOn = 0) {
  const date = parseLocalISO(value) || new Date();
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - offset);
  return toLocalISODate(date);
}

export function weekDates(value, weekStartsOn = 0) {
  const start = startOfWeekISO(value, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => shiftISODate(start, index));
}

export function monthGrid(value, todayISO = todayLocalISO()) {
  const anchor = parseLocalISO(value) || new Date();
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = toLocalISODate(date);
    return {
      iso,
      day: date.getDate(),
      weekday: WEEKDAYS[date.getDay()],
      inMonth: date.getMonth() === anchor.getMonth(),
      isToday: iso === todayISO,
    };
  });
}

export function dateRange(startISO, endISO) {
  const start = parseLocalISO(startISO);
  const end = parseLocalISO(endISO);
  if (!start || !end || start > end) return [];
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  return Array.from({ length: days + 1 }, (_, index) => shiftISODate(startISO, index));
}

export function dayNameFromISO(value) {
  const date = parseLocalISO(value);
  return date ? WEEKDAYS[date.getDay()] : '';
}

export function nextRoutineOccurrenceISO(routine, fromISO = todayLocalISO()) {
  if (!routine?.day || !WEEKDAYS.includes(routine.day)) return '';
  for (let offset = 0; offset < 14; offset += 1) {
    const iso = shiftISODate(fromISO, offset);
    if (dayNameFromISO(iso) !== routine.day) continue;
    if (routine.validFrom && iso < routine.validFrom) continue;
    if (routine.validUntil && iso > routine.validUntil) continue;
    return iso;
  }
  return '';
}

function routineInRange(routine, iso) {
  if (!routine || dayNameFromISO(iso) !== routine.day) return false;
  if (routine.validFrom && iso < routine.validFrom) return false;
  if (routine.validUntil && iso > routine.validUntil) return false;
  return true;
}

function routineEvent(routine, iso, override = {}) {
  const status = override.status || 'Scheduled';
  return {
    id: `routine-${routine.id}-${iso}-${override.id || 'base'}`,
    sourceId: routine.id,
    sourceType: 'routine',
    type: status === 'Cancelled' ? 'Cancelled Class' : routine.type || 'Routine',
    title: routine.title || routine.courseName || 'Routine item',
    date: override.newDate || iso,
    startTime: override.newStartTime || routine.startTime || routine.time || '',
    endTime: override.newEndTime || routine.endTime || '',
    location: override.newRoom || routine.room || '',
    description: override.notes || routine.description || '',
    status,
    page: 'routine',
    color: status === 'Cancelled' ? 'rose' : routine.type === 'Class' ? 'green' : 'blue',
    courseId: routine.courseId || '',
    originalDate: iso,
    reminderMinutes: Number(routine.reminderMinutes ?? 15),
  };
}

export function routineEventsForRange(routines = [], exceptions = [], startISO, endISO) {
  const dates = dateRange(startISO, endISO);
  const events = [];
  const byOriginal = new Map(exceptions.map((item) => [`${item.routineId}:${item.originalDate}`, item]));

  for (const routine of routines) {
    for (const iso of dates) {
      if (!routineInRange(routine, iso)) continue;
      const exception = byOriginal.get(`${routine.id}:${iso}`);
      if (exception?.status === 'Rescheduled') continue;
      events.push(routineEvent(routine, iso, exception || {}));
    }
  }

  for (const exception of exceptions) {
    if (exception.status !== 'Rescheduled' || !exception.newDate || exception.newDate < startISO || exception.newDate > endISO) continue;
    const routine = routines.find((item) => item.id === exception.routineId);
    if (routine) events.push(routineEvent(routine, exception.originalDate, exception));
  }

  return events.sort(compareCalendarEvents);
}

export function routineEventsForDate(routines = [], exceptions = [], dateISO) {
  return routineEventsForRange(routines, exceptions, dateISO, dateISO);
}

export function compareCalendarEvents(a, b) {
  const date = String(a.date || '').localeCompare(String(b.date || ''));
  if (date) return date;
  return String(a.startTime || '23:59').localeCompare(String(b.startTime || '23:59'));
}

export function buildCalendarEvents(data = {}, startISO, endISO) {
  const {
    tasks = [], goals = [], routines = [], routineExceptions = [], exams = [], attendanceRecords = [],
    focusSessions = [], habits = [], calendarItems = [],
  } = data;
  const inRange = (date) => date && date >= startISO && date <= endISO;
  const events = [
    ...calendarItems.filter((item) => inRange(item.date)).map((item) => ({
      id: `calendar-${item.id}`, sourceId: item.id, sourceType: 'calendar', type: item.type || 'Personal', title: item.title || 'Calendar event',
      date: item.date, startTime: item.startTime || '', endTime: item.endTime || '', location: item.location || '', description: item.description || '',
      page: 'calendar', color: item.color || 'teal', completed: Boolean(item.completed), reminderMinutes: Number(item.reminderMinutes ?? 30),
    })),
    ...tasks.filter((task) => task.status !== 'Archived' && inRange(task.startDate)).map((task) => ({
      id: `task-start-${task.id}`, sourceId: task.id, sourceType: 'task', type: 'Task Start', title: task.title, date: task.startDate,
      startTime: '', description: task.category || 'Task', page: 'tasks', color: 'blue', reminderMinutes: -1,
    })),
    ...tasks.filter((task) => task.status !== 'Archived' && inRange(task.due)).map((task) => ({
      id: `task-due-${task.id}`, sourceId: task.id, sourceType: 'task', type: 'Task Due', title: task.title, date: task.due,
      startTime: task.dueTime || '23:59', description: `${taskScheduleState(task)} · ${task.priority || 'Medium'} priority`, page: 'tasks', color: 'orange',
      reminderMinutes: Number(task.reminderMinutes ?? 60),
    })),
    ...goals.filter((goal) => inRange(goal.deadline) && goalProgress(goal, tasks) < 100).map((goal) => ({
      id: `goal-${goal.id}`, sourceId: goal.id, sourceType: 'goal', type: 'Goal Deadline', title: goal.title, date: goal.deadline,
      startTime: '23:59', description: `${goalProgress(goal, tasks)}% complete`, page: 'goals', color: 'purple', reminderMinutes: Number(goal.reminderMinutes ?? 1440),
    })),
    ...exams.filter((exam) => inRange(exam.date)).map((exam) => ({
      id: `exam-${exam.id}`, sourceId: exam.id, sourceType: 'exam', type: exam.type || 'Exam', title: exam.title, date: exam.date,
      startTime: exam.time || '09:00', location: exam.room || '', description: `${examPreparationProgress(exam)}% prepared`, page: 'exams', color: 'rose',
      reminderMinutes: Number(exam.reminderMinutes ?? 1440),
    })),
    ...attendanceRecords.filter((record) => inRange(record.date)).map((record) => ({
      id: `attendance-${record.id}`, sourceId: record.id, sourceType: 'attendance', type: 'Attendance', title: record.courseCode || record.courseName || 'Class',
      date: record.date, startTime: '', description: record.status, page: 'attendance', color: 'green', reminderMinutes: -1,
    })),
    ...focusSessions.filter((session) => inRange(session.dateISO || String(session.completedAt || '').slice(0, 10))).map((session) => ({
      id: `focus-${session.id}`, sourceId: session.id, sourceType: 'focus', type: 'Focus Session', title: session.topic || 'Pomodoro Session',
      date: session.dateISO || String(session.completedAt || '').slice(0, 10), startTime: String(session.completedAt || '').slice(11, 16),
      description: `${session.minutes || 0} minutes`, page: 'timer', color: 'teal', reminderMinutes: -1,
    })),
    ...routineEventsForRange(routines, routineExceptions, startISO, endISO),
  ];

  for (const habit of habits.filter((item) => !item.archived)) {
    for (const iso of dateRange(startISO, endISO)) {
      if (!habitScheduledOn(habit, iso)) continue;
      events.push({
        id: `habit-${habit.id}-${iso}`, sourceId: habit.id, sourceType: 'habit', type: 'Habit', title: habit.title || 'Habit', date: iso,
        startTime: habit.reminderTime || '', description: habitCompletedOn(habit, iso) ? 'Completed' : 'Scheduled', page: 'habits', color: habitCompletedOn(habit, iso) ? 'green' : 'gray',
        reminderMinutes: habit.reminderTime ? 0 : -1,
      });
    }
  }

  return events.filter((item) => item.date).sort(compareCalendarEvents);
}

export function formatCalendarTitle(anchorISO, view) {
  const date = parseLocalISO(anchorISO) || new Date();
  if (view === 'day') return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (view === 'week') {
    const dates = weekDates(anchorISO);
    const start = parseLocalISO(dates[0]);
    const end = parseLocalISO(dates[6]);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
