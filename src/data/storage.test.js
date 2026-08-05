import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGPA,
  completionPercent,
  createBackupPayload,
  load,
  normalizeState,
  parseBackupPayload,
  save,
  starterState,
} from './storage.js';

test('calculateGPA calculates weighted credits and points', () => {
  const result = calculateGPA([
    { credit: 3, grade: 'A+' },
    { credit: 1.5, grade: 'B' },
    { credit: 0, grade: 'A+' },
    { credit: 3, grade: '' },
  ]);
  assert.equal(result.credits, 4.5);
  assert.equal(result.points, 16.5);
  assert.equal(result.gpa, 3.67);
});

test('normalizeState keeps only valid array collections', () => {
  const result = normalizeState({ tasks: [{ id: '1' }], notes: 'invalid', unknown: [1] });
  assert.equal(result.tasks[0].id, '1');
  assert.equal(result.tasks[0].status, 'Pending');
  assert.equal(result.tasks[0].priority, 'Medium');
  assert.deepEqual(result.notes, []);
  assert.equal(Object.hasOwn(result, 'unknown'), false);
  assert.deepEqual(Object.keys(result), Object.keys(starterState));
});

test('backup parser supports versioned and legacy backups', () => {
  const state = normalizeState({ tasks: [{ id: 'task-1', title: 'Test' }] });
  const versioned = createBackupPayload(state);
  assert.deepEqual(parseBackupPayload(versioned).tasks, state.tasks);
  assert.deepEqual(parseBackupPayload(state).tasks, state.tasks);
});

test('backup parser rejects unrelated JSON objects', () => {
  assert.throws(() => parseBackupPayload({ hello: 'world' }), /recognized LifeOS backup/);
  assert.throws(() => parseBackupPayload({ tasks: 'not-an-array' }), /Invalid backup field/);
});

test('completionPercent clamps unsafe values', () => {
  assert.equal(completionPercent(5, 10), 50);
  assert.equal(completionPercent(20, 10), 100);
  assert.equal(completionPercent(-2, 10), 0);
  assert.equal(completionPercent(1, 0), 0);
});


test('normalizeState migrates legacy CRUD entity fields without losing data', () => {
  const result = normalizeState({
    tasks: [{ id: 't1', title: 'Legacy task', done: true }],
    habits: [{ id: 'h1', title: 'Read', week: [true] }],
    routines: [{ id: 'r1', title: 'Class', time: '09:00', day: 'Sunday' }],
  });
  assert.equal(result.tasks[0].title, 'Legacy task');
  assert.equal(result.tasks[0].status, 'Completed');
  assert.equal(result.habits[0].week.length, 7);
  assert.equal(result.routines[0].startTime, '09:00');
});

test('calculateGPA supports a custom grading scale and exclusions', () => {
  const result = calculateGPA([
    { credit: 3, grade: 'Excellent' },
    { credit: 3, grade: 'Good' },
    { credit: 3, grade: 'Excellent', excludedFromCgpa: true },
  ], { Excellent: 4, Good: 3 });
  assert.equal(result.credits, 6);
  assert.equal(result.points, 21);
  assert.equal(result.gpa, 3.5);
});

test('calculateCumulativeGPA replaces earlier attempts under latest policy', async () => {
  const { calculateCumulativeGPA } = await import('./storage.js');
  const semesters = [
    { id: 's1', name: 'First', courses: [{ id: 'c1', code: 'CSE101', credit: 3, grade: 'F' }] },
    { id: 's2', name: 'Second', courses: [{ id: 'c2', code: 'CSE101', credit: 3, grade: 'A+', retakeOf: 'cse101' }] },
  ];
  const latest = calculateCumulativeGPA(semesters, undefined, 'latest');
  const all = calculateCumulativeGPA(semesters, undefined, 'all');
  assert.equal(latest.credits, 3);
  assert.equal(latest.gpa, 4);
  assert.equal(latest.replacedAttempts, 1);
  assert.equal(all.credits, 6);
  assert.equal(all.gpa, 2);
});

