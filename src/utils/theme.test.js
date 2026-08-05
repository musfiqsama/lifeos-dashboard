import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(currentDir, '../styles.css'), 'utf8');

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255);
};

const luminance = (hex) => hexToRgb(hex)
  .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

const contrastRatio = (first, second) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const lastDarkThemeBlock = [...css.matchAll(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] || '';
const token = (name) => lastDarkThemeBlock.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

test('dark theme text hierarchy passes readable contrast on interactive surfaces', () => {
  const surface = token('surface-soft');
  assert.ok(surface, 'surface-soft token should exist');
  for (const name of ['text', 'text-label', 'muted', 'muted2']) {
    const color = token(name);
    assert.ok(color, `${name} token should exist`);
    assert.ok(contrastRatio(color, surface) >= 4.5, `${name} should pass WCAG AA against surface-soft`);
  }
});

test('contrast patch covers the reported toolbar, dashboard and calendar regressions', () => {
  assert.match(css, /\.crudToolbar\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-wrap:\s*wrap\s*!important;/);
  assert.match(css, /\.planningInsightList\s*>\s*div[\s\S]*?background:\s*var\(--surface-raised\)\s*!important;/);
  assert.match(css, /\.monthGrid\s*\{[\s\S]*?background:\s*var\(--calendar-grid\)/);
  assert.match(css, /\.calendarEventChip\.event-green[\s\S]*?var\(--event-green-text\)/);
});
