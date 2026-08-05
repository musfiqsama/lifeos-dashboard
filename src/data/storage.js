import { STORAGE_SCHEMA_VERSION } from '../constants/app.js';
import { normalizeChecklist } from '../utils/planning.js';
import { migrateLegacyHabitWeek, normalizeCheckins, normalizeCustomDays } from '../utils/habits.js';
import { defaultTimerSettings, defaultTimerState, normalizeTimerSettings, normalizeTimerState } from '../utils/focus.js';
import { defaultNotificationSettings } from '../utils/reminders.js';
import { isSafeResourceUrl, normalizeIds, normalizeTags } from '../utils/knowledge.js';

export const gradePoints = {
  'A+': 4.0,
  A: 3.75,
  'A-': 3.5,
  'B+': 3.25,
  B: 3.0,
  'B-': 2.75,
  'C+': 2.5,
  C: 2.25,
  D: 2.0,
  F: 0,
};

export const defaultAcademicSettings = {
  id: 'academic-settings',
  scaleName: 'LifeOS 4.00 Scale',
  gradingScale: { ...gradePoints },
  retakePolicy: 'latest',
  targetCgpa: 3.5,
  targetCredits: 15,
  programCredits: 144,
  defaultAttendanceTarget: 75,
};


export const defaultUiPreferences = {
  id: 'ui-preferences',
  theme: 'system',
  language: 'en',
  density: 'comfortable',
  sidebarCollapsed: false,
  reduceMotion: false,
  displayName: 'Student',
  university: '',
  department: '',
  studentId: '',
  dateFormat: 'DD/MM/YYYY',
  weekStartsOn: 'Saturday',
};

export const starterState = {
  courses: [],
  semesters: [],
  academicSettings: [{ ...defaultAcademicSettings, gradingScale: { ...gradePoints } }],
  goals: [],
  tasks: [],
  habits: [],
  notes: [],
  resources: [],
  searchHistory: [],
  recentItems: [],
  studyLogs: [],
  routines: [],
  routineExceptions: [],
  attendanceRecords: [],
  attendanceTargets: [],
  focusSessions: [],
  timerSettings: [{ ...defaultTimerSettings }],
  activeTimer: [{ ...defaultTimerState }],
  activities: [],
  exams: [],
  calendarItems: [],
  notificationSettings: [{ ...defaultNotificationSettings }],
  reminderHistory: [],
  achievementDismissed: [],
  achievementRecords: [],
  reportTemplates: [],
  uiPreferences: [{ ...defaultUiPreferences }],
};

const stateKeys = Object.keys(starterState);
const sevenDayWeek = () => [false, false, false, false, false, false, false];

export const uid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function normalizeGradingScale(candidate) {
  const source = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : gradePoints;
  const entries = Object.entries(source)
    .map(([label, points]) => [String(label).trim(), Number(points)])
    .filter(([label, points]) => label && Number.isFinite(points) && points >= 0 && points <= 4);
  return entries.length ? Object.fromEntries(entries) : { ...gradePoints };
}

