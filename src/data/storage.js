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

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function calculateGPA(courses = []) {
  const valid = courses.filter((c) => Number(c.credit) > 0 && c.grade);
  const credits = valid.reduce((sum, c) => sum + Number(c.credit), 0);
  const points = valid.reduce((sum, c) => sum + Number(c.credit) * (gradePoints[c.grade] ?? 0), 0);
  return {
    credits,
    points,
    gpa: credits ? Number((points / credits).toFixed(2)) : 0,
  };
}

export function completionPercent(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

export const starterState = {
  courses: [],
  semesters: [],
  goals: [],
  tasks: [],
  habits: [],
  notes: [],
  studyLogs: [],
  routines: [],
  focusSessions: [],
  activities: [],
  exams: [],
  calendarItems: [],
  achievementDismissed: [],
};
