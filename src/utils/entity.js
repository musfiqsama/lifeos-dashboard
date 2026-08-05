export const cleanText = (value) => String(value ?? '').trim();

export const clampNumber = (value, min = 0, max = 100) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
};

export const entityTimestamps = (existing = {}) => {
  const now = new Date().toISOString();
  return {
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
};

export const searchableText = (...values) => values
  .flat(Infinity)
  .filter((value) => value !== null && value !== undefined)
  .join(' ')
  .toLowerCase();

export const matchesSearch = (query, ...values) => {
  const normalized = cleanText(query).toLowerCase();
  return !normalized || searchableText(values).includes(normalized);
};

export const compareText = (a, b) => cleanText(a).localeCompare(cleanText(b), undefined, { sensitivity: 'base' });

export const compareDate = (a, b) => cleanText(a).localeCompare(cleanText(b));

export const formatUpdated = (value) => {
  if (!value) return 'Legacy item';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Legacy item' : parsed.toLocaleString();
};

export const hasTimeConflict = (items, candidate, ignoreId = null) => {
  if (!candidate.day || !candidate.startTime || !candidate.endTime) return false;
  return items.some((item) => {
    if (item.id === ignoreId || item.day !== candidate.day) return false;
    const start = item.startTime || item.time;
    const end = item.endTime || item.time;
    if (!start || !end) return false;
    return candidate.startTime < end && candidate.endTime > start;
  });
};
