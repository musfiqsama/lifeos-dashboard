import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNoteExport, isSafeResourceUrl, normalizeIds, normalizeTags, readingMinutes, stripMarkdown, wordCount } from './knowledge.js';

test('normalizeTags accepts comma text and removes duplicates', () => {
  assert.deepEqual(normalizeTags('math, exam, #math,  notes '), ['math', 'exam', 'notes']);
});

test('normalizeIds removes empty and duplicate values', () => {
  assert.deepEqual(normalizeIds(['a', '', 'a', ' b ']), ['a', 'b']);
});

test('word count and reading estimate handle markdown', () => {
  assert.equal(wordCount('# Hello **student** world'), 3);
  assert.equal(readingMinutes('one two three'), 1);
});

test('stripMarkdown keeps readable text', () => {
  assert.equal(stripMarkdown('## Topic\n[Open](https://example.com) **now**'), 'Topic Open now');
});

test('resource urls allow safe protocols only', () => {
  assert.equal(isSafeResourceUrl('https://example.com/file.pdf'), true);
  assert.equal(isSafeResourceUrl('javascript:alert(1)'), false);
  assert.equal(isSafeResourceUrl(''), true);
});

test('note export includes title, course and tags', () => {
  const output = buildNoteExport({ title: 'DSA', body: 'Stacks', tags: ['exam'], folder: 'Semester 3' }, 'CSE 2101');
  assert.match(output, /# DSA/);
  assert.match(output, /Course: CSE 2101/);
  assert.match(output, /#exam/);
});
