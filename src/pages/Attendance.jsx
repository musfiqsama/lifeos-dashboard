import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid, defaultAcademicSettings } from '../data/storage.js';
import { ATTENDANCE_STATUSES, calculateAttendanceSummary, groupAttendanceByCourse, normalizeAttendanceTarget } from '../utils/attendance.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { todayLocalISO } from '../utils/date.js';
import { cleanText, compareDate, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';

const emptyRecord = {
  courseId: '',
  courseCode: '',
  courseName: '',
  date: todayLocalISO(),
  status: 'Present',
  session: 'Class',
  notes: '',
  sourceRoutineId: '',
};

const statusTone = (status) => {
  if (status === 'Present') return 'successPill';
  if (status === 'Absent') return 'dangerPill';
  if (status === 'Late') return 'warningPill';
  return 'subtle';
};

export default function Attendance({ api }) {
  const {
    attendanceRecords = [],
    attendanceTargets = [],
    courses = [],
    semesters = [],
    academicSettings = [],
  } = api.data;
  const settings = academicSettings[0] || defaultAcademicSettings;
  const defaultTarget = normalizeAttendanceTarget(settings.defaultAttendanceTarget || 75);
  const catalog = useMemo(() => buildCourseCatalog(courses, semesters), [courses, semesters]);
  const targetMap = useMemo(() => new Map(attendanceTargets.map((item) => [item.courseId, normalizeAttendanceTarget(item.target, defaultTarget)])), [attendanceTargets, defaultTarget]);
  const courseModels = useMemo(() => catalog.map((course) => ({ ...course, attendanceTarget: targetMap.get(course.id) || course.attendanceTarget || defaultTarget })), [catalog, defaultTarget, targetMap]);
  const summaries = useMemo(() => groupAttendanceByCourse(attendanceRecords, courseModels, defaultTarget), [attendanceRecords, courseModels, defaultTarget]);

  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [targetEditor, setTargetEditor] = useState(null);

  const overall = calculateAttendanceSummary(attendanceRecords, defaultTarget);
  const riskCourses = summaries.filter((item) => item.summary.atRisk);
  const healthyCourses = summaries.filter((item) => item.summary.total && !item.summary.atRisk);

  const openAdd = () => {
    if (!catalog.length) return api.notify('Add at least one course in Academic before recording attendance.', 'warning', 'No courses available');
    const first = catalog[0];
    setEditingId(null);
    setDraft({ ...emptyRecord, courseId: first.id, courseCode: first.code, courseName: first.name, date: todayLocalISO() });
  };
  const openEdit = (record) => {
    setEditingId(record.id);
    setDraft({ ...emptyRecord, ...record });
  };
  const closeForm = () => { setDraft(null); setEditingId(null); };
  const selectCourse = (id) => {
    const course = catalog.find((item) => item.id === id);
    setDraft((current) => ({ ...current, courseId: id, courseCode: course?.code || '', courseName: course?.name || '' }));
  };

  const saveRecord = (event) => {
    event.preventDefault();
    if (!draft?.courseId || !draft.date || !draft.status) return api.notify('Course, date and status are required.', 'warning', 'Attendance not saved');
    const course = catalog.find((item) => item.id === draft.courseId);
    const duplicate = attendanceRecords.some((item) => item.id !== editingId
      && item.courseId === draft.courseId
      && item.date === draft.date
      && cleanText(item.session).toLowerCase() === cleanText(draft.session).toLowerCase());
    if (duplicate) return api.notify('An attendance record already exists for this course, date and session.', 'warning', 'Duplicate attendance');
    const existing = attendanceRecords.find((item) => item.id === editingId) || {};
    const next = {
      ...existing,
      ...draft,
      id: editingId || uid(),
      courseCode: course?.code || draft.courseCode || '',
      courseName: course?.name || draft.courseName || '',
      session: cleanText(draft.session) || 'Class',
      notes: cleanText(draft.notes),
      ...entityTimestamps(existing),
    };
    api.update('attendanceRecords', editingId
      ? attendanceRecords.map((item) => item.id === editingId ? next : item)
      : [...attendanceRecords, next]);
    api.activity?.(`${editingId ? 'Attendance updated' : 'Attendance marked'}: ${courseLabel(next)} · ${next.status}`);
    api.notify('Attendance record saved.', 'success');
    closeForm();
  };

  const removeRecord = async (record) => {
    if (!await api.confirm({ title: 'Delete attendance record?', message: `${record.courseCode || record.courseName} on ${record.date} will be removed.`, confirmLabel: 'Delete record', danger: true })) return;
    api.update('attendanceRecords', attendanceRecords.filter((item) => item.id !== record.id));
    api.notify('Attendance record deleted.', 'success');
  };

  const saveTarget = () => {
    if (!targetEditor) return;
    const target = normalizeAttendanceTarget(targetEditor.target, defaultTarget);
    const existing = attendanceTargets.find((item) => item.courseId === targetEditor.courseId);
    const next = existing
      ? attendanceTargets.map((item) => item.courseId === targetEditor.courseId ? { ...item, target, updatedAt: new Date().toISOString() } : item)
      : [...attendanceTargets, { id: uid(), courseId: targetEditor.courseId, target, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    api.update('attendanceTargets', next);
    setTargetEditor(null);
    api.notify('Attendance target updated.', 'success');
  };

  const visibleRecords = useMemo(() => attendanceRecords
    .filter((item) => courseFilter === 'All' || item.courseId === courseFilter)
    .filter((item) => statusFilter === 'All' || item.status === statusFilter)
    .filter((item) => matchesSearch(query, item.courseCode, item.courseName, item.date, item.status, item.session, item.notes))
    .sort((a, b) => {
      if (sort === 'oldest') return compareDate(a.date, b.date);
      if (sort === 'course') return `${a.courseCode} ${a.courseName}`.localeCompare(`${b.courseCode} ${b.courseName}`, undefined, { sensitivity: 'base' });
      return compareDate(b.date, a.date);
    }), [attendanceRecords, courseFilter, query, sort, statusFilter]);

  return (
    <>
      <Header title="Attendance Tracker" subtitle="Track course attendance, monitor the minimum requirement and act before a course becomes risky." />
      <section className="statsGrid four">
        <StatCard label="Overall Attendance" value={`${overall.percentage.toFixed(1)}%`} note={`${overall.attended}/${overall.total} counted classes`} />
        <StatCard label="Courses Tracked" value={summaries.filter((item) => item.summary.total).length} note={`${catalog.length} courses available`} tone="green" />
        <StatCard label="At Risk" value={riskCourses.length} note="below course target" tone="orange" />
        <StatCard label="Healthy" value={healthyCourses.length} note="meeting target" tone="purple" />
      </section>

      <Card>
        <div className="cardHead">
          <div><h3>Course Attendance</h3><p>Present and Late count as attended. Excused and Cancelled classes do not affect the percentage.</p></div>
          <button type="button" className="primaryBtn" onClick={openAdd}>Mark Attendance</button>
        </div>
        {!summaries.length ? <EmptyState title="No academic courses" text="Add courses in Academic System 2.0, then return here to start attendance tracking." /> : (
          <div className="attendanceCourseGrid">
            {summaries.map((item) => {
              const summary = item.summary;
              return <article className={`attendanceCourseCard ${summary.atRisk ? 'attendanceRisk' : ''}`} key={item.id}>
                <div className="cardHead compact"><div><span className="eyebrow">{item.code || 'Course'}</span><h4>{item.name}</h4></div><button type="button" className="ghostBtn" onClick={() => setTargetEditor({ courseId: item.id, name: courseLabel(item), target: item.target })}>Target {item.target}%</button></div>
                <div className="attendanceRing" style={{ '--attendance-angle': `${summary.percentage}%`, '--attendance-color': summary.atRisk ? '#fb7185' : '#22c55e' }}><strong>{summary.percentage.toFixed(1)}%</strong><span>{summary.attended}/{summary.total}</span></div>
                <div className="attendanceMetrics"><span>Present <strong>{summary.present}</strong></span><span>Absent <strong>{summary.absent}</strong></span><span>Late <strong>{summary.late}</strong></span></div>
                {summary.total === 0 ? <p>No counted classes yet.</p> : summary.atRisk
                  ? <p className="riskText">Attend the next {Number.isFinite(summary.requiredClasses) ? summary.requiredClasses : 'all'} class{summary.requiredClasses === 1 ? '' : 'es'} to reach {item.target}%.</p>
                  : <p className="safeText">You can safely miss {summary.missableClasses} more class{summary.missableClasses === 1 ? '' : 'es'} at this target.</p>}
                <button type="button" className="linkBtn" onClick={() => setCourseFilter(item.id)}>View history</button>
              </article>;
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="cardHead"><div><h3>Attendance History</h3><p>Review, edit and correct individual class records.</p></div></div>
        <CrudToolbar
          query={query}
          onQueryChange={setQuery}
          count={visibleRecords.length}
          queryPlaceholder="Search course, session or notes"
          filters={[
            { label: 'Course', value: courseFilter, onChange: setCourseFilter, options: [{ value: 'All', label: 'All courses' }, ...summaries.map((course) => ({ value: course.id, label: courseLabel(course) }))] },
            { label: 'Status', value: statusFilter, onChange: setStatusFilter, options: ['All', ...ATTENDANCE_STATUSES] },
          ]}
          sortValue={sort}
          onSortChange={setSort}
          sortOptions={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'course', label: 'Course' }]}
        />
        {visibleRecords.length === 0 ? <EmptyState title="No attendance records" text="Mark a class or change the current filters." /> : <div className="tableWrap"><table className="dataTable attendanceTable"><thead><tr><th>Date</th><th>Course</th><th>Session</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.id}><td>{record.date}</td><td><strong>{record.courseCode || '—'}</strong><br /><span>{record.courseName || 'Untitled course'}</span></td><td>{record.session || 'Class'}</td><td><span className={`pill ${statusTone(record.status)}`}>{record.status}</span></td><td>{record.notes || '—'}</td><td><ItemActions onView={() => setViewing(record)} onEdit={() => openEdit(record)} onDelete={() => removeRecord(record)} /></td></tr>)}</tbody></table></div>}
      </Card>

      <Modal open={Boolean(draft)} wide title={editingId ? 'Edit Attendance' : 'Mark Attendance'} onClose={closeForm} actions={<><button type="button" className="ghostBtn" onClick={closeForm}>Cancel</button><button type="submit" form="attendance-form" className="primaryBtn">Save Attendance</button></>}>
        {draft ? <form id="attendance-form" className="formGrid modalForm" onSubmit={saveRecord}>
          <Field label="Course" full><select value={draft.courseId} onChange={(event) => selectCourse(event.target.value)}>{catalog.map((course) => <option value={course.id} key={course.id}>{courseLabel(course)}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{ATTENDANCE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
          <Field label="Session"><input value={draft.session} onChange={(event) => setDraft({ ...draft, session: event.target.value })} placeholder="Class, Lab, Tutorial..." /></Field>
          <Field label="Notes" full><textarea rows="4" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Optional correction or class note" /></Field>
        </form> : null}
      </Modal>

      <Modal open={Boolean(viewing)} title="Attendance Details" onClose={() => setViewing(null)} actions={<button type="button" className="primaryBtn" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Record</button>}>
        {viewing ? <DetailGrid rows={[{ label: 'Course', value: courseLabel(viewing), full: true }, { label: 'Date', value: viewing.date }, { label: 'Status', value: viewing.status }, { label: 'Session', value: viewing.session || 'Class' }, { label: 'Source', value: viewing.sourceRoutineId ? 'Weekly routine' : 'Manual entry' }, { label: 'Notes', value: viewing.notes || 'No notes', full: true }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} /> : null}
      </Modal>

      <Modal open={Boolean(targetEditor)} title="Course Attendance Target" onClose={() => setTargetEditor(null)} actions={<><button type="button" className="ghostBtn" onClick={() => setTargetEditor(null)}>Cancel</button><button type="button" className="primaryBtn" onClick={saveTarget}>Save Target</button></>}>
        {targetEditor ? <div className="modalForm"><p>{targetEditor.name}</p><Field label="Minimum attendance percentage"><input type="number" min="1" max="100" value={targetEditor.target} onChange={(event) => setTargetEditor({ ...targetEditor, target: event.target.value })} /></Field></div> : null}
      </Modal>
    </>
  );
}
