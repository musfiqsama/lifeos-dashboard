import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { todayLocalISO } from '../utils/date.js';
import { clampNumber, cleanText, compareDate, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';

const emptyLog = {
  date: todayLocalISO(), startTime: '', endTime: '', subject: '', topic: '', minutes: 60, rating: 3, notes: '',
  courseId: '', taskId: '', method: 'Focused Study', location: '', distractionLevel: 2, source: 'manual', focusSessionId: '',
};

function minutesFromTimes(start, end) {
  if (!start || !end) return null;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const value = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return value > 0 ? value : null;
}

export default function Analyzer({ api }) {
  const logs = api.data.studyLogs || [];
  const tasks = api.data.tasks || [];
  const courseCatalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState('All');
  const [method, setMethod] = useState('All');
  const [sort, setSort] = useState('date-desc');
  const [draft, setDraft] = useState(emptyLog);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const closeForm = () => { setDraft(emptyLog); setEditingId(null); };
  const openEdit = (log) => { setEditingId(log.id); setDraft({ ...emptyLog, ...log, rating: log.rating || 3, distractionLevel: log.distractionLevel || 2 }); };
  const saveLog = (event) => {
    event.preventDefault();
    const derivedMinutes = minutesFromTimes(draft.startTime, draft.endTime);
    if (draft.startTime && draft.endTime && !derivedMinutes) return api.notify('End time must be after start time.', 'warning', 'Study log not saved');
    const minutes = Math.round(derivedMinutes || Number(draft.minutes));
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) return api.notify('Study duration must be between 1 and 1,440 minutes.', 'warning', 'Study log not saved');
    const existing = logs.find((log) => log.id === editingId) || {};
    const linkedCourse = courseCatalog.find((course) => course.id === draft.courseId);
    const linkedTask = tasks.find((task) => task.id === draft.taskId);
    const subject = cleanText(draft.subject) || linkedCourse?.name || linkedTask?.title || 'Study Session';
    const next = {
      ...existing, ...draft, id: editingId || uid(), subject, topic: cleanText(draft.topic), notes: cleanText(draft.notes), location: cleanText(draft.location),
      minutes, hours: Number((minutes / 60).toFixed(2)), rating: clampNumber(draft.rating, 1, 5), distractionLevel: clampNumber(draft.distractionLevel, 1, 5),
      date: draft.date || todayLocalISO(), source: existing.source === 'pomodoro' ? 'pomodoro' : 'manual', ...entityTimestamps(existing),
    };
    api.update('studyLogs', editingId ? logs.map((log) => log.id === editingId ? next : log) : [...logs, next]);
    api.activity?.(`${editingId ? 'Study log updated' : 'Study log added'}: ${minutes} min`);
    api.notify('Study log saved.', 'success');
    closeForm();
  };
  const remove = async (log) => {
    if (!await api.confirm({ title: 'Delete study log?', message: `${log.minutes || Math.round(Number(log.hours || 0) * 60)} minutes from ${log.date} will be removed. Focus history remains separate.`, confirmLabel: 'Delete log', danger: true })) return;
    api.update('studyLogs', logs.filter((item) => item.id !== log.id));
    api.notify('Study log deleted.', 'success');
  };

  const methods = ['All', ...new Set(logs.map((log) => log.method).filter(Boolean))];
  const visible = useMemo(() => logs.filter((log) => (
    (rating === 'All' || Number(log.rating || 0) === Number(rating))
    && (method === 'All' || log.method === method)
    && matchesSearch(query, log.subject, log.topic, log.notes, log.date, log.method, log.location)
  )).sort((a, b) => {
    if (sort === 'subject') return compareText(a.subject, b.subject);
    if (sort === 'duration') return Number(b.minutes || 0) - Number(a.minutes || 0);
    if (sort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
    if (sort === 'date-asc') return compareDate(a.date, b.date);
    return compareDate(b.date, a.date);
  }), [logs, method, query, rating, sort]);

  const totalMinutes = logs.reduce((sum, log) => sum + Number(log.minutes || Number(log.hours || 0) * 60), 0);
  const avgMinutes = logs.length ? totalMinutes / logs.length : 0;
  const ratingAvg = logs.length ? logs.reduce((sum, log) => sum + Number(log.rating || 0), 0) / logs.length : 0;
  const distractionAvg = logs.length ? logs.reduce((sum, log) => sum + Number(log.distractionLevel || 0), 0) / logs.length : 0;
  const score = logs.length ? Math.min(100, Math.round((ratingAvg / 5) * 65 + ((6 - distractionAvg) / 5) * 35)) : 0;
  const chartData = [...logs].sort((a, b) => compareDate(a.date, b.date)).slice(-7).map((log) => ({ name: log.date?.slice(5) || '--', Minutes: Number(log.minutes || Number(log.hours || 0) * 60) }));
  const courseMinutes = courseCatalog.map((course) => ({ ...course, minutes: logs.filter((log) => log.courseId === course.id).reduce((sum, log) => sum + Number(log.minutes || 0), 0) })).filter((course) => course.minutes).sort((a, b) => b.minutes - a.minutes);
  const formOpen = editingId !== null || draft !== emptyLog;
  const linkedCourseLabel = (log) => courseLabel(courseCatalog.find((course) => course.id === log.courseId) || {});
  const linkedTaskTitle = (log) => tasks.find((task) => task.id === log.taskId)?.title || 'Not linked';

  return (
    <>
      <Header title="Advanced Study Analyzer" subtitle="Connect study sessions to courses and tasks, track methods, focus quality and distraction." />
      <section className="statsGrid four">
        <StatCard label="Study Time" value={`${(totalMinutes / 60).toFixed(1)}h`} note={`${totalMinutes} total minutes`} tone="blue" />
        <StatCard label="Average Session" value={`${Math.round(avgMinutes)}m`} note={`${logs.length} logs`} tone="green" />
        <StatCard label="Focus Quality" value={`${score}%`} note={`${ratingAvg.toFixed(1)}/5 rating`} tone="purple" />
        <StatCard label="Top Course" value={courseMinutes[0]?.code || courseMinutes[0]?.name || '—'} note={courseMinutes[0] ? `${courseMinutes[0].minutes} minutes` : 'No linked sessions'} tone="orange" />
      </section>
      <section className="twoCol wideLeft">
        <Card><div className="cardHead"><div><h3>Study Logs</h3><p>Manual and Pomodoro sessions share one analytics timeline.</p></div><button type="button" className="primaryBtn" onClick={() => setDraft({ ...emptyLog, date: todayLocalISO() })}>Add Log</button></div><CrudToolbar query={query} onQueryChange={setQuery} count={visible.length} queryPlaceholder="Search subject, topic, method or notes" filters={[{ label: 'Rating', value: rating, onChange: setRating, options: ['All', '1', '2', '3', '4', '5'] }, { label: 'Method', value: method, onChange: setMethod, options: methods }]} sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'date-desc', label: 'Newest first' }, { value: 'date-asc', label: 'Oldest first' }, { value: 'duration', label: 'Longest sessions' }, { value: 'rating', label: 'Highest rating' }, { value: 'subject', label: 'Subject' }]} /></Card>
        <Card><h3>Recent Session Minutes</h3>{chartData.length === 0 ? <EmptyState title="No study logs" text="Add a study session to see the chart." /> : <div className="chartBox"><ResponsiveContainer width="100%" height={230}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="Minutes" radius={[10, 10, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Card>
      </section>
      <Card>{visible.length === 0 ? <EmptyState title="No matching study logs" text="Add a session or change the current search and filters." /> : <div className="taskList crudList">{visible.map((log) => <article className="taskItem taskItemExpanded" key={log.id}>
        <div className="pill">{log.minutes || Math.round(Number(log.hours || 0) * 60)}m</div><div><div className="inlinePills"><span className="pill subtle">{log.method || 'Focused Study'}</span>{log.source === 'pomodoro' ? <span className="pill">Pomodoro</span> : null}</div><h4>{log.subject || 'Study Session'}</h4><p>{log.topic || 'No topic'} · {log.date} · Rating {log.rating || 3}/5 · Distraction {log.distractionLevel || 2}/5</p></div><ItemActions onView={() => setViewing(log)} onEdit={() => openEdit(log)} onDelete={() => remove(log)} />
      </article>)}</div>}</Card>
      <Modal open={Boolean(formOpen)} wide title={editingId ? 'Edit Study Log' : 'Add Study Log'} onClose={closeForm} actions={<><button type="button" className="ghostBtn" onClick={closeForm}>Cancel</button><button type="submit" form="study-log-form" className="primaryBtn">Save Log</button></>}>
        <form id="study-log-form" className="formGrid modalForm" onSubmit={saveLog}>
          <Field label="Course link"><select value={draft.courseId || ''} onChange={(event) => setDraft({ ...draft, courseId: event.target.value })}><option value="">Not linked</option>{courseCatalog.map((course) => <option key={course.id} value={course.id}>{courseLabel(course)}</option>)}</select></Field>
          <Field label="Task link"><select value={draft.taskId || ''} onChange={(event) => setDraft({ ...draft, taskId: event.target.value })}><option value="">Not linked</option>{tasks.filter((task) => task.status !== 'Archived').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
          <Field label="Subject"><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Defaults to linked course/task" autoFocus /></Field>
          <Field label="Topic"><input value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="What did you study?" /></Field>
          <Field label="Date"><input type="date" value={draft.date || ''} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
          <Field label="Duration (minutes)" hint="Start/end time overrides this value"><input type="number" min="1" max="1440" value={draft.minutes} onChange={(event) => setDraft({ ...draft, minutes: event.target.value })} /></Field>
          <Field label="Start time"><input type="time" value={draft.startTime || ''} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field>
          <Field label="End time"><input type="time" value={draft.endTime || ''} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></Field>
          <Field label="Study method"><select value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })}><option>Focused Study</option><option>Pomodoro</option><option>Active Recall</option><option>Practice Problems</option><option>Reading</option><option>Revision</option><option>Group Study</option><option>Lecture</option><option>Other</option></select></Field>
          <Field label="Location"><input value={draft.location || ''} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Library, home, classroom..." /></Field>
          <Field label="Productivity rating"><select value={draft.rating} onChange={(event) => setDraft({ ...draft, rating: event.target.value })}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></Field>
          <Field label="Distraction level"><select value={draft.distractionLevel} onChange={(event) => setDraft({ ...draft, distractionLevel: event.target.value })}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></Field>
          <Field label="Notes" full><textarea rows="5" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What worked well or needs improvement?" /></Field>
        </form>
      </Modal>
      <Modal open={Boolean(viewing)} wide title={viewing?.subject || 'Study log details'} onClose={() => setViewing(null)} actions={<button type="button" className="primaryBtn" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Log</button>}>
        {viewing ? <DetailGrid rows={[{ label: 'Topic', value: viewing.topic || 'Not set', full: true }, { label: 'Course', value: viewing.courseId ? linkedCourseLabel(viewing) : 'Not linked' }, { label: 'Task', value: linkedTaskTitle(viewing) }, { label: 'Date', value: viewing.date }, { label: 'Duration', value: `${viewing.minutes || Math.round(Number(viewing.hours || 0) * 60)} minutes` }, { label: 'Time', value: viewing.startTime && viewing.endTime ? `${viewing.startTime}–${viewing.endTime}` : 'Not recorded' }, { label: 'Method', value: viewing.method || 'Focused Study' }, { label: 'Location', value: viewing.location || 'Not set' }, { label: 'Rating', value: `${viewing.rating || 3}/5` }, { label: 'Distraction', value: `${viewing.distractionLevel || 2}/5` }, { label: 'Source', value: viewing.source || 'manual' }, { label: 'Notes', value: viewing.notes || 'No notes', full: true }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} /> : null}
      </Modal>
    </>
  );
}
