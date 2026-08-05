import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsSnapshot, evaluateAchievements, resolveDateRange } from './analytics.js';
import { buildCalendarEvents } from './calendar.js';
import { createBackupPayload, normalizeState, parseBackupPayload } from '../data/storage.js';

test('stable cross-module workflow survives normalization, analytics, calendar and backup', () => {
  const state = normalizeState({
    semesters: [{
      id: 'semester-1', name: 'Spring 2026', startDate: '2026-01-01', endDate: '2026-05-31',
      courses: [{ id: 'course-attempt-1', code: 'CSE101', name: 'Programming', credit: 3, grade: 'A+' }],
    }],
    tasks: [{ id: 'task-1', title: 'Finish project', due: '2026-08-06', dueTime: '18:00', status: 'Completed', done: true, updatedAt: '2026-08-05T12:00:00.000Z' }],
    goals: [{ id: 'goal-1', title: 'Ship LifeOS', deadline: '2026-08-06', status: 'Completed', progress: 100 }],
    exams: [{ id: 'exam-1', title: 'Algorithms final', date: '2026-08-07', time: '10:00', syllabus: [{ id: 'topic-1', title: 'Graphs', done: true }] }],
    attendanceRecords: [
      { id: 'attendance-1', courseId: 'code:cse101', courseCode: 'CSE101', date: '2026-08-04', status: 'Present' },
      { id: 'attendance-2', courseId: 'code:cse101', courseCode: 'CSE101', date: '2026-08-05', status: 'Present' },
    ],
    habits: [{ id: 'habit-1', title: 'Read', frequency: 'Daily', target: 1, checkins: { '2026-08-04': 1, '2026-08-05': 1, '2026-08-06': 1 } }],
    studyLogs: [{ id: 'study-1', date: '2026-08-05', minutes: 60, subject: 'Programming' }],
    focusSessions: [{ id: 'focus-1', dateISO: '2026-08-05', minutes: 25, completedAt: '2026-08-05T12:25:00.000Z' }],
    notes: [{ id: 'note-1', title: 'Programming notes', body: '# Arrays', tags: ['CSE101'] }],
    resources: [{ id: 'resource-1', title: 'Lecture', url: 'https://example.com/lecture', noteIds: ['note-1'] }],
    calendarItems: [{ id: 'event-1', title: 'Team meeting', date: '2026-08-06', startTime: '14:00' }],
  });

  const range = resolveDateRange('7d', '', '', '2026-08-06', state.semesters);
  const snapshot = buildAnalyticsSnapshot(state, range);
  assert.equal(snapshot.cumulative.gpa, 4);
  assert.equal(snapshot.current.study, 60);
  assert.equal(snapshot.current.focus, 25);
  assert.equal(snapshot.current.completedTasks, 1);

  const events = buildCalendarEvents(state, '2026-08-04', '2026-08-07');
  assert.ok(events.some((event) => event.sourceType === 'task'));
  assert.ok(events.some((event) => event.sourceType === 'exam'));
  assert.ok(events.some((event) => event.sourceType === 'calendar'));
  assert.ok(events.some((event) => event.sourceType === 'focus'));

  const achievements = evaluateAchievements(state, state.achievementRecords);
  assert.ok(achievements.some((achievement) => achievement.id === 'first-semester' && achievement.unlocked));

  const restored = parseBackupPayload(createBackupPayload(state));
  assert.equal(restored.notes[0].title, 'Programming notes');
  assert.equal(restored.resources[0].url, 'https://example.com/lecture');
  assert.equal(restored.tasks[0].title, 'Finish project');
});
