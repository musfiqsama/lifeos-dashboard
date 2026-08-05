import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAttendanceSummary, groupAttendanceByCourse, normalizeAttendanceTarget } from './attendance.js';

test('attendance summary counts present and late while excluding excused and cancelled', () => {
  const summary = calculateAttendanceSummary([
    { status: 'Present' },
    { status: 'Late' },
    { status: 'Absent' },
    { status: 'Excused' },
    { status: 'Cancelled' },
  ], 75);
  assert.equal(summary.total, 3);
  assert.equal(summary.attended, 2);
  assert.equal(summary.percentage, 66.7);
  assert.equal(summary.excused, 1);
  assert.equal(summary.cancelled, 1);
  assert.equal(summary.requiredClasses, 1);
});

test('attendance summary calculates safely missable classes', () => {
  const summary = calculateAttendanceSummary([
    ...Array.from({ length: 8 }, () => ({ status: 'Present' })),
    ...Array.from({ length: 2 }, () => ({ status: 'Absent' })),
  ], 75);
  assert.equal(summary.percentage, 80);
  assert.equal(summary.missableClasses, 0);
  const stronger = calculateAttendanceSummary(Array.from({ length: 9 }, () => ({ status: 'Present' })), 75);
  assert.equal(stronger.missableClasses, 3);
});

test('attendance grouping preserves configured course targets', () => {
  const grouped = groupAttendanceByCourse(
    [{ courseId: 'c1', status: 'Present' }, { courseId: 'c2', courseName: 'Math', status: 'Absent' }],
    [{ id: 'c1', code: 'CSE101', name: 'Intro', attendanceTarget: 80 }],
    75,
  );
  assert.equal(grouped.find((item) => item.id === 'c1').summary.target, 80);
  assert.equal(grouped.find((item) => item.id === 'c2').name, 'Math');
});

test('attendance target is clamped to a safe percentage', () => {
  assert.equal(normalizeAttendanceTarget(120), 100);
  assert.equal(normalizeAttendanceTarget(-10), 1);
  assert.equal(normalizeAttendanceTarget('invalid'), 75);
});
