import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { ATTENDANCE_STATUSES } from '../utils/attendance.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { nextRoutineOccurrenceISO, routineEventsForDate } from '../utils/calendar.js';
import { todayLocalISO } from '../utils/date.js';
import { cleanText, compareText, entityTimestamps, formatUpdated, hasTimeConflict, matchesSearch } from '../utils/entity.js';

const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const emptyRoutine = {
  title: '', type: 'Class', day: 'Saturday', startTime: '', endTime: '', room: '', teacher: '', description: '',
  courseId: '', courseCode: '', courseName: '', attendanceEnabled: true, validFrom: '', validUntil: '', reminderMinutes: 15,
};
const emptyException = {
  originalDate: '', status: 'Cancelled', newDate: '', newStartTime: '', newEndTime: '', newRoom: '', notes: '',
};
const reminderOptions = [
  { value: -1, label: 'No reminder' },
  { value: 0, label: 'At start time' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
];

const startOf = (item) => item.startTime || item.time || '';

export default function Routine({ api }) {
  const routines = api.data.routines || [];
  const routineExceptions = api.data.routineExceptions || [];
  const attendanceRecords = api.data.attendanceRecords || [];
  const catalog = useMemo(() => buildCourseCatalog(api.data.courses || [], api.data.semesters || []), [api.data.courses, api.data.semesters]);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayISO = todayLocalISO();
  const [query, setQuery] = useState('');
  const [day, setDay] = useState('All');
  const [type, setType] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [sort, setSort] = useState('day-time');
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [exceptionRoutine, setExceptionRoutine] = useState(null);
  const [exceptionDraft, setExceptionDraft] = useState(null);

  const closeForm = () => { setDraft(null); setEditingId(null); };
  const openAdd = () => { setEditingId(null); setDraft({ ...emptyRoutine }); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setDraft({ ...emptyRoutine, ...item, startTime: item.startTime || item.time || '', endTime: item.endTime || '' });
  };
  const selectCourse = (id) => {
    const course = catalog.find((item) => item.id === id);
    setDraft((current) => ({
      ...current,
      courseId: id,
      courseCode: course?.code || '',
      courseName: course?.name || '',
      title: course && !current.title ? courseLabel(course) : current.title,
      teacher: course && !current.teacher ? course.instructor || '' : current.teacher,
    }));
  };

  const saveRoutine = (event) => {
    event.preventDefault();
    const title = cleanText(draft?.title);
    if (!title || !draft?.day) return api.notify('Title and day are required.', 'warning', 'Schedule not saved');
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) return api.notify('End time must be later than start time.', 'warning', 'Invalid time range');
    if (draft.validFrom && draft.validUntil && draft.validUntil < draft.validFrom) return api.notify('Valid-until date must be after the start date.', 'warning', 'Invalid date range');
    if (hasTimeConflict(routines, draft, editingId)) return api.notify('This time overlaps another item on the same day.', 'warning', 'Schedule conflict');
    const course = catalog.find((item) => item.id === draft.courseId);
    const existing = routines.find((item) => item.id === editingId) || {};
    const next = {
      ...existing,
      ...draft,
      id: editingId || uid(),
      title,
      room: cleanText(draft.room),
      teacher: cleanText(draft.teacher),
      description: cleanText(draft.description),
      time: draft.startTime,
      courseCode: course?.code || draft.courseCode || '',
      courseName: course?.name || draft.courseName || '',
      attendanceEnabled: draft.type === 'Class' ? Boolean(draft.attendanceEnabled) : false,
      reminderMinutes: Number(draft.reminderMinutes),
      ...entityTimestamps(existing),
    };
    api.update('routines', editingId ? routines.map((item) => item.id === editingId ? next : item) : [...routines, next]);
    api.activity?.(`${editingId ? 'Routine updated' : 'Routine added'}: ${title}`);
    api.notify('Schedule item saved.', 'success');
    closeForm();
  };

  const remove = async (item) => {
    if (!await api.confirm({ title: 'Delete schedule item?', message: `“${item.title}” and its future exceptions will be removed. Existing attendance history will remain.`, confirmLabel: 'Delete item', danger: true })) return;
    api.update('routines', routines.filter((entry) => entry.id !== item.id));
    api.update('routineExceptions', routineExceptions.filter((entry) => entry.routineId !== item.id));
    api.notify('Schedule item deleted.', 'success');
  };

  const markAttendance = (item, status) => {
    if (!item.courseId) return api.notify('Link this class to an Academic course first.', 'warning', 'Course link required');
    if (!ATTENDANCE_STATUSES.includes(status)) return;
    const existing = attendanceRecords.find((record) => (record.sourceRoutineId === item.id && record.date === todayISO)
      || (record.courseId === item.courseId && record.date === todayISO && (record.session || 'Class') === 'Class'));
    const next = {
      ...(existing || {}),
      id: existing?.id || uid(),
      courseId: item.courseId,
      courseCode: item.courseCode || '',
      courseName: item.courseName || item.title,
      date: todayISO,
      status,
      session: item.type === 'Class' ? 'Class' : item.type,
      notes: existing?.notes || '',
      sourceRoutineId: item.id,
      ...entityTimestamps(existing || {}),
    };
    api.update('attendanceRecords', existing
      ? attendanceRecords.map((record) => record.id === existing.id ? next : record)
      : [...attendanceRecords, next]);
    api.activity?.(`Attendance marked: ${item.courseCode || item.courseName || item.title} · ${status}`);
    api.notify(`Today's class marked ${status}.`, 'success');
  };

  const openException = (item, originalDate = '') => {
    const nextDate = originalDate || nextRoutineOccurrenceISO(item, todayISO);
    const existing = routineExceptions.find((entry) => entry.routineId === item.id && entry.originalDate === nextDate);
    setExceptionRoutine(item);
    setExceptionDraft({ ...emptyException, ...(existing || {}), originalDate: nextDate });
  };

  const closeException = () => { setExceptionRoutine(null); setExceptionDraft(null); };

  const saveException = (event) => {
    event.preventDefault();
    if (!exceptionRoutine || !exceptionDraft?.originalDate) return api.notify('Choose the original routine date.', 'warning', 'Exception not saved');
    if (new Date(`${exceptionDraft.originalDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }) !== exceptionRoutine.day) {
      return api.notify(`The original date must be a ${exceptionRoutine.day}.`, 'warning', 'Date does not match routine');
    }
    if (exceptionDraft.status === 'Rescheduled' && !exceptionDraft.newDate) return api.notify('Choose a new date for the rescheduled class.', 'warning', 'New date required');
    if (exceptionDraft.newStartTime && exceptionDraft.newEndTime && exceptionDraft.newEndTime <= exceptionDraft.newStartTime) return api.notify('New end time must be later than the new start time.', 'warning', 'Invalid time range');
    const existing = routineExceptions.find((entry) => entry.routineId === exceptionRoutine.id && entry.originalDate === exceptionDraft.originalDate) || {};
    const next = {
      ...existing,
      ...exceptionDraft,
      id: existing.id || uid(),
      routineId: exceptionRoutine.id,
      newRoom: cleanText(exceptionDraft.newRoom),
      notes: cleanText(exceptionDraft.notes),
      ...entityTimestamps(existing),
    };
    api.update('routineExceptions', existing.id
      ? routineExceptions.map((entry) => entry.id === existing.id ? next : entry)
      : [...routineExceptions, next]);
    api.activity?.(`${exceptionDraft.status === 'Cancelled' ? 'Routine cancelled' : 'Routine rescheduled'}: ${exceptionRoutine.title} · ${exceptionDraft.originalDate}`);
    api.notify(`Routine occurrence ${exceptionDraft.status.toLowerCase()}.`, 'success');
    closeException();
  };

  const removeException = async (item) => {
    if (!await api.confirm({ title: 'Remove routine exception?', message: 'The original weekly routine occurrence will become active again.', confirmLabel: 'Remove exception', danger: true })) return;
    api.update('routineExceptions', routineExceptions.filter((entry) => entry.id !== item.id));
    api.notify('Routine exception removed.', 'success');
  };

  const visible = useMemo(() => routines.filter((item) => (
    (day === 'All' || item.day === day)
    && (type === 'All' || item.type === type)
    && (courseFilter === 'All' || item.courseId === courseFilter)
    && matchesSearch(query, item.title, item.type, item.day, item.room, item.teacher, item.courseCode, item.courseName)
  )).sort((a, b) => {
    if (sort === 'title') return compareText(a.title, b.title);
    if (sort === 'type') return compareText(a.type, b.type);
    const dayCompare = days.indexOf(a.day) - days.indexOf(b.day);
    return dayCompare || startOf(a).localeCompare(startOf(b));
  }), [courseFilter, day, query, routines, sort, type]);

  const todayEvents = routineEventsForDate(routines, routineExceptions, todayISO);
  const todayItems = todayEvents.map((event) => {
    const base = routines.find((item) => item.id === event.sourceId) || {};
    return { ...base, startTime: event.startTime, endTime: event.endTime, room: event.location || base.room, occurrenceStatus: event.status, originalDate: event.originalDate };
  }).sort((a, b) => startOf(a).localeCompare(startOf(b)));
  const todayClasses = todayItems.filter((item) => item.type === 'Class' && item.attendanceEnabled !== false && item.occurrenceStatus !== 'Cancelled');
  const markedToday = todayClasses.filter((item) => attendanceRecords.some((record) => record.sourceRoutineId === item.id && record.date === todayISO)).length;
  const types = ['All', ...new Set(routines.map((item) => item.type).filter(Boolean))];
  const upcomingExceptions = routineExceptions.filter((item) => (item.newDate || item.originalDate) >= todayISO).sort((a, b) => (a.newDate || a.originalDate).localeCompare(b.newDate || b.originalDate));

  return (
    <>
      <Header title="Routine & Course Schedule" subtitle="Manage recurring weekly classes, attendance and one-date cancellations or reschedules." />
      <section className="statsGrid five">
        <StatCard label="Total Items" value={routines.length} note="weekly routine blocks" />
        <StatCard label="Today" value={todayItems.length} note={today} tone="green" />
        <StatCard label="Linked Classes" value={routines.filter((item) => item.type === 'Class' && item.courseId).length} note="connected to courses" tone="purple" />
        <StatCard label="Marked Today" value={`${markedToday}/${todayClasses.length}`} note="attendance-ready classes" tone="orange" />
        <StatCard label="Exceptions" value={upcomingExceptions.length} note="upcoming changes" tone="blue" />
      </section>
      <section className="twoCol wideLeft">
        <Card>
          <div className="cardHead"><div><h3>Weekly Routine</h3><p>Search and manage recurring classes, study blocks and personal plans.</p></div><button type="button" className="primaryBtn" onClick={openAdd}>Add Schedule</button></div>
          <CrudToolbar
            query={query}
            onQueryChange={setQuery}
            count={visible.length}
            queryPlaceholder="Search title, course, room or teacher"
            filters={[
              { label: 'Day', value: day, onChange: setDay, options: ['All', ...days] },
              { label: 'Type', value: type, onChange: setType, options: types },
              { label: 'Course', value: courseFilter, onChange: setCourseFilter, options: [{ value: 'All', label: 'All courses' }, ...catalog.map((course) => ({ value: course.id, label: courseLabel(course) }))] },
            ]}
            sortValue={sort}
            onSortChange={setSort}
            sortOptions={[{ value: 'day-time', label: 'Day and time' }, { value: 'title', label: 'Title' }, { value: 'type', label: 'Type' }]}
          />
        </Card>
        <Card>
          <h3>Today's Schedule</h3>
          {todayItems.length === 0 ? <EmptyState title="No routine today" text="Add a schedule item for today to show it here." /> : <div className="todayRoutineList">{todayItems.map((item) => {
            const todayRecord = attendanceRecords.find((record) => record.sourceRoutineId === item.id && record.date === todayISO);
            return <article className={`todayRoutineItem ${item.occurrenceStatus === 'Cancelled' ? 'cancelledRoutine' : ''}`} key={`${item.id}-${item.originalDate}`}><div><strong>{startOf(item) || 'Anytime'} · {item.title}</strong><span>{item.courseCode || item.type}{item.occurrenceStatus && item.occurrenceStatus !== 'Scheduled' ? ` · ${item.occurrenceStatus}` : ''}{todayRecord ? ` · ${todayRecord.status}` : ''}</span></div>{item.type === 'Class' && item.attendanceEnabled !== false && item.occurrenceStatus !== 'Cancelled' ? <div className="quickAttendance"><button type="button" onClick={() => markAttendance(item, 'Present')}>Present</button><button type="button" onClick={() => markAttendance(item, 'Absent')}>Absent</button><button type="button" onClick={() => markAttendance(item, 'Late')}>Late</button><button type="button" onClick={() => markAttendance(item, 'Cancelled')}>Cancel</button></div> : null}</article>;
          })}</div>}
        </Card>
      </section>
      <Card>
        {visible.length === 0 ? <EmptyState title="No matching routine" text="Add a schedule item or change the current filters." /> : <div className="itemGrid">{visible.map((item) => <article className="itemCard" key={item.id}>
          <div className="inlinePills"><span className="pill">{item.type || 'Schedule'}</span><span className="pill subtle">{item.day}</span>{item.courseId ? <span className="pill successPill">Linked</span> : null}</div>
          <h4>{item.title}</h4><p>{startOf(item) || 'Anytime'}{item.endTime ? `–${item.endTime}` : ''}</p><p>{item.courseCode || 'No course'} · {item.room || 'No room'} · {item.teacher || 'No teacher'}</p>
          <div className="itemActions"><button type="button" className="ghostBtn" onClick={() => openException(item)}>Cancel / Reschedule</button></div>
          <ItemActions onView={() => setViewing(item)} onEdit={() => openEdit(item)} onDelete={() => remove(item)} />
        </article>)}</div>}
      </Card>

      <Card>
        <div className="cardHead"><div><h3>Upcoming Routine Changes</h3><p>One-date cancellations and rescheduled occurrences.</p></div></div>
        {upcomingExceptions.length === 0 ? <EmptyState title="No routine changes" text="Use Cancel / Reschedule on any weekly routine item." /> : <div className="exceptionList">{upcomingExceptions.map((item) => {
          const routine = routines.find((entry) => entry.id === item.routineId);
          return <article key={item.id}><div><span className={`pill ${item.status === 'Cancelled' ? 'warningPill' : 'successPill'}`}>{item.status}</span><strong>{routine?.title || 'Removed routine'}</strong><p>{item.originalDate}{item.status === 'Rescheduled' ? ` → ${item.newDate} ${item.newStartTime || routine?.startTime || ''}` : ''}{item.newRoom ? ` · ${item.newRoom}` : ''}</p></div><div className="itemActions">{routine ? <button type="button" className="ghostBtn" onClick={() => openException(routine, item.originalDate)}>Edit</button> : null}<button type="button" className="dangerBtn" onClick={() => removeException(item)}>Remove</button></div></article>;
        })}</div>}
      </Card>

      <Modal open={Boolean(draft)} wide title={editingId ? 'Edit Schedule Item' : 'Add Schedule Item'} onClose={closeForm} actions={<><button type="button" className="ghostBtn" onClick={closeForm}>Cancel</button><button type="submit" form="routine-form" className="primaryBtn">Save Schedule</button></>}>
        {draft ? <form id="routine-form" className="formGrid modalForm" onSubmit={saveRoutine}>
          <Field label="Title" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Class, study or event title" autoFocus /></Field>
          <Field label="Type"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value, attendanceEnabled: event.target.value === 'Class' ? draft.attendanceEnabled : false })}><option>Class</option><option>Study</option><option>Personal</option><option>Exam</option><option>Other</option></select></Field>
          <Field label="Academic course"><select value={draft.courseId || ''} onChange={(event) => selectCourse(event.target.value)}><option value="">Not linked</option>{catalog.map((course) => <option value={course.id} key={course.id}>{courseLabel(course)}</option>)}</select></Field>
          <Field label="Day"><select value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })}>{days.map((name) => <option key={name}>{name}</option>)}</select></Field>
          <Field label="Start time"><input type="time" value={draft.startTime || ''} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field>
          <Field label="End time"><input type="time" value={draft.endTime || ''} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></Field>
          <Field label="Active from"><input type="date" value={draft.validFrom || ''} onChange={(event) => setDraft({ ...draft, validFrom: event.target.value })} /></Field>
          <Field label="Active until"><input type="date" value={draft.validUntil || ''} onChange={(event) => setDraft({ ...draft, validUntil: event.target.value })} /></Field>
          <Field label="Reminder"><select value={draft.reminderMinutes} onChange={(event) => setDraft({ ...draft, reminderMinutes: Number(event.target.value) })}>{reminderOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Room"><input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} placeholder="Room or location" /></Field>
          <Field label="Teacher"><input value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} placeholder="Instructor name" /></Field>
          {draft.type === 'Class' ? <Field label="Attendance tracking" full><label className="checkRow"><input type="checkbox" checked={Boolean(draft.attendanceEnabled)} onChange={(event) => setDraft({ ...draft, attendanceEnabled: event.target.checked })} /><span>Allow quick attendance marking for this class</span></label></Field> : null}
          <Field label="Description" full><textarea rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Optional notes" /></Field>
        </form> : null}
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing?.title || 'Schedule details'} onClose={() => setViewing(null)} actions={<><button type="button" className="ghostBtn" onClick={() => { openException(viewing); setViewing(null); }}>Cancel / Reschedule</button><button type="button" className="primaryBtn" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Schedule</button></>}>
        {viewing ? <DetailGrid rows={[{ label: 'Type', value: viewing.type || 'Schedule' }, { label: 'Course', value: viewing.courseId ? courseLabel(viewing) : 'Not linked', full: true }, { label: 'Day', value: viewing.day }, { label: 'Time', value: `${startOf(viewing) || 'Anytime'}${viewing.endTime ? `–${viewing.endTime}` : ''}` }, { label: 'Active range', value: `${viewing.validFrom || 'Any date'} – ${viewing.validUntil || 'No end date'}`, full: true }, { label: 'Room', value: viewing.room || 'Not set' }, { label: 'Teacher', value: viewing.teacher || 'Not set' }, { label: 'Reminder', value: reminderOptions.find((item) => item.value === Number(viewing.reminderMinutes))?.label || 'Custom' }, { label: 'Attendance', value: viewing.type === 'Class' && viewing.attendanceEnabled !== false ? 'Quick marking enabled' : 'Not enabled' }, { label: 'Description', value: viewing.description || 'No description', full: true }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} /> : null}
      </Modal>

      <Modal open={Boolean(exceptionDraft)} wide title={`Change occurrence · ${exceptionRoutine?.title || ''}`} onClose={closeException} actions={<><button type="button" className="ghostBtn" onClick={closeException}>Cancel</button><button type="submit" form="routine-exception-form" className="primaryBtn">Save Change</button></>}>
        {exceptionDraft ? <form id="routine-exception-form" className="formGrid modalForm" onSubmit={saveException}>
          <Field label={`Original ${exceptionRoutine?.day || ''} date`}><input type="date" value={exceptionDraft.originalDate} onChange={(event) => setExceptionDraft({ ...exceptionDraft, originalDate: event.target.value })} /></Field>
          <Field label="Action"><select value={exceptionDraft.status} onChange={(event) => setExceptionDraft({ ...exceptionDraft, status: event.target.value })}><option>Cancelled</option><option>Rescheduled</option></select></Field>
          {exceptionDraft.status === 'Rescheduled' ? <>
            <Field label="New date"><input type="date" value={exceptionDraft.newDate} onChange={(event) => setExceptionDraft({ ...exceptionDraft, newDate: event.target.value })} /></Field>
            <Field label="New start time"><input type="time" value={exceptionDraft.newStartTime} onChange={(event) => setExceptionDraft({ ...exceptionDraft, newStartTime: event.target.value })} /></Field>
            <Field label="New end time"><input type="time" value={exceptionDraft.newEndTime} onChange={(event) => setExceptionDraft({ ...exceptionDraft, newEndTime: event.target.value })} /></Field>
            <Field label="New room"><input value={exceptionDraft.newRoom} onChange={(event) => setExceptionDraft({ ...exceptionDraft, newRoom: event.target.value })} placeholder={exceptionRoutine?.room || 'Room or location'} /></Field>
          </> : null}
          <Field label="Reason / notes" full><textarea rows="4" value={exceptionDraft.notes} onChange={(event) => setExceptionDraft({ ...exceptionDraft, notes: event.target.value })} placeholder="Why this occurrence changed" /></Field>
        </form> : null}
      </Modal>
    </>
  );
}
