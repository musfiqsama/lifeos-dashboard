import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsSnapshot, buildProductivityBreakdown, evaluateAchievements, resolveDateRange } from './analytics.js';
import { starterState } from '../data/storage.js';

const base = () => JSON.parse(JSON.stringify(starterState));

test('resolves a stable 7-day range and previous comparison window', () => {
  const range = resolveDateRange('7d', '', '', '2026-08-05');
  assert.equal(range.start, '2026-07-30');
  assert.equal(range.end, '2026-08-05');
  assert.equal(range.previousStart, '2026-07-23');
  assert.equal(range.previousEnd, '2026-07-29');
  assert.equal(range.days, 7);
});

test('productivity score reweights only available factors', () => {
  const data = base();
  data.tasks = [{ id: 't1', title: 'Done', status: 'Completed', done: true, due: '2026-08-05' }];
  const range = resolveDateRange('7d', '', '', '2026-08-05');
  const result = buildProductivityBreakdown(data, range, '2026-08-05');
  assert.equal(result.score, 100);
  assert.equal(result.factors.find((item) => item.key === 'tasks').available, true);
  assert.equal(result.factors.find((item) => item.key === 'attendance').available, false);
});

test('analytics snapshot compares current and previous study minutes', () => {
  const data = base();
  data.studyLogs = [
    { id: 'a', date: '2026-08-04', minutes: 120 },
    { id: 'b', date: '2026-07-28', minutes: 60 },
  ];
  const range = resolveDateRange('7d', '', '', '2026-08-05');
  const snapshot = buildAnalyticsSnapshot(data, range);
  assert.equal(snapshot.current.study, 120);
  assert.equal(snapshot.previous.study, 60);
  assert.equal(snapshot.comparison.studyChange, 100);
});

test('achievement evaluation exposes locked progress and unlocked state', () => {
  const data = base();
  data.focusSessions = Array.from({ length: 10 }, (_, index) => ({ id: `f${index}`, minutes: 25 }));
  data.notes = Array.from({ length: 5 }, (_, index) => ({ id: `n${index}`, title: 'Note', archived: false }));
  const badges = evaluateAchievements(data);
  assert.equal(badges.find((item) => item.id === 'focus-10').unlocked, true);
  assert.equal(badges.find((item) => item.id === 'knowledge-builder').progress, 50);
});