function migrateEntity(key, value) {
  if (key === 'uiPreferences') {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const theme = ['light', 'dark', 'system'].includes(source.theme) ? source.theme : defaultUiPreferences.theme;
    const language = ['en', 'bn'].includes(source.language) ? source.language : defaultUiPreferences.language;
    const density = ['comfortable', 'compact'].includes(source.density) ? source.density : defaultUiPreferences.density;
    return {
      ...defaultUiPreferences,
      ...source,
      id: source.id || defaultUiPreferences.id,
      theme,
      language,
      density,
      sidebarCollapsed: Boolean(source.sidebarCollapsed),
      reduceMotion: Boolean(source.reduceMotion),
      displayName: String(source.displayName || defaultUiPreferences.displayName),
      university: String(source.university || ''),
      department: String(source.department || ''),
      studentId: String(source.studentId || ''),
      dateFormat: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(source.dateFormat) ? source.dateFormat : defaultUiPreferences.dateFormat,
      weekStartsOn: ['Saturday', 'Sunday', 'Monday'].includes(source.weekStartsOn) ? source.weekStartsOn : defaultUiPreferences.weekStartsOn,
    };
  }
  if (key === 'achievementDismissed') return value;
  if (key === 'achievementRecords') {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return { ...source, id: source.id || uid(), achievementId: String(source.achievementId || ''), unlockedAt: String(source.unlockedAt || '') };
  }
  if (key === 'reportTemplates') {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      ...source,
      id: source.id || uid(),
      title: String(source.title || 'Custom Report'),
      rangePreset: String(source.rangePreset || '30d'),
      customStart: String(source.customStart || ''),
      customEnd: String(source.customEnd || ''),
      sections: Array.isArray(source.sections) ? [...new Set(source.sections.map(String).filter(Boolean))] : [],
      createdAt: String(source.createdAt || ''),
      updatedAt: String(source.updatedAt || ''),
    };
  }
  const item = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const id = item.id || uid();

  if (key === 'academicSettings') {
    return {
      ...defaultAcademicSettings,
      ...item,
      id: item.id || defaultAcademicSettings.id,
      gradingScale: normalizeGradingScale(item.gradingScale),
      targetCgpa: Number(item.targetCgpa ?? defaultAcademicSettings.targetCgpa),
      targetCredits: Number(item.targetCredits ?? defaultAcademicSettings.targetCredits),
      programCredits: Number(item.programCredits ?? defaultAcademicSettings.programCredits),
      retakePolicy: item.retakePolicy === 'all' ? 'all' : 'latest',
      defaultAttendanceTarget: Math.min(100, Math.max(1, Number(item.defaultAttendanceTarget ?? defaultAcademicSettings.defaultAttendanceTarget) || defaultAcademicSettings.defaultAttendanceTarget)),
    };
  }
  if (key === 'tasks') {
    const done = Boolean(item.done) || item.status === 'Completed';
    const status = done ? 'Completed' : ['Pending', 'In Progress', 'Archived'].includes(item.status) ? item.status : 'Pending';
    return {
      category: 'Task',
      priority: 'Medium',
      description: '',
      startDate: '',
      due: '',
      dueTime: '',
      courseId: '',
      goalId: '',
      recurrence: 'None',
      estimatedMinutes: 0,
      resourceUrl: '',
      reminderMinutes: 60,
      progress: 0,
      subtasks: [],
      recurringFromId: '',
      ...item,
      id,
      done,
      status,
      estimatedMinutes: Math.max(0, Number(item.estimatedMinutes) || 0),
      progress: Math.min(100, Math.max(0, Number(item.progress) || 0)),
      recurrence: ['None', 'Daily', 'Weekly', 'Monthly'].includes(item.recurrence) ? item.recurrence : 'None',
      reminderMinutes: Math.max(-1, Number(item.reminderMinutes ?? 60)),
      resourceUrl: isSafeResourceUrl(item.resourceUrl) ? String(item.resourceUrl || '').trim() : '',
      subtasks: normalizeChecklist(item.subtasks),
    };
  }
  if (key === 'goals') return {
    type: 'Academic',
    priority: 'Medium',
    description: '',
    deadline: '',
    progress: 0,
    status: 'Pending',
    milestones: [],
    autoProgress: false,
    reminderMinutes: 1440,
    ...item,
    id,
    progress: Math.min(100, Math.max(0, Number(item.progress) || 0)),
    milestones: normalizeChecklist(item.milestones),
    autoProgress: Boolean(item.autoProgress),
    reminderMinutes: Math.max(-1, Number(item.reminderMinutes ?? 1440)),
  };
  if (key === 'habits') {
    const frequency = ['Daily', 'Weekdays', 'Weekly', 'Custom'].includes(item.frequency) ? item.frequency : 'Daily';
    const target = Math.max(1, Math.round(Number(item.target) || 1));
    const legacyWeek = Array.isArray(item.week) ? item.week.slice(0, 7).concat(sevenDayWeek()).slice(0, 7) : sevenDayWeek();
    const checkins = normalizeCheckins(Object.keys(item.checkins || {}).length ? item.checkins : migrateLegacyHabitWeek({ ...item, target }));
    return {
      category: 'Study',
      frequency,
      target,
      customDays: normalizeCustomDays(item.customDays, frequency),
      checkins,
      checked: false,
      streak: 0,
      week: legacyWeek,
      archived: false,
      reminderTime: '',
      startDate: '',
      notes: '',
      ...item,
      id,
      frequency,
      target,
      customDays: normalizeCustomDays(item.customDays, frequency),
      checkins,
      week: legacyWeek,
      checked: false,
      streak: 0,
    };
  }
  if (key === 'notes') {
    const tags = normalizeTags(item.tags?.length ? item.tags : item.tag);
    return {
      title: '', body: '', tag: tags[0] || '', tags, pinned: false, favorite: false, archived: false,
      folder: '', courseId: '', resourceIds: [], format: 'markdown', lastOpenedAt: '',
      ...item, id, tags, tag: tags[0] || '', resourceIds: normalizeIds(item.resourceIds),
      pinned: Boolean(item.pinned), favorite: Boolean(item.favorite), archived: Boolean(item.archived),
    };
  }
  if (key === 'resources') {
    const tags = normalizeTags(item.tags);
    return {
      title: '', type: 'Website', url: '', description: '', courseId: '', tags, noteIds: [], taskId: '', examId: '',
      pinned: false, favorite: false, archived: false, lastOpenedAt: '', ...item, id, tags,
      url: isSafeResourceUrl(item.url) ? String(item.url || '').trim() : '',
      noteIds: normalizeIds(item.noteIds), pinned: Boolean(item.pinned), favorite: Boolean(item.favorite), archived: Boolean(item.archived),
    };
  }
  if (key === 'searchHistory') return { query: '', date: '', ...item, id };
  if (key === 'recentItems') return { entityType: '', entityId: '', title: '', page: '', openedAt: '', ...item, id };
  if (key === 'studyLogs') {
    const minutes = Math.max(1, Math.round(Number(item.minutes) || Number(item.hours || 0) * 60 || 60));
    return {
      date: '', startTime: '', endTime: '', subject: '', topic: '', hours: Number((minutes / 60).toFixed(2)), minutes,
      rating: 3, notes: '', courseId: '', taskId: '', method: 'Focused Study', location: '', distractionLevel: 2,
      source: 'manual', focusSessionId: '', ...item, id, minutes, hours: Number((minutes / 60).toFixed(2)),
      rating: Math.min(5, Math.max(1, Number(item.rating) || 3)), distractionLevel: Math.min(5, Math.max(1, Number(item.distractionLevel) || 2)),
    };
  }
  if (key === 'focusSessions') {
    const completedAt = item.completedAt || (item.date ? (() => { const parsed = new Date(item.date); return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString(); })() : '');
    const dateISO = item.dateISO || String(completedAt || '').slice(0, 10);
    return { minutes: 0, plannedMinutes: 0, dateISO, startedAt: '', completedAt, taskId: '', courseId: '', topic: '', notes: '', rating: 3, source: 'pomodoro', ...item, id, dateISO, completedAt, minutes: Math.max(0, Number(item.minutes) || 0), plannedMinutes: Math.max(0, Number(item.plannedMinutes) || Number(item.minutes) || 0) };
  }
  if (key === 'timerSettings') return normalizeTimerSettings({ ...item, id: item.id || defaultTimerSettings.id });
  if (key === 'activeTimer') return normalizeTimerState({ ...item, id: item.id || defaultTimerState.id });
  if (key === 'routines') {
    const derivedCourseId = item.courseId || (item.courseCode ? `code:${String(item.courseCode).trim().toLowerCase()}` : '');
    return { type: 'Class', day: 'Saturday', startTime: item.time || '', endTime: '', room: '', teacher: '', description: '', courseId: derivedCourseId, courseCode: '', courseName: '', attendanceEnabled: true, validFrom: '', validUntil: '', reminderMinutes: 15, ...item, id, courseId: derivedCourseId, startTime: item.startTime || item.time || '', reminderMinutes: Math.max(-1, Number(item.reminderMinutes ?? 15)) };
  }
  if (key === 'routineExceptions') {
    return { routineId: '', originalDate: '', status: 'Cancelled', newDate: '', newStartTime: '', newEndTime: '', newRoom: '', notes: '', ...item, id, status: item.status === 'Rescheduled' ? 'Rescheduled' : 'Cancelled' };
  }
  if (key === 'attendanceRecords') {
    const derivedCourseId = item.courseId || (item.courseCode ? `code:${String(item.courseCode).trim().toLowerCase()}` : item.courseName ? `name:${String(item.courseName).trim().toLowerCase()}` : '');
    return { courseId: derivedCourseId, courseCode: '', courseName: '', date: '', status: 'Present', session: 'Class', notes: '', sourceRoutineId: '', ...item, id, courseId: derivedCourseId };
  }
  if (key === 'attendanceTargets') return { courseId: '', target: 75, ...item, id, target: Math.min(100, Math.max(1, Number(item.target) || 75)) };
  if (key === 'exams') return {
    title: '',
    subject: '',
    courseId: '',
    type: 'Exam',
    date: '',
    time: '',
    room: '',
    priority: 'Medium',
    notes: '',
    preparationStatus: 'Not Started',
    preparationProgress: 0,
    reminderMinutes: 1440,
    syllabus: [],
    ...item,
    id,
    preparationStatus: ['Not Started', 'In Progress', 'Ready'].includes(item.preparationStatus) ? item.preparationStatus : 'Not Started',
    preparationProgress: Math.min(100, Math.max(0, Number(item.preparationProgress) || 0)),
    reminderMinutes: Math.max(-1, Number(item.reminderMinutes ?? 1440)),
    syllabus: normalizeChecklist(item.syllabus),
  };
  if (key === 'calendarItems') return {
    title: '', type: 'Personal', date: '', startTime: '', endTime: '', location: '', description: '', color: 'teal',
    completed: false, reminderMinutes: 30, ...item, id, reminderMinutes: Math.max(-1, Number(item.reminderMinutes ?? 30)),
  };
  if (key === 'notificationSettings') return {
    ...defaultNotificationSettings,
    ...item,
    id: item.id || defaultNotificationSettings.id,
    inAppEnabled: item.inAppEnabled !== false,
    browserEnabled: Boolean(item.browserEnabled),
    defaultLeadMinutes: Math.max(0, Number(item.defaultLeadMinutes ?? defaultNotificationSettings.defaultLeadMinutes)),
    lookAheadDays: Math.min(60, Math.max(1, Number(item.lookAheadDays ?? defaultNotificationSettings.lookAheadDays))),
  };
  if (key === 'reminderHistory') return { key: '', notifiedAt: '', snoozedUntil: '', dismissedAt: '', ...item, id };
  if (key === 'courses') {
    return {
      code: '',
      name: '',
      credit: '',
      grade: '',
      type: 'Theory',
      instructor: '',
      section: '',
      status: 'Completed',
      retakeOf: '',
      excludedFromCgpa: false,
      attendanceTarget: 75,
      ...item,
      id,
    };
  }
  if (key === 'semesters') {
    const courses = Array.isArray(item.courses) ? item.courses.map((course) => migrateEntity('courses', course)) : [];
    const calculated = calculateGPA(courses, gradePoints);
    return {
      name: 'Semester',
      term: '',
      year: '',
      status: 'Completed',
      startDate: '',
      endDate: '',
      gpa: Number(item.gpa ?? calculated.gpa),
      credits: Number(item.credits ?? calculated.credits),
      qualityPoints: Number(item.qualityPoints ?? calculated.points),
      courses,
      date: '',
      ...item,
      id,
      courses,
    };
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...item, id } : value;
}

