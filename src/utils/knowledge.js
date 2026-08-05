const clean = (value) => String(value ?? '').trim();

export function normalizeTags(value) {
  const source = Array.isArray(value) ? value : clean(value).split(',');
  return [...new Set(source.map((item) => clean(item).replace(/^#/, '')).filter(Boolean))].slice(0, 12);
}

export function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(clean).filter(Boolean))];
}

export function wordCount(value) {
  const text = clean(value).replace(/[`*_>#\[\]()-]/g, ' ');
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function readingMinutes(value) {
  const count = wordCount(value);
  return count ? Math.max(1, Math.ceil(count / 220)) : 0;
}

export function stripMarkdown(value) {
  return clean(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*/g, ''))
    .replace(/[`*_>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSafeResourceUrl(value) {
  const text = clean(value);
  if (!text) return true;
  try {
    const parsed = new URL(text);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function resourceHost(value) {
  const text = clean(value);
  if (!text) return '';
  try {
    return new URL(text).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function knowledgeSearchText(item = {}) {
  return [
    item.title,
    item.body,
    item.description,
    item.folder,
    item.tag,
    normalizeTags(item.tags).join(' '),
    item.type,
    item.url,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function buildNoteExport(note = {}, courseLabel = '') {
  const header = [
    `# ${clean(note.title) || 'Untitled Note'}`,
    courseLabel ? `Course: ${courseLabel}` : '',
    note.folder ? `Folder: ${note.folder}` : '',
    normalizeTags(note.tags).length ? `Tags: ${normalizeTags(note.tags).map((tag) => `#${tag}`).join(' ')}` : '',
    note.updatedAt ? `Updated: ${new Date(note.updatedAt).toLocaleString()}` : '',
  ].filter(Boolean).join('\n');
  return `${header}\n\n${note.body || ''}\n`;
}

export function downloadTextFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