test('calculateTargetGPA reports attainable and impossible plans', async () => {
  const { calculateTargetGPA } = await import('./storage.js');
  const attainable = calculateTargetGPA({ currentPoints: 90, currentCredits: 30, targetCgpa: 3.2, futureCredits: 15 });
  assert.equal(attainable.requiredGpa, 3.6);
  assert.equal(attainable.attainable, true);
  const impossible = calculateTargetGPA({ currentPoints: 60, currentCredits: 30, targetCgpa: 4, futureCredits: 3 });
  assert.equal(impossible.attainable, false);
  assert.ok(impossible.requiredGpa > 4);
});

test('normalizeState migrates Phase 2 academic data into schema 4', () => {
  const result = normalizeState({
    courses: [{ id: 'c1', code: 'CSE100', name: 'Intro', credit: 3, grade: 'A' }],
    semesters: [{ id: 's1', name: 'Semester 1', gpa: 3.75, credits: 3, courses: [{ id: 'c1', code: 'CSE100', credit: 3, grade: 'A' }] }],
  });
  assert.equal(result.courses[0].type, 'Theory');
  assert.equal(result.courses[0].excludedFromCgpa, false);
  assert.equal(result.semesters[0].status, 'Completed');
  assert.equal(result.academicSettings.length, 1);
  assert.equal(result.academicSettings[0].retakePolicy, 'latest');
});


test('normalizeState migrates Phase 3 data into attendance schema 5', () => {
  const result = normalizeState({
    academicSettings: [{ id: 'academic-settings', scaleName: 'Scale' }],
    routines: [{ id: 'r1', title: 'Algorithms', type: 'Class', courseCode: 'CSE221', day: 'Sunday' }],
    attendanceRecords: [{ id: 'a1', courseCode: 'CSE221', courseName: 'Algorithms', date: '2026-08-05', status: 'Present' }],
    attendanceTargets: [{ id: 'at1', courseId: 'code:cse221', target: 80 }],
  });
  assert.equal(result.academicSettings[0].defaultAttendanceTarget, 75);
  assert.equal(result.routines[0].courseId, 'code:cse221');
  assert.equal(result.attendanceRecords[0].courseId, 'code:cse221');
  assert.equal(result.attendanceTargets[0].target, 80);
});

test('normalizeState migrates Phase 4 planning data into schema 6', () => {
  const result = normalizeState({
    tasks: [{ id: 't1', title: 'Legacy task', due: '2026-08-10' }],
    goals: [{ id: 'g1', title: 'Graduate', progress: 25 }],
    exams: [{ id: 'e1', title: 'Final', date: '2026-08-20', notes: 'Chapters 1-3' }],
  });
  assert.deepEqual(result.tasks[0].subtasks, []);
  assert.equal(result.tasks[0].recurrence, 'None');
  assert.equal(result.tasks[0].estimatedMinutes, 0);
  assert.deepEqual(result.goals[0].milestones, []);
  assert.equal(result.goals[0].autoProgress, false);
  assert.deepEqual(result.exams[0].syllabus, []);
  assert.equal(result.exams[0].preparationStatus, 'Not Started');
});


test('normalizeState migrates Phase 5 habits, study logs and timer data into schema 7', () => {
  const result = normalizeState({
    habits: [{ id: 'h1', title: 'Read', frequency: 'Daily', target: 1, checked: true, week: [false, false, true, false, false, false, false] }],
    studyLogs: [{ id: 'sl1', subject: 'Math', hours: 1.5, rating: 4 }],
    focusSessions: [{ id: 'fs1', minutes: 25, date: '2026-08-05T10:00:00.000Z' }],
  });
  assert.equal(result.habits[0].frequency, 'Daily');
  assert.ok(Object.keys(result.habits[0].checkins).length >= 1);
  assert.equal(result.studyLogs[0].minutes, 90);
  assert.equal(result.studyLogs[0].method, 'Focused Study');
  assert.equal(result.focusSessions[0].minutes, 25);
  assert.equal(result.timerSettings.length, 1);
  assert.equal(result.activeTimer.length, 1);
  assert.equal(result.activeTimer[0].mode, 'focus');
});

