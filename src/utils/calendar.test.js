import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalendarEvents,
  monthGrid,
  nextRoutineOccurrenceISO,
  routineEventsForRange,
  weekDates,
} from './calendar.js';

test('monthGrid returns a stable six-week calendar with the current month', () => {
  const grid = monthGrid('2026-08-15', '2026-08-05');
  assert.equal(grid.length, 42);
  assert.equal(grid[0].weekday, 'Sunday');
  assert.ok(grid.some((day) => day.iso === '2026-08-05' && day.isToday));
  assert.ok(grid.filter((day) => day.inMonth).length >= 28);
});

test('weekDates returns seven consecutive dates', () => {
  assert.deepEqual(weekDates('2026-08-05'), [
    '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08',
  ]);
});

test('routine occurrences respect cancellation and rescheduling exceptions', () => {
  const routines = [{ id: 'r1', title: 'Algorithms', day: 'Wednesday', type: 'Class', startTime: '10:00', endTime: '11:00' }];
  const exceptions = [
    { id: 'x1', routineId: 'r1', originalDate: '2026-08-05', status: 'Cancelled' },
    { id: 'x2', routineId: 'r1', originalDate: '2026-08-12', status: 'Rescheduled', newDate: '2026-08-13', newStartTime: '14:00' },
  ];
  const events = routineEventsForRange(routines, exceptions, '2026-08-01', '2026-08-20');
  const cancelled = events.find((event) => event.originalDate === '2026-08-05');
  const rescheduled = events.find((event) => event.originalDate === '2026-08-12');
  assert.equal(cancelled.status, 'Cancelled');
  assert.equal(rescheduled.date, '2026-08-13');
  assert.equal(rescheduled.startTime, '14:00');
  assert.equal(events.some((event) => event.date === '2026-08-12'), false);
});

test('nextRoutineOccurrenceISO respects active date range', () => {
  const routine = { day: 'Wednesday', validFrom: '2026-08-10', validUntil: '2026-08-31' };
  assert.equal(nextRoutineOccurrenceISO(routine, '2026-08-05'), '2026-08-12');
});

test('buildCalendarEvents combines manual and system events', () => {
  const events = buildCalendarEvents({
    calendarItems: [{ id: 'c1', title: 'Advisor meeting', date: '2026-08-05', startTime: '15:00' }],
    tasks: [{ id: 't1', title: 'Assignment', due: '2026-08-05', dueTime: '20:00', status: 'Pending' }],
    exams: [{ id: 'e1', title: 'Final', date: '2026-08-06', time: '09:00' }],
  }, '2026-08-05', '2026-08-06');
  assert.equal(events.length, 3);
  assert.deepEqual(new Set(events.map((event) => event.sourceType)), new Set(['calendar', 'task', 'exam']));
});
