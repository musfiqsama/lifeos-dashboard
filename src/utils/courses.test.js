import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourseCatalog, courseKey, courseLabel } from './courses.js';

test('course catalog deduplicates course codes and prefers current metadata', () => {
  const catalog = buildCourseCatalog(
    [{ id: 'current', code: 'CSE101', name: 'Current title', instructor: 'A' }],
    [{ id: 's1', name: 'Old', courses: [{ id: 'old', code: 'CSE101', name: 'Old title' }] }],
  );
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].name, 'Current title');
  assert.equal(catalog[0].id, 'code:cse101');
});

test('course helpers support code, id and readable labels', () => {
  assert.equal(courseKey({ code: ' CSE 201 ' }), 'code:cse 201');
  assert.equal(courseKey({ id: 'abc' }), 'id:abc');
  assert.equal(courseLabel({ code: 'CSE101', name: 'Intro' }), 'CSE101 · Intro');
  assert.equal(courseLabel({ courseCode: 'CSE101', courseName: 'Snapshot' }), 'CSE101 · Snapshot');
});