test('normalizeState migrates Phase 6 data into calendar and reminder schema 8', () => {
  const result = normalizeState({
    routines: [{ id: 'r1', title: 'Class', day: 'Sunday', startTime: '09:00' }],
    calendarItems: [{ id: 'c1', title: 'Meeting', date: '2026-08-05' }],
  });
  assert.equal(result.routines[0].reminderMinutes, 15);
  assert.equal(result.routines[0].validFrom, '');
  assert.equal(result.calendarItems[0].reminderMinutes, 30);
  assert.deepEqual(result.routineExceptions, []);
  assert.equal(result.notificationSettings.length, 1);
  assert.equal(result.notificationSettings[0].inAppEnabled, true);
  assert.deepEqual(result.reminderHistory, []);
});

test('normalizeState migrates Phase 7 notes and initializes knowledge schema 9', () => {
  const result = normalizeState({
    notes: [{ id: 'n1', title: 'Algorithms', body: 'Graphs', tag: 'CSE', pinned: true }],
    resources: [{ id: 'r1', title: 'Lecture', url: 'https://example.com', tags: ['slide', 'slide'], noteIds: ['n1', 'n1'] }],
  });
  assert.deepEqual(result.notes[0].tags, ['CSE']);
  assert.equal(result.notes[0].format, 'markdown');
  assert.equal(result.notes[0].archived, false);
  assert.deepEqual(result.resources[0].tags, ['slide']);
  assert.deepEqual(result.resources[0].noteIds, ['n1']);
  assert.deepEqual(result.searchHistory, []);
  assert.deepEqual(result.recentItems, []);
});


test('normalizeState migrates Phase 8 analytics records into schema 10', () => {
  const result = normalizeState({
    achievementRecords: [{ id: 'ar1', achievementId: 'focus-10', unlockedAt: '2026-08-05T10:00:00.000Z' }],
    reportTemplates: [{ id: 'rt1', title: 'My Report', rangePreset: '7d', sections: ['summary', 'summary', 'study'] }],
  });
  assert.equal(result.achievementRecords[0].achievementId, 'focus-10');
  assert.equal(result.achievementRecords[0].unlockedAt, '2026-08-05T10:00:00.000Z');
  assert.deepEqual(result.reportTemplates[0].sections, ['summary', 'study']);
  assert.equal(result.reportTemplates[0].rangePreset, '7d');
});


test('normalizeState migrates Phase 9 UI preferences into schema 11', () => {
  const result = normalizeState({
    uiPreferences: [{ theme: 'dark', language: 'bn', density: 'compact', displayName: 'Sama', reduceMotion: true }],
  });
  assert.equal(result.uiPreferences.length, 1);
  assert.equal(result.uiPreferences[0].theme, 'dark');
  assert.equal(result.uiPreferences[0].language, 'bn');
  assert.equal(result.uiPreferences[0].density, 'compact');
  assert.equal(result.uiPreferences[0].displayName, 'Sama');
  assert.equal(result.uiPreferences[0].reduceMotion, true);
  assert.equal(result.uiPreferences[0].weekStartsOn, 'Saturday');
});


test('normalization removes unsafe external URLs from legacy data', () => {
  const result = normalizeState({
    tasks: [{ id: 't-unsafe', title: 'Unsafe', resourceUrl: 'javascript:alert(1)' }],
    resources: [{ id: 'r-unsafe', title: 'Unsafe', url: 'data:text/html,<script>alert(1)</script>' }],
  });
  assert.equal(result.tasks[0].resourceUrl, '');
  assert.equal(result.resources[0].url, '');
});

test('normalization preserves safe http, https and mailto links', () => {
  const result = normalizeState({
    tasks: [{ id: 't-safe', title: 'Safe', resourceUrl: ' https://example.com/task ' }],
    resources: [{ id: 'r-safe', title: 'Email', url: 'mailto:teacher@example.com' }],
  });
  assert.equal(result.tasks[0].resourceUrl, 'https://example.com/task');
  assert.equal(result.resources[0].url, 'mailto:teacher@example.com');
});

test('save and load round-trip a normalized stable state', () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  try {
    const key = 'lifeos-stable-test';
    const state = normalizeState({ tasks: [{ id: 'task-1', title: 'Round trip', priority: 'High' }] });
    assert.equal(save(key, state).ok, true);
    const restored = load(key, starterState);
    assert.equal(restored.tasks[0].title, 'Round trip');
    assert.equal(restored.tasks[0].priority, 'High');
    assert.deepEqual(Object.keys(restored), Object.keys(starterState));
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
