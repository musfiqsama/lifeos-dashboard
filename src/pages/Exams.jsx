import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { ChecklistEditor, CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { daysUntil } from '../utils/date.js';
import { cleanText, compareDate, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { buildCourseCatalog } from '../utils/courses.js';
import { examPreparationProgress, normalizeChecklist } from '../utils/planning.js';

const emptyExam = { title: '', subject: '', courseId: '', type: 'Quiz', date: '', time: '', room: '', priority: 'Medium', notes: '', preparationStatus: 'Not Started', preparationProgress: 0, reminderMinutes: 1440, syllabus: [] };
const left = (exam) => daysUntil(exam.date);
const examStatus = (exam) => left(exam) === null ? 'Unscheduled' : left(exam) < 0 ? 'Completed' : 'Upcoming';

export default function Exams({ api }) {
  const exams = api.data.exams || [];
  const tasks = api.data.tasks || [];
  const courseCatalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');
  const [sort, setSort] = useState('date');
  const [draft, setDraft] = useState(emptyExam);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const closeForm = () => { setDraft(emptyExam); setEditingId(null); };
  const openEdit = (exam) => { setEditingId(exam.id); setDraft({ ...emptyExam, ...exam, syllabus: normalizeChecklist(exam.syllabus) }); };

  const saveExam = (event) => {
    event.preventDefault();
    const title = cleanText(draft.title);
    if (!title || !draft.date) return api.notify('Exam title and date are required.', 'warning', 'Exam not saved');
    const existing = exams.find((exam) => exam.id === editingId) || {};
    const selectedCourse = courseCatalog.find((course) => course.id === draft.courseId);
    const syllabus = normalizeChecklist(draft.syllabus);
    const progress = syllabus.length ? examPreparationProgress({ syllabus }) : Math.min(100, Math.max(0, Number(draft.preparationProgress) || 0));
    const next = {
      ...existing, ...draft, id: editingId || uid(), title,
      subject: cleanText(draft.subject) || selectedCourse?.name || '', room: cleanText(draft.room), notes: cleanText(draft.notes), syllabus,
      preparationProgress: progress,
      reminderMinutes: Math.max(-1, Number(draft.reminderMinutes ?? 1440)),
      preparationStatus: progress >= 100 ? 'Ready' : progress > 0 ? 'In Progress' : (draft.preparationStatus || 'Not Started'),
      ...entityTimestamps(existing),
    };
    api.update('exams', editingId ? exams.map((exam) => exam.id === editingId ? next : exam) : [...exams, next]);
    api.activity?.(`${editingId ? 'Exam updated' : 'Exam added'}: ${title}`);
    api.notify('Exam saved successfully.', 'success');
    closeForm();
  };

  const toggleSyllabus = (exam, itemId) => {
    const syllabus = normalizeChecklist(exam.syllabus).map((item) => item.id === itemId ? { ...item, done: !item.done } : item);
    const preparationProgress = examPreparationProgress({ syllabus });
    const preparationStatus = preparationProgress >= 100 ? 'Ready' : preparationProgress > 0 ? 'In Progress' : 'Not Started';
    api.update('exams', exams.map((item) => item.id === exam.id ? { ...item, syllabus, preparationProgress, preparationStatus, ...entityTimestamps(item) } : item));
  };

  const createPrepTask = (exam) => {
    const incomplete = normalizeChecklist(exam.syllabus).filter((item) => !item.done);
    const subtaskSource = incomplete.length ? incomplete : [{ id: uid(), title: `Review ${exam.subject || exam.title}`, done: false }];
    const duplicate = tasks.some((task) => task.examId === exam.id && task.status !== 'Completed' && task.status !== 'Archived');
    if (duplicate) return api.notify('An active preparation task already exists for this exam.', 'info', 'Task already linked');
    const task = {
      id: uid(), title: `Prepare for ${exam.title}`, description: exam.notes || `Study plan for ${exam.subject || exam.title}`,
      category: 'Study', priority: exam.priority || 'High', startDate: '', due: exam.date, dueTime: exam.time || '', status: 'Pending', done: false,
      courseId: exam.courseId || '', goalId: '', examId: exam.id, recurrence: 'None', estimatedMinutes: Math.max(60, incomplete.length * 45), resourceUrl: '', reminderMinutes: Number(exam.reminderMinutes ?? 1440), progress: 0,
      subtasks: subtaskSource.map((item) => ({ ...item, id: uid(), done: false })), ...entityTimestamps(),
    };
    api.update('tasks', [...tasks, task]);
    api.notify('Exam preparation task created with syllabus subtasks.', 'success', 'Task created');
  };

  const remove = async (exam) => {
    if (!await api.confirm({ title: 'Delete exam?', message: `“${exam.title}” will be removed. Existing preparation tasks will remain.`, confirmLabel: 'Delete exam', danger: true })) return;
    api.update('exams', exams.filter((item) => item.id !== exam.id));
    api.notify('Exam deleted.', 'success');
  };

  const visible = useMemo(() => exams.filter((exam) => (
    (status === 'All' || examStatus(exam) === status || exam.preparationStatus === status)
    && (priority === 'All' || exam.priority === priority)
    && matchesSearch(query, exam.title, exam.subject, exam.type, exam.room, exam.notes, exam.syllabus?.map((item) => item.title))
  )).sort((a, b) => {
    if (sort === 'title') return compareText(a.title, b.title);
    if (sort === 'priority') return compareText(a.priority, b.priority);
    if (sort === 'preparation') return examPreparationProgress(a) - examPreparationProgress(b);
    if (sort === 'updated') return compareDate(b.updatedAt || '', a.updatedAt || '');
    return compareDate(a.date || '9999', b.date || '9999') || (a.time || '').localeCompare(b.time || '');
  }), [exams, priority, query, sort, status]);

  const upcoming = exams.filter((exam) => examStatus(exam) === 'Upcoming').sort((a, b) => compareDate(a.date, b.date));
  const ready = upcoming.filter((exam) => examPreparationProgress(exam) >= 100).length;
  const atRisk = upcoming.filter((exam) => (left(exam) ?? 999) <= 7 && examPreparationProgress(exam) < 60).length;
  const nearest = upcoming[0];
  const formOpen = editingId !== null || draft !== emptyExam;
  const courseName = (exam) => courseCatalog.find((course) => course.id === exam.courseId)?.name || exam.subject || 'Not linked';

  return (
    <>
      <Header title="Exam Preparation Planner" subtitle="Track countdowns, syllabus coverage and preparation tasks from one place." />
      <section className="statsGrid four">
        <StatCard label="Upcoming" value={upcoming.length} note="scheduled exams" />
        <StatCard label="Ready" value={ready} note="100% syllabus covered" tone="green" />
        <StatCard label="Prep Risk" value={atRisk} note="within 7 days, below 60%" tone="orange" />
        <StatCard label="Nearest" value={nearest ? `${left(nearest)}d` : '0d'} note={nearest?.title || 'No exam'} tone="purple" />
      </section>
      <Card>
        <div className="cardHead"><div><h3>Exam Plans</h3><p>Connect exams to courses, split syllabus into checklists and create preparation tasks.</p></div><button type="button" className="primaryBtn" onClick={() => setDraft({ ...emptyExam, syllabus: [] })}>Add Exam</button></div>
        <CrudToolbar query={query} onQueryChange={setQuery} count={visible.length} queryPlaceholder="Search exam, syllabus or room"
          filters={[{ label: 'Status', value: status, onChange: setStatus, options: ['All', 'Upcoming', 'Completed', 'Unscheduled', 'Not Started', 'In Progress', 'Ready'] }, { label: 'Priority', value: priority, onChange: setPriority, options: ['All', 'High', 'Medium', 'Low'] }]}
          sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'date', label: 'Exam date' }, { value: 'preparation', label: 'Preparation: lowest first' }, { value: 'title', label: 'Title' }, { value: 'priority', label: 'Priority' }, { value: 'updated', label: 'Recently updated' }]} />
        {visible.length === 0 ? <EmptyState title="No matching exams" text="Create an exam or change the current filters." /> : <div className="itemGrid">{visible.map((exam) => {
          const progress = examPreparationProgress(exam);
          return <article className="itemCard" key={exam.id}>
            <div className="inlinePills"><span className="pill">{exam.type || 'Exam'}</span><span className="pill subtle">{exam.priority || 'Medium'}</span><span className="pill subtle">{exam.preparationStatus || 'Not Started'}</span></div>
            <h4>{exam.title}</h4><p>{courseName(exam)} · {exam.date || 'No date'} {exam.time || ''}</p>
            <div className="summarySmall">{examStatus(exam) === 'Upcoming' ? `${left(exam)} days left` : examStatus(exam)}</div>
            <div className="progress compactProgress"><span style={{ width: `${progress}%` }} /></div><p>{progress}% prepared · {normalizeChecklist(exam.syllabus).filter((item) => item.done).length}/{normalizeChecklist(exam.syllabus).length} syllabus items</p>
            <button type="button" className="ghostBtn full" onClick={() => createPrepTask(exam)}>Create Preparation Task</button>
            <ItemActions onView={() => setViewing(exam)} onEdit={() => openEdit(exam)} onDelete={() => remove(exam)} />
          </article>;
        })}</div>}
      </Card>

      <Modal open={Boolean(formOpen)} wide title={editingId ? 'Edit Exam Plan' : 'Add Exam Plan'} onClose={closeForm} actions={<><button type="button" className="ghostBtn" onClick={closeForm}>Cancel</button><button type="submit" form="exam-form" className="primaryBtn">Save Exam</button></>}>
        <form id="exam-form" className="formGrid modalForm" onSubmit={saveExam}>
          <Field label="Exam title" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Exam name" autoFocus /></Field>
          <Field label="Course link"><select value={draft.courseId || ''} onChange={(event) => { const course = courseCatalog.find((item) => item.id === event.target.value); setDraft({ ...draft, courseId: event.target.value, subject: course?.name || draft.subject }); }}><option value="">Not linked</option>{courseCatalog.map((course) => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ''}{course.name}</option>)}</select></Field>
          <Field label="Subject fallback"><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Course or subject" /></Field>
          <Field label="Exam type"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option>Quiz</option><option>Midterm</option><option>Final</option><option>Viva</option><option>Lab</option><option>Other</option></select></Field>
          <Field label="Priority"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
          <Field label="Date"><input type="date" value={draft.date || ''} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
          <Field label="Time"><input type="time" value={draft.time || ''} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></Field>
          <Field label="Reminder"><select value={draft.reminderMinutes ?? 1440} onChange={(event) => setDraft({ ...draft, reminderMinutes: Number(event.target.value) })}><option value="-1">No reminder</option><option value="0">At exam time</option><option value="60">1 hour before</option><option value="180">3 hours before</option><option value="1440">1 day before</option><option value="2880">2 days before</option></select></Field>
          <Field label="Room"><input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} placeholder="Room or location" /></Field>
          <Field label="Manual preparation" hint="Used only when no syllabus checklist exists"><input type="number" min="0" max="100" value={draft.preparationProgress || 0} onChange={(event) => setDraft({ ...draft, preparationProgress: event.target.value })} /></Field>
          <Field label="Notes" full><textarea rows="4" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Instructions, resources or preparation notes" /></Field>
          <Field label="Syllabus checklist" full><ChecklistEditor items={draft.syllabus || []} onChange={(syllabus) => setDraft({ ...draft, syllabus })} addLabel="Add syllabus topic" itemPlaceholder="Topic or chapter" /></Field>
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} wide title={viewing?.title || 'Exam details'} onClose={() => setViewing(null)} actions={<button type="button" className="primaryBtn" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Exam</button>}>
        {viewing ? <><DetailGrid rows={[{ label: 'Course', value: courseName(viewing) }, { label: 'Type', value: viewing.type || 'Exam' }, { label: 'Exam status', value: examStatus(viewing) }, { label: 'Preparation', value: `${examPreparationProgress(viewing)}% · ${viewing.preparationStatus || 'Not Started'}` }, { label: 'Priority', value: viewing.priority || 'Medium' }, { label: 'Date', value: viewing.date }, { label: 'Time', value: viewing.time || 'Not set' }, { label: 'Room', value: viewing.room || 'Not set' }, { label: 'Reminder', value: Number(viewing.reminderMinutes) < 0 ? 'Disabled' : `${viewing.reminderMinutes || 0} minutes before` }, { label: 'Notes', value: viewing.notes || 'No notes', full: true }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} />
          {normalizeChecklist(viewing.syllabus).length ? <div className="detailChecklist"><h4>Syllabus coverage</h4>{normalizeChecklist(viewing.syllabus).map((item) => <label key={item.id}><input type="checkbox" checked={item.done} onChange={() => toggleSyllabus(viewing, item.id)} /><span>{item.title}</span></label>)}</div> : null}</> : null}
      </Modal>
    </>
  );
}
