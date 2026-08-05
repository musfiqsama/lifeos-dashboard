import { clampNumber, cleanText } from './entity.js';
import { todayLocalISO } from './date.js';

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Archived'];
export const RECURRENCE_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];

export function normalizeChecklist(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      if (typeof item === 'string') return { id: `legacy-${index}`, title: cleanText(item), done: false };
      const source = item && typeof item === 'object' ? item : {};
      return {
        id: source.id || `item-${index}-${Date.now()}`,
        title: cleanText(source.title || source.text),
        done: Boolean(source.done),
      };
    })
    .filter((item) => item.title);
}

export function checklistProgress(items = []) {
  const normalized = normalizeChecklist(items);
  if (!normalized.length) return 0;
  return Math.round((normalized.filter((item) => item.done).length / normalized.length) * 100);
}

export function taskProgress(task = {}) {
  if (task.status === 'Completed' || task.done) return 100;
  const subtasks = normalizeChecklist(task.subtasks);
  if (subtasks.length) return checklistProgress(subtasks);
  if (task.status === 'In Progress') return clampNumber(task.progress || 25);
  return clampNumber(task.progress || 0);
}

export function goalProgress(goal = {}, tasks = []) {
  if (goal.status === 'Completed') return 100;
  const milestones = normalizeChecklist(goal.milestones);
  const linkedTasks = (tasks || []).filter((task) => task.goalId === goal.id && task.status !== 'Archived');
  const values = [];
  if (milestones.length) values.push(checklistProgress(milestones));
  if (linkedTasks.length) values.push(Math.round(linkedTasks.reduce((sum, task) => sum + taskProgress(task), 0) / linkedTasks.length));
  if (goal.autoProgress && values.length) return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return clampNumber(goal.progress || 0);
}

export function examPreparationProgress(exam = {}) {
  const syllabus = normalizeChecklist(exam.syllabus);
  if (syllabus.length) return checklistProgress(syllabus);
  return clampNumber(exam.preparationProgress || 0);
}

function parseDateParts(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nextRecurringDate(dateISO, recurrence = 'None') {
  const date = parseDateParts(dateISO);
  if (!date || recurrence === 'None') return '';
  if (recurrence === 'Daily') date.setDate(date.getDate() + 1);
  if (recurrence === 'Weekly') date.setDate(date.getDate() + 7);
  if (recurrence === 'Monthly') {
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
  }
  return formatDate(date);
}

export function buildRecurringTask(task = {}, id, completedDate = todayLocalISO()) {
  const due = nextRecurringDate(task.due || completedDate, task.recurrence);
  if (!due) return null;
  return {
    ...task,
    id,
    due,
    startDate: task.startDate ? nextRecurringDate(task.startDate, task.recurrence) : '',
    status: 'Pending',
    done: false,
    progress: 0,
    subtasks: normalizeChecklist(task.subtasks).map((item) => ({ ...item, done: false })),
    recurringFromId: task.id || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function taskScheduleState(task = {}, today = todayLocalISO()) {
  if (task.status === 'Archived') return 'Archived';
  if (task.status === 'Completed' || task.done) return 'Completed';
  if (task.due && task.due < today) return 'Overdue';
  if (task.status === 'In Progress') return 'In Progress';
  return 'Pending';
}