export function normalizeState(candidate, fallback = starterState) {
  const source = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
  const normalized = stateKeys.reduce((next, key) => {
    const collection = Array.isArray(source[key]) ? source[key] : clone(fallback[key] || []);
    next[key] = collection.map((item) => migrateEntity(key, item));
    return next;
  }, {});
  if (!normalized.academicSettings.length) normalized.academicSettings = [migrateEntity('academicSettings', defaultAcademicSettings)];
  if (!normalized.timerSettings.length) normalized.timerSettings = [migrateEntity('timerSettings', defaultTimerSettings)];
  if (!normalized.notificationSettings.length) normalized.notificationSettings = [migrateEntity('notificationSettings', defaultNotificationSettings)];
  if (!normalized.uiPreferences.length) normalized.uiPreferences = [migrateEntity('uiPreferences', defaultUiPreferences)];
  if (!normalized.activeTimer.length) normalized.activeTimer = [normalizeTimerState(defaultTimerState, normalized.timerSettings[0])];
  else normalized.activeTimer = [normalizeTimerState(normalized.activeTimer[0], normalized.timerSettings[0])];
  return normalized;
}

function unwrapStoredValue(parsed) {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.data) return parsed.data;
  return parsed;
}

export function load(key, fallback = starterState) {
  try {
    if (typeof localStorage === 'undefined') return normalizeState(fallback, fallback);
    const raw = localStorage.getItem(key);
    if (!raw) return normalizeState(fallback, fallback);
    return normalizeState(unwrapStoredValue(JSON.parse(raw)), fallback);
  } catch {
    return normalizeState(fallback, fallback);
  }
}

