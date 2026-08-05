import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecurringTask,
  checklistProgress,
  examPreparationProgress,
  goalProgress,
  nextRecurringDate,
  taskProgress,
  taskScheduleState,
} from './planning.js';

test('checklist progress handles mixed completion', () => {
  assert.equal(checklistProgress([{ title: 'A', done: true }, { title: 'B', done: false }]), 50);
});

test('task progress uses subtasks before manual progress', () => {
  assert.equal(taskProgress({ progress: 10, subtasks: [{ title: 'A', done: true }, { title: 'B', done: true }] }), 100);
});

test('goal auto progress averages milestones and linked tasks', () => {
  const goal = { id: 'g1', autoProgress: true, milestones: [{ title: 'M1', done: true }, { title: 'M2', done: false }] };
  const tasks = [{ goalId: 'g1', status: 'Completed' }, { goalId: 'g1', status: 'Pending' }];
  assert.equal(goalProgress(goal, tasks), 50);
});

test('exam preparation uses syllabus checklist', () => {
  assert.equal(examPreparationProgress({ syllabus: [{ title: 'A', done: true }, { title: 'B', done: false }, { title: 'C', done: false }] }), 33);
});

test('next recurring date handles month end safely', () => {
  assert.equal(nextRecurringDate('2026-01-31', 'Monthly'), '2026-02-28');
  assert.equal(nextRecurringDate('2026-02-01', 'Weekly'), '2026-02-08');
});

test('build recurring task resets completion state', () => {
  const next = buildRecurringTask({ id: 'old', title: 'Review', due: '2026-08-01', recurrence: 'Daily', done: true, status: 'Completed', subtasks: [{ title: 'Read', done: true }] }, 'new', '2026-08-01');
  assert.equal(next.due, '2026-08-02');
  assert.equal(next.status, 'Pending');
  assert.equal(next.subtasks[0].done, false);
});

test('task schedule state detects overdue and archived work', () => {
  assert.equal(taskScheduleState({ due: '2026-08-01', status: 'Pending' }, '2026-08-05'), 'Overdue');
  assert.equal(taskScheduleState({ status: 'Archived' }, '2026-08-05'), 'Archived');
});
