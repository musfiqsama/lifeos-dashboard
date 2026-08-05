const clean = (value) => String(value ?? '').trim();

export function courseKey(course = {}) {
  const code = clean(course.code).toLowerCase();
  if (code) return `code:${code}`;
  const id = clean(course.id || course.courseId);
  if (id) return `id:${id}`;
  const name = clean(course.name || course.title).toLowerCase();
  return name ? `name:${name}` : '';
}

export function buildCourseCatalog(currentCourses = [], semesters = []) {
  const catalog = new Map();
  const add = (course, semester = null) => {
    const id = courseKey(course);
    if (!id) return;
    const existing = catalog.get(id);
    const candidate = {
      id,
      sourceId: course.id || '',
      code: clean(course.code),
      name: clean(course.name || course.title) || clean(course.code) || 'Untitled course',
      instructor: clean(course.instructor),
      section: clean(course.section),
      attendanceTarget: Number(course.attendanceTarget) || 0,
      semesterId: semester?.id || '',
      semesterName: semester?.name || '',
      current: !semester,
    };
    if (!existing || candidate.current) catalog.set(id, { ...existing, ...candidate });
  };
  currentCourses.forEach((course) => add(course));
  semesters.forEach((semester) => (semester.courses || []).forEach((course) => add(course, semester)));
  return [...catalog.values()].sort((a, b) => `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`, undefined, { sensitivity: 'base' }));
}

export function courseLabel(course = {}) {
  return [clean(course.code || course.courseCode), clean(course.name || course.courseName || course.title)].filter(Boolean).join(' · ') || 'Untitled course';
}
