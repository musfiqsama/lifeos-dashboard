export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused', 'Cancelled'];

const countedStatuses = new Set(['Present', 'Absent', 'Late']);
const attendedStatuses = new Set(['Present', 'Late']);

export function normalizeAttendanceTarget(value, fallback = 75) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(1, number));
}

export function calculateAttendanceSummary(records = [], targetValue = 75) {
  const target = normalizeAttendanceTarget(targetValue);
  const counted = records.filter((record) => countedStatuses.has(record.status));
  const attended = counted.filter((record) => attendedStatuses.has(record.status)).length;
  const absent = counted.filter((record) => record.status === 'Absent').length;
  const late = counted.filter((record) => record.status === 'Late').length;
  const excused = records.filter((record) => record.status === 'Excused').length;
  const cancelled = records.filter((record) => record.status === 'Cancelled').length;
  const total = counted.length;
  const percentage = total ? Number(((attended / total) * 100).toFixed(1)) : 0;

  let missableClasses = 0;
  let requiredClasses = 0;
  if (total && percentage >= target) {
    missableClasses = Math.max(0, Math.floor((attended * 100) / target - total));
  } else if (target < 100) {
    requiredClasses = Math.max(0, Math.ceil(((target * total) - (100 * attended)) / (100 - target)));
  } else if (attended < total) {
    requiredClasses = Number.POSITIVE_INFINITY;
  }

  return {
    target,
    total,
    attended,
    present: records.filter((record) => record.status === 'Present').length,
    absent,
    late,
    excused,
    cancelled,
    percentage,
    atRisk: total > 0 && percentage < target,
    missableClasses,
    requiredClasses,
  };
}

export function groupAttendanceByCourse(records = [], courses = [], defaultTarget = 75) {
  const courseMap = new Map();
  courses.forEach((course) => {
    const id = String(course.id || course.courseId || course.code || course.name || '').trim();
    if (!id) return;
    courseMap.set(id, {
      id,
      code: course.code || '',
      name: course.name || course.title || course.code || 'Untitled course',
      target: normalizeAttendanceTarget(course.attendanceTarget, defaultTarget),
    });
  });

  records.forEach((record) => {
    const id = String(record.courseId || record.courseCode || record.courseName || '').trim();
    if (!id) return;
    if (!courseMap.has(id)) {
      courseMap.set(id, {
        id,
        code: record.courseCode || '',
        name: record.courseName || record.courseCode || 'Untitled course',
        target: normalizeAttendanceTarget(record.attendanceTarget, defaultTarget),
      });
    }
  });

  return [...courseMap.values()].map((course) => {
    const courseRecords = records.filter((record) => String(record.courseId || record.courseCode || record.courseName || '').trim() === course.id);
    return { ...course, records: courseRecords, summary: calculateAttendanceSummary(courseRecords, course.target) };
  });
}

export function attendanceStatusCounts(records = []) {
  return ATTENDANCE_STATUSES.map((status) => ({ status, count: records.filter((record) => record.status === status).length }));
}
