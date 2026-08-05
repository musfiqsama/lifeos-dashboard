import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import {
  calculateCumulativeGPA,
  calculateGPA,
  calculateTargetGPA,
  defaultAcademicSettings,
  uid,
} from '../data/storage.js';
import { toLocalISODate } from '../utils/date.js';
import { cleanText, compareDate, compareText, entityTimestamps, matchesSearch } from '../utils/entity.js';

const COURSE_TYPES = ['Theory', 'Lab', 'Project', 'Thesis', 'Internship'];
const COURSE_STATUSES = ['Completed', 'In Progress', 'Withdrawn'];
const SEMESTER_STATUSES = ['Completed', 'Current', 'Planned', 'Archived'];
const TERMS = ['Spring', 'Summer', 'Fall', 'Winter', 'Other'];

function freshCourse() {
  return {
    id: uid(), code: '', name: '', credit: '', grade: '', type: 'Theory', instructor: '', section: '',
    status: 'Completed', retakeOf: '', excludedFromCgpa: false, ...entityTimestamps(),
  };
}

function freshSemesterMeta(index) {
  return {
    name: `Semester ${index + 1}`,
    term: '',
    year: String(new Date().getFullYear()),
    status: 'Completed',
    startDate: '',
    endDate: '',
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function CourseForm({ course, onChange, gradeLabels, retakeOptions }) {
  return (
    <div className="formGrid modalForm">
      <Field label="Course code"><input value={course.code || ''} onChange={(event) => onChange({ code: event.target.value })} placeholder="CSE 2203" /></Field>
      <Field label="Course title"><input value={course.name || ''} onChange={(event) => onChange({ name: event.target.value })} placeholder="Data Structures" /></Field>
      <Field label="Credit"><input type="number" min="0" step="0.5" value={course.credit ?? ''} onChange={(event) => onChange({ credit: event.target.value })} placeholder="3" /></Field>
      <Field label="Grade"><select value={course.grade || ''} onChange={(event) => onChange({ grade: event.target.value })}><option value="">Not graded</option>{gradeLabels.map(([grade, points]) => <option key={grade} value={grade}>{grade} ({Number(points).toFixed(2)})</option>)}</select></Field>
      <Field label="Course type"><select value={course.type || 'Theory'} onChange={(event) => onChange({ type: event.target.value })}>{COURSE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
      <Field label="Status"><select value={course.status || 'Completed'} onChange={(event) => onChange({ status: event.target.value })}>{COURSE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
      <Field label="Instructor"><input value={course.instructor || ''} onChange={(event) => onChange({ instructor: event.target.value })} placeholder="Faculty name" /></Field>
      <Field label="Section"><input value={course.section || ''} onChange={(event) => onChange({ section: event.target.value })} placeholder="A" /></Field>
      <Field label="Retake/replacement for" hint="Choose the original course when this attempt should replace an earlier result."><select value={course.retakeOf || ''} onChange={(event) => onChange({ retakeOf: event.target.value })}><option value="">Not a retake</option>{retakeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="CGPA inclusion"><label className="checkLine"><input type="checkbox" checked={!course.excludedFromCgpa} onChange={(event) => onChange({ excludedFromCgpa: !event.target.checked })} /> Include this course in GPA/CGPA</label></Field>
    </div>
  );
}

export default function Academic({ api }) {
  const { courses = [], semesters = [], academicSettings = [] } = api.data;
  const settings = academicSettings[0] || defaultAcademicSettings;
  const gradingScale = settings.gradingScale || defaultAcademicSettings.gradingScale;
  const gradeLabels = useMemo(() => Object.entries(gradingScale).sort((a, b) => Number(b[1]) - Number(a[1])), [gradingScale]);
  const result = calculateGPA(courses, gradingScale);
  const cumulative = useMemo(() => calculateCumulativeGPA(semesters, gradingScale, settings.retakePolicy), [gradingScale, semesters, settings.retakePolicy]);
  const projected = useMemo(() => calculateCumulativeGPA([...semesters, { id: 'current-draft', name: 'Current draft', courses }], gradingScale, settings.retakePolicy), [courses, gradingScale, semesters, settings.retakePolicy]);

  const [semesterMeta, setSemesterMeta] = useState(() => freshSemesterMeta(semesters.length));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewing, setViewing] = useState(null);
  const [courseEditor, setCourseEditor] = useState(null);
  const [semesterEditor, setSemesterEditor] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scaleRows, setScaleRows] = useState([]);
  const [scaleName, setScaleName] = useState(settings.scaleName || '');
  const [targetCgpa, setTargetCgpa] = useState(Number(settings.targetCgpa || 3.5));
  const [targetCredits, setTargetCredits] = useState(Number(settings.targetCredits || 15));

  const retakeOptions = useMemo(() => {
    const map = new Map();
    semesters.flatMap((semester) => semester.courses || []).forEach((course) => {
      const identity = cleanText(course.code || course.name).toLowerCase();
      if (identity && !map.has(identity)) map.set(identity, { value: identity, label: `${course.code || 'No code'} — ${course.name || 'Untitled course'}` });
    });
    return [...map.values()];
  }, [semesters]);

  const target = calculateTargetGPA({
    currentPoints: cumulative.points,
    currentCredits: cumulative.credits,
    targetCgpa,
    futureCredits: targetCredits,
  });

  const distribution = useMemo(() => gradeLabels.map(([grade]) => ({
    grade,
    count: cumulative.includedCourses.filter((course) => course.grade === grade).length,
  })).filter((item) => item.count > 0), [cumulative.includedCourses, gradeLabels]);
  const maxDistribution = Math.max(1, ...distribution.map((item) => item.count));

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch, id: settings.id || defaultAcademicSettings.id };
    api.update('academicSettings', [next]);
  };

  const openAddCourse = () => setCourseEditor({ mode: 'add', course: freshCourse() });
  const openEditCourse = (course) => setCourseEditor({ mode: 'edit', course: clone(course) });
  const saveCourse = () => {
    const course = courseEditor?.course;
    if (!course) return;
    if (!cleanText(course.code) && !cleanText(course.name)) return api.notify('Enter a course code or course title.', 'warning', 'Course not saved');
    if (Number(course.credit) <= 0) return api.notify('Course credit must be greater than zero.', 'warning', 'Course not saved');
    const duplicate = courses.some((item) => item.id !== course.id && cleanText(item.code).toLowerCase() && cleanText(item.code).toLowerCase() === cleanText(course.code).toLowerCase());
    if (duplicate) return api.notify('A current course already uses this course code.', 'warning', 'Duplicate course code');
    const nextCourse = { ...course, code: cleanText(course.code), name: cleanText(course.name), credit: Number(course.credit), ...entityTimestamps(course) };
    api.update('courses', courseEditor.mode === 'add' ? [...courses, nextCourse] : courses.map((item) => item.id === nextCourse.id ? nextCourse : item));
    setCourseEditor(null);
    api.notify(courseEditor.mode === 'add' ? 'Course added.' : 'Course updated.', 'success');
  };

  const removeCourse = async (course) => {
    if (!await api.confirm({ title: 'Remove course?', message: `“${course.name || course.code || 'Untitled course'}” will be removed from the current semester.`, confirmLabel: 'Remove course', danger: true })) return;
    api.update('courses', courses.filter((item) => item.id !== course.id));
  };

  const saveSemester = () => {
    if (!result.credits) return api.notify('Add at least one course with a valid credit and grade first.', 'warning', 'Semester not saved');
    if (!cleanText(semesterMeta.name)) return api.notify('Enter a semester name.', 'warning', 'Semester not saved');
    if (semesterMeta.startDate && semesterMeta.endDate && semesterMeta.startDate > semesterMeta.endDate) return api.notify('Semester end date cannot be before the start date.', 'warning', 'Semester not saved');
    const semester = {
      id: uid(),
      ...semesterMeta,
      name: cleanText(semesterMeta.name),
      year: cleanText(semesterMeta.year),
      gpa: result.gpa,
      credits: result.credits,
      qualityPoints: result.points,
      courses: courses.map((course) => ({ ...course })),
      date: toLocalISODate(),
      ...entityTimestamps(),
    };
    api.setData((previous) => ({ ...previous, semesters: [...(previous.semesters || []), semester], courses: [] }));
    setSemesterMeta(freshSemesterMeta(semesters.length + 1));
    api.activity?.(`${semester.name} saved with GPA ${result.gpa.toFixed(2)}`);
    api.notify(`${semester.name} saved successfully.`, 'success', 'Academic record updated');
  };

  const removeSemester = async (semester) => {
    if (!await api.confirm({ title: 'Delete semester?', message: `“${semester.name}” and its saved course snapshot will be permanently removed.`, confirmLabel: 'Delete semester', danger: true })) return;
    api.update('semesters', semesters.filter((item) => item.id !== semester.id));
    api.notify('Semester deleted.', 'success');
  };

  const openSemesterEditor = (semester) => setSemesterEditor(clone(semester));
  const updateSemesterCourse = (id, patch) => setSemesterEditor((current) => ({ ...current, courses: current.courses.map((course) => course.id === id ? { ...course, ...patch } : course) }));
  const saveEditedSemester = () => {
    if (!semesterEditor) return;
    if (!cleanText(semesterEditor.name)) return api.notify('Enter a semester name.', 'warning', 'Semester not updated');
    if (semesterEditor.startDate && semesterEditor.endDate && semesterEditor.startDate > semesterEditor.endDate) return api.notify('Semester end date cannot be before the start date.', 'warning', 'Semester not updated');
    const calculated = calculateGPA(semesterEditor.courses, gradingScale);
    if (!calculated.credits) return api.notify('The semester needs at least one graded course.', 'warning', 'Semester not updated');
    const next = { ...semesterEditor, name: cleanText(semesterEditor.name), gpa: calculated.gpa, credits: calculated.credits, qualityPoints: calculated.points, ...entityTimestamps(semesterEditor) };
    api.update('semesters', semesters.map((item) => item.id === next.id ? next : item));
    setSemesterEditor(null);
    setViewing((current) => current?.id === next.id ? next : current);
    api.notify('Semester updated and GPA recalculated.', 'success');
  };

  const openSettings = () => {
    setScaleRows(gradeLabels.map(([label, points]) => ({ id: uid(), label, points })));
    setScaleName(settings.scaleName || '');
    setSettingsOpen(true);
  };
  const saveSettings = () => {
    const rows = scaleRows.map((row) => ({ label: cleanText(row.label), points: Number(row.points) })).filter((row) => row.label);
    if (!rows.length) return api.notify('Add at least one grade to the scale.', 'warning', 'Scale not saved');
    if (rows.some((row) => !Number.isFinite(row.points) || row.points < 0 || row.points > 4)) return api.notify('Every grade point must be between 0.00 and 4.00.', 'warning', 'Scale not saved');
    if (new Set(rows.map((row) => row.label.toLowerCase())).size !== rows.length) return api.notify('Grade labels must be unique.', 'warning', 'Scale not saved');
    const nextScale = Object.fromEntries(rows.sort((a, b) => b.points - a.points).map((row) => [row.label, row.points]));
    const usedGrades = new Set([...courses, ...semesters.flatMap((semester) => semester.courses || [])].map((course) => course.grade).filter(Boolean));
    const missingUsedGrades = [...usedGrades].filter((grade) => !Object.hasOwn(nextScale, grade));
    if (missingUsedGrades.length) return api.notify(`Keep these grades because saved courses still use them: ${missingUsedGrades.join(', ')}.`, 'warning', 'Scale not saved');
    const recalculatedSemesters = semesters.map((semester) => {
      const calculated = calculateGPA(semester.courses, nextScale);
      return { ...semester, gpa: calculated.gpa, credits: calculated.credits, qualityPoints: calculated.points };
    });
    api.setData((previous) => ({ ...previous, academicSettings: [{ ...settings, scaleName: cleanText(scaleName) || 'Custom 4.00 Scale', gradingScale: nextScale }], semesters: recalculatedSemesters }));
    setSettingsOpen(false);
    api.notify('Grading scale saved and semester results recalculated.', 'success');
  };

  const visibleSemesters = useMemo(() => semesters
    .filter((semester) => statusFilter === 'All' || semester.status === statusFilter)
    .filter((semester) => matchesSearch(query, semester.name, semester.term, semester.year, semester.date, semester.gpa, semester.courses?.map((course) => `${course.code} ${course.name}`)))
    .sort((a, b) => {
      if (sort === 'name') return compareText(a.name, b.name);
      if (sort === 'gpa') return Number(b.gpa || 0) - Number(a.gpa || 0);
      if (sort === 'oldest') return compareDate(a.date || a.startDate || '', b.date || b.startDate || '');
      return compareDate(b.date || b.startDate || '', a.date || a.startDate || '');
    }), [query, semesters, sort, statusFilter]);

  return (
    <>
      <Header title="Academic System 2.0" subtitle="Manage courses, semesters, retakes, grading rules and long-term CGPA planning from one workspace." />
      <section className="statsGrid four academicStats">
        <StatCard label="Current GPA" value={result.gpa.toFixed(2)} note={`${result.credits} draft credits`} />
        <StatCard label="Overall CGPA" value={cumulative.gpa.toFixed(2)} note={`${cumulative.credits} counted credits`} tone="green" />
        <StatCard label="Projected CGPA" value={projected.gpa.toFixed(2)} note="including current draft" tone="purple" />
        <StatCard label="Saved Semesters" value={semesters.length} note={`${cumulative.replacedAttempts} replaced attempt${cumulative.replacedAttempts === 1 ? '' : 's'}`} tone="blue" />
      </section>

      <section className="twoCol wideLeft">
        <Card>
          <div className="cardHead"><div><h3>Current Semester Courses</h3><p>Build the semester draft with complete course metadata before saving it.</p></div><button className="primaryBtn" type="button" onClick={openAddCourse}>Add Course</button></div>
          {courses.length === 0 ? <EmptyState title="No courses added" text="Add a course to start calculating the semester GPA." /> : <div className="tableWrap"><table className="dataTable academicTable"><thead><tr><th>Course</th><th>Type</th><th>Credit</th><th>Grade</th><th>CGPA</th><th>Actions</th></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><strong>{course.code || 'No code'}</strong><br /><span>{course.name || 'Untitled course'}</span></td><td>{course.type || 'Theory'}{course.section ? <small> · {course.section}</small> : null}</td><td>{course.credit || '—'}</td><td>{course.grade || 'Pending'}</td><td>{course.excludedFromCgpa ? <span className="pill dangerPill">Excluded</span> : <span className="pill">Included</span>}</td><td><ItemActions onEdit={() => openEditCourse(course)} onDelete={() => removeCourse(course)} /></td></tr>)}</tbody></table></div>}
        </Card>
        <Card className="resultCard academicSaveCard">
          <p className="eyebrow">Semester Draft</p><h2>{result.gpa.toFixed(2)}</h2><p>{result.credits} graded credits · {courses.length} courses</p><div className="progress"><span style={{ width: `${Math.min(100, (result.gpa / 4) * 100)}%` }} /></div>
          <Field label="Semester name"><input value={semesterMeta.name} onChange={(event) => setSemesterMeta({ ...semesterMeta, name: event.target.value })} placeholder="Semester 1" /></Field>
          <div className="miniFieldGrid"><Field label="Term"><select value={semesterMeta.term} onChange={(event) => setSemesterMeta({ ...semesterMeta, term: event.target.value })}><option value="">Select</option>{TERMS.map((term) => <option key={term}>{term}</option>)}</select></Field><Field label="Year"><input value={semesterMeta.year} onChange={(event) => setSemesterMeta({ ...semesterMeta, year: event.target.value })} /></Field></div>
          <div className="miniFieldGrid"><Field label="Start date"><input type="date" value={semesterMeta.startDate} onChange={(event) => setSemesterMeta({ ...semesterMeta, startDate: event.target.value })} /></Field><Field label="End date"><input type="date" value={semesterMeta.endDate} onChange={(event) => setSemesterMeta({ ...semesterMeta, endDate: event.target.value })} /></Field></div>
          <Field label="Status"><select value={semesterMeta.status} onChange={(event) => setSemesterMeta({ ...semesterMeta, status: event.target.value })}>{SEMESTER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
          <button className="primaryBtn full" type="button" onClick={saveSemester}>Save Semester</button>
        </Card>
      </section>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Target CGPA Planner</h3><p>Estimate the GPA needed across your next planned credits.</p></div></div>
          <div className="formGrid targetPlanner"><Field label="Target CGPA"><input type="number" min="0" max="4" step="0.01" value={targetCgpa} onChange={(event) => setTargetCgpa(Number(event.target.value))} /></Field><Field label="Future credits"><input type="number" min="1" step="0.5" value={targetCredits} onChange={(event) => setTargetCredits(Number(event.target.value))} /></Field></div>
          <div className={`targetResult ${target.attainable ? 'attainable' : 'notAttainable'}`}><span>Required GPA</span><strong>{target.requiredGpa.toFixed(2)}</strong><p>{target.message}</p></div>
          <button className="ghostBtn" type="button" onClick={() => { updateSettings({ targetCgpa, targetCredits }); api.notify('Target plan saved.', 'success'); }}>Save target plan</button>
        </Card>
        <Card>
          <div className="cardHead"><div><h3>Academic Rules</h3><p>{settings.scaleName || 'Custom scale'} · Retake policy affects cumulative CGPA.</p></div><button className="ghostBtn" type="button" onClick={openSettings}>Edit Grade Scale</button></div>
          <Field label="Retake policy"><select value={settings.retakePolicy || 'latest'} onChange={(event) => updateSettings({ retakePolicy: event.target.value })}><option value="latest">Latest attempt replaces previous</option><option value="all">Count every attempt</option></select></Field>
          <Field label="Program credits"><input type="number" min="1" value={settings.programCredits || 144} onChange={(event) => updateSettings({ programCredits: Number(event.target.value) })} /></Field>
          <Field label="Default attendance target"><input type="number" min="1" max="100" value={settings.defaultAttendanceTarget || 75} onChange={(event) => updateSettings({ defaultAttendanceTarget: Math.min(100, Math.max(1, Number(event.target.value) || 75)) })} /></Field>
          <div className="inlinePills academicScalePills">{gradeLabels.map(([grade, points]) => <span className="pill subtle" key={grade}>{grade}: {Number(points).toFixed(2)}</span>)}</div>
        </Card>
      </section>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Grade Distribution</h3><p>Counted attempts after applying the selected retake policy.</p></div></div>
          {distribution.length === 0 ? <EmptyState title="No graded history" text="Save graded semesters to see the distribution." /> : <div className="gradeDistribution">{distribution.map((item) => <div className="gradeBarRow" key={item.grade}><span>{item.grade}</span><div><i style={{ width: `${(item.count / maxDistribution) * 100}%` }} /></div><strong>{item.count}</strong></div>)}</div>}
        </Card>
        <Card>
          <div className="cardHead"><div><h3>Degree Progress</h3><p>Completed credits compared with the configured program total.</p></div></div>
          <div className="degreeProgress"><strong>{cumulative.credits}</strong><span>of {settings.programCredits || 144} credits</span><div className="progress"><i style={{ width: `${Math.min(100, (cumulative.credits / Math.max(1, Number(settings.programCredits || 144))) * 100)}%` }} /></div><p>{Math.max(0, Number(settings.programCredits || 144) - cumulative.credits)} credits remaining</p></div>
        </Card>
      </section>

      <Card>
        <div className="cardHead"><div><h3>Semester History</h3><p>Search, inspect, edit, recalculate or remove saved academic records.</p></div></div>
        <CrudToolbar query={query} onQueryChange={setQuery} count={visibleSemesters.length} queryPlaceholder="Search semester, term or course" filters={[{ label: 'Status', value: statusFilter, onChange: setStatusFilter, options: ['All', ...SEMESTER_STATUSES] }]} sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'gpa', label: 'Highest GPA' }, { value: 'name', label: 'Name' }]} />
        {visibleSemesters.length === 0 ? <EmptyState title="No semester records" text="Save a semester or change your search/filter." /> : <div className="itemGrid">{visibleSemesters.map((semester) => <article className="itemCard academicSemesterCard" key={semester.id}><div className="inlinePills"><span className="pill">{semester.credits || 0} credits</span><span className="pill subtle">{semester.status || 'Completed'}</span></div><h4>{semester.name}</h4><div className="summarySmall">{Number(semester.gpa || 0).toFixed(2)}</div><p>{[semester.term, semester.year].filter(Boolean).join(' ') || semester.date || 'No term'} · {semester.courses?.length || 0} courses</p><ItemActions onView={() => setViewing(semester)} onEdit={() => openSemesterEditor(semester)} onDelete={() => removeSemester(semester)} /></article>)}</div>}
      </Card>

      <Modal open={Boolean(courseEditor)} wide title={courseEditor?.mode === 'add' ? 'Add course' : 'Edit course'} onClose={() => setCourseEditor(null)} actions={<><button className="ghostBtn" type="button" onClick={() => setCourseEditor(null)}>Cancel</button><button className="primaryBtn" type="button" onClick={saveCourse}>Save course</button></>}>
        {courseEditor ? <CourseForm course={courseEditor.course} gradeLabels={gradeLabels} retakeOptions={retakeOptions} onChange={(patch) => setCourseEditor((current) => ({ ...current, course: { ...current.course, ...patch } }))} /> : null}
      </Modal>

      <Modal open={Boolean(viewing)} wide title={viewing?.name || 'Semester details'} onClose={() => setViewing(null)} actions={viewing ? <><button className="ghostBtn" type="button" onClick={() => openSemesterEditor(viewing)}>Edit semester</button><button className="primaryBtn" type="button" onClick={() => window.print()}>Print academic page</button></> : null}>
        {viewing ? <><DetailGrid rows={[{ label: 'GPA', value: Number(viewing.gpa || 0).toFixed(2) }, { label: 'Credits', value: viewing.credits || 0 }, { label: 'Term', value: [viewing.term, viewing.year].filter(Boolean).join(' ') }, { label: 'Status', value: viewing.status || 'Completed' }, { label: 'Start date', value: viewing.startDate || 'Not set' }, { label: 'End date', value: viewing.endDate || 'Not set' }]} /><div className="tableWrap"><table className="dataTable"><thead><tr><th>Code</th><th>Course</th><th>Type</th><th>Credit</th><th>Grade</th><th>Retake</th><th>CGPA</th></tr></thead><tbody>{(viewing.courses || []).map((course) => <tr key={course.id || `${course.name}-${course.credit}`}><td>{course.code || '—'}</td><td>{course.name || 'Untitled'}</td><td>{course.type || 'Theory'}</td><td>{course.credit || '—'}</td><td>{course.grade || '—'}</td><td>{course.retakeOf ? 'Yes' : 'No'}</td><td>{course.excludedFromCgpa ? 'Excluded' : 'Included'}</td></tr>)}</tbody></table></div></> : null}
      </Modal>

      <Modal open={Boolean(semesterEditor)} wide title="Edit semester" onClose={() => setSemesterEditor(null)} actions={<><button className="ghostBtn" type="button" onClick={() => setSemesterEditor(null)}>Cancel</button><button className="primaryBtn" type="button" onClick={saveEditedSemester}>Save changes</button></>}>
        {semesterEditor ? <><div className="formGrid modalForm"><Field label="Semester name"><input value={semesterEditor.name || ''} onChange={(event) => setSemesterEditor({ ...semesterEditor, name: event.target.value })} /></Field><Field label="Term"><select value={semesterEditor.term || ''} onChange={(event) => setSemesterEditor({ ...semesterEditor, term: event.target.value })}><option value="">Select</option>{TERMS.map((term) => <option key={term}>{term}</option>)}</select></Field><Field label="Year"><input value={semesterEditor.year || ''} onChange={(event) => setSemesterEditor({ ...semesterEditor, year: event.target.value })} /></Field><Field label="Status"><select value={semesterEditor.status || 'Completed'} onChange={(event) => setSemesterEditor({ ...semesterEditor, status: event.target.value })}>{SEMESTER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Start date"><input type="date" value={semesterEditor.startDate || ''} onChange={(event) => setSemesterEditor({ ...semesterEditor, startDate: event.target.value })} /></Field><Field label="End date"><input type="date" value={semesterEditor.endDate || ''} onChange={(event) => setSemesterEditor({ ...semesterEditor, endDate: event.target.value })} /></Field></div><div className="semesterCourseEditor"><div className="cardHead"><div><h3>Saved courses</h3><p>Changing a grade or credit recalculates the semester automatically when saved.</p></div><button className="ghostBtn" type="button" onClick={() => setSemesterEditor((current) => ({ ...current, courses: [...current.courses, freshCourse()] }))}>Add course</button></div>{semesterEditor.courses.map((course) => <div className="semesterEditRow" key={course.id}><input aria-label="Course code" value={course.code || ''} onChange={(event) => updateSemesterCourse(course.id, { code: event.target.value })} placeholder="Code" /><input aria-label="Course title" value={course.name || ''} onChange={(event) => updateSemesterCourse(course.id, { name: event.target.value })} placeholder="Course title" /><input aria-label="Credit" type="number" min="0" step="0.5" value={course.credit ?? ''} onChange={(event) => updateSemesterCourse(course.id, { credit: event.target.value })} /><select aria-label="Grade" value={course.grade || ''} onChange={(event) => updateSemesterCourse(course.id, { grade: event.target.value })}><option value="">Grade</option>{gradeLabels.map(([grade, points]) => <option key={grade} value={grade}>{grade} ({Number(points).toFixed(2)})</option>)}</select><select aria-label="Retake course" value={course.retakeOf || ''} onChange={(event) => updateSemesterCourse(course.id, { retakeOf: event.target.value })}><option value="">Not retake</option>{retakeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><label className="compactCheck"><input type="checkbox" checked={!course.excludedFromCgpa} onChange={(event) => updateSemesterCourse(course.id, { excludedFromCgpa: !event.target.checked })} /> Count</label><button className="dangerBtn" type="button" onClick={() => setSemesterEditor((current) => ({ ...current, courses: current.courses.filter((item) => item.id !== course.id) }))}>Remove</button></div>)}</div></> : null}
      </Modal>

      <Modal open={settingsOpen} wide title="Custom grading scale" onClose={() => setSettingsOpen(false)} actions={<><button className="ghostBtn" type="button" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primaryBtn" type="button" onClick={saveSettings}>Save scale</button></>}>
        <div className="formGrid modalForm"><Field label="Scale name" full><input value={scaleName} onChange={(event) => setScaleName(event.target.value)} placeholder="My university 4.00 scale" /></Field></div>
        <div className="scaleEditor"><div className="cardHead"><div><h3>Grade points</h3><p>Labels must be unique; points must be between 0.00 and 4.00.</p></div><button className="ghostBtn" type="button" onClick={() => setScaleRows((rows) => [...rows, { id: uid(), label: '', points: 0 }])}>Add grade</button></div>{scaleRows.map((row) => <div className="scaleRow" key={row.id}><input aria-label="Grade label" value={row.label} onChange={(event) => setScaleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, label: event.target.value } : item))} placeholder="A+" /><input aria-label="Grade points" type="number" min="0" max="4" step="0.01" value={row.points} onChange={(event) => setScaleRows((rows) => rows.map((item) => item.id === row.id ? { ...item, points: event.target.value } : item))} /><button className="dangerBtn" type="button" onClick={() => setScaleRows((rows) => rows.filter((item) => item.id !== row.id))}>Remove</button></div>)}</div>
      </Modal>
    </>
  );
}