export function save(key, value) {
  try {
    if (typeof localStorage === 'undefined') return { ok: false, error: 'Storage is unavailable.' };
    const payload = { schemaVersion: STORAGE_SCHEMA_VERSION, savedAt: new Date().toISOString(), data: normalizeState(value) };
    localStorage.setItem(key, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to save LifeOS data.' };
  }
}

export function createBackupPayload(value) {
  return { app: 'LifeOS', schemaVersion: STORAGE_SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: normalizeState(value) };
}

export function parseBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Backup must contain a JSON object.');
  const candidate = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const knownKeys = stateKeys.filter((key) => Object.hasOwn(candidate, key));
  if (knownKeys.length === 0) throw new Error('This is not a recognized LifeOS backup.');
  for (const key of knownKeys) if (!Array.isArray(candidate[key])) throw new Error(`Invalid backup field: ${key}.`);
  return normalizeState(candidate);
}

export function calculateGPA(courses = [], scale = gradePoints) {
  const normalizedScale = normalizeGradingScale(scale);
  const valid = courses.filter((course) => !course.excludedFromCgpa && Number(course.credit) > 0 && Object.hasOwn(normalizedScale, course.grade));
  const credits = valid.reduce((sum, course) => sum + Number(course.credit), 0);
  const points = valid.reduce((sum, course) => sum + Number(course.credit) * normalizedScale[course.grade], 0);
  return { credits, points: Number(points.toFixed(4)), gpa: credits ? Number((points / credits).toFixed(2)) : 0, courseCount: valid.length };
}

function courseIdentity(course) {
  const explicit = String(course.retakeOf || '').trim().toLowerCase();
  if (explicit) return explicit;
  const code = String(course.code || '').trim().toLowerCase();
  if (code) return code;
  return String(course.name || '').trim().toLowerCase();
}

export function calculateCumulativeGPA(semesters = [], scale = gradePoints, retakePolicy = 'latest') {
  const attempts = semesters.flatMap((semester, semesterIndex) => (semester.courses || []).map((course, courseIndex) => ({
    ...course,
    semesterId: semester.id,
    semesterName: semester.name,
    semesterIndex,
    courseIndex,
  }))).filter((course) => !course.excludedFromCgpa);

  let included = attempts;
  let replacedAttempts = 0;
  if (retakePolicy === 'latest') {
    const latestByCourse = new Map();
    attempts.forEach((course) => {
      const identity = courseIdentity(course);
      if (identity) latestByCourse.set(identity, course);
      else latestByCourse.set(`${course.semesterId}-${course.id || course.courseIndex}`, course);
    });
    included = [...latestByCourse.values()];
    replacedAttempts = attempts.length - included.length;
  }

  const result = calculateGPA(included, scale);
  return { ...result, includedCourses: included, attemptCount: attempts.length, replacedAttempts };
}

export function calculateTargetGPA({ currentPoints = 0, currentCredits = 0, targetCgpa = 0, futureCredits = 0 } = {}) {
  const points = Number(currentPoints) || 0;
  const credits = Math.max(0, Number(currentCredits) || 0);
  const target = Math.max(0, Number(targetCgpa) || 0);
  const future = Math.max(0, Number(futureCredits) || 0);
  if (!future) return { requiredGpa: 0, attainable: false, message: 'Enter future credits to calculate a target.' };
  const required = ((target * (credits + future)) - points) / future;
  const requiredGpa = Number(required.toFixed(2));
  if (requiredGpa < 0) return { requiredGpa: 0, attainable: true, message: 'The target is already secured within the selected credit plan.' };
  if (requiredGpa > 4) return { requiredGpa, attainable: false, message: 'This target requires more than a 4.00 GPA for the selected credits.' };
  return { requiredGpa, attainable: true, message: `Maintain about ${requiredGpa.toFixed(2)} GPA over the next ${future} credits.` };
}

export function completionPercent(done, total) {
  const safeDone = Number(done) || 0;
  const safeTotal = Number(total) || 0;
  if (safeTotal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((safeDone / safeTotal) * 100)));
}
