import { Fragment, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { DetailGrid } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { currentHabitStreak } from '../utils/habits.js';
import { normalizeTags, stripMarkdown } from '../utils/knowledge.js';
import { examPreparationProgress, goalProgress, taskProgress } from '../utils/planning.js';

const TYPE_ICONS = {
  Course: '🎓', Semester: '📚', Task: '✅', Goal: '🎯', Note: '📝', Resource: '🔗', Habit: '🔥', Exam: '🏆', Routine: '📅', Attendance: '📋', 'Study Log': '📊', 'Focus Session': '⏱️', 'Calendar Event': '🗓️', 'Routine Change': '🔁',
};

function safe(value) { return String(value ?? '').trim(); }
function snippet(value, length = 180) { const text = safe(value).replace(/\s+/g, ' '); return text.length > length ? `${text.slice(0, length - 1)}…` : text; }
function highlight(text, query) {
  const source = safe(text);
  const term = safe(query);
  if (!term) return source;
  const lower = source.toLowerCase();
  const needle = term.toLowerCase();
  const nodes = [];
  let cursor = 0;
  let match = lower.indexOf(needle, cursor);
  while (match >= 0) {
    if (match > cursor) nodes.push(<Fragment key={`text-${cursor}`}>{source.slice(cursor, match)}</Fragment>);
    nodes.push(<mark key={`match-${match}`}>{source.slice(match, match + needle.length)}</mark>);
    cursor = match + needle.length;
    match = lower.indexOf(needle, cursor);
  }
  if (cursor < source.length) nodes.push(<Fragment key={`tail-${cursor}`}>{source.slice(cursor)}</Fragment>);
  return nodes.length ? nodes : source;
}

function add(items, result) {
  const title = safe(result.title) || `Untitled ${result.type || 'Item'}`;
  const text = `${result.type} ${title} ${result.meta} ${result.courseLabel || ''}`.toLowerCase();
  items.push({ ...result, title, text });
}

export default function Search({ api, setPage }) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const q = safe(submittedQuery || query).toLowerCase();
  const catalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const courseMap = new Map();
  catalog.forEach((course) => {
    courseMap.set(course.id, courseLabel(course));
    if (course.sourceId) courseMap.set(course.sourceId, courseLabel(course));
  });
  const canonicalCourseId = (value) => catalog.find((course) => course.id === value || course.sourceId === value)?.id || value || '';

  const items = useMemo(() => {
    const next = [];
    api.data.courses?.forEach((item) => add(next, { id: item.id, type: 'Course', title: item.name || item.code || 'Untitled course', meta: `${item.code || ''} ${item.instructor || ''} ${item.section || ''} ${item.type || ''}`, page: 'academic', courseId: item.id, raw: item }));
    api.data.semesters?.forEach((item) => add(next, { id: item.id, type: 'Semester', title: item.name || 'Semester', meta: `${item.term || ''} ${item.year || ''} ${item.status || ''} ${(item.courses || []).map((course) => `${course.code || ''} ${course.name || ''}`).join(' ')}`, page: 'academic', raw: item }));
    api.data.tasks?.forEach((item) => add(next, { id: item.id, type: 'Task', title: item.title, meta: `${item.description || ''} ${item.priority || ''} ${item.category || ''} ${taskProgress(item)}% ${(item.subtasks || []).map((subtask) => subtask.title).join(' ')} ${item.resourceUrl || ''}`, page: 'tasks', courseId: item.courseId, raw: item }));
    api.data.goals?.forEach((item) => add(next, { id: item.id, type: 'Goal', title: item.title, meta: `${item.description || ''} ${item.type || ''} ${goalProgress(item, api.data.tasks || [])}% ${(item.milestones || []).map((milestone) => milestone.title).join(' ')}`, page: 'goals', raw: item }));
    api.data.notes?.forEach((item) => add(next, { id: item.id, type: 'Note', title: item.title || 'Untitled Note', meta: `${stripMarkdown(item.body)} ${item.folder || ''} ${normalizeTags(item.tags?.length ? item.tags : item.tag).join(' ')}`, page: 'notes', courseId: item.courseId, raw: item }));
    api.data.resources?.forEach((item) => add(next, { id: item.id, type: 'Resource', title: item.title || 'Untitled Resource', meta: `${item.type || ''} ${item.description || ''} ${item.url || ''} ${normalizeTags(item.tags).join(' ')}`, page: 'resources', courseId: item.courseId, raw: item }));
    api.data.habits?.forEach((item) => add(next, { id: item.id, type: 'Habit', title: item.title, meta: `${currentHabitStreak(item)} current streak ${item.frequency || ''} ${Object.keys(item.checkins || {}).join(' ')} ${item.notes || ''}`, page: 'habits', raw: item }));
    api.data.exams?.forEach((item) => add(next, { id: item.id, type: 'Exam', title: item.title, meta: `${item.subject || ''} ${examPreparationProgress(item)}% ${(item.syllabus || []).map((topic) => topic.title).join(' ')} ${item.notes || ''}`, page: 'exams', courseId: item.courseId, raw: item }));
    api.data.routines?.forEach((item) => add(next, { id: item.id, type: 'Routine', title: item.title, meta: `${item.courseCode || item.type || ''} ${item.day || ''} ${item.room || ''} ${item.teacher || ''}`, page: 'routine', courseId: item.courseId, raw: item }));
    api.data.attendanceRecords?.forEach((item) => add(next, { id: item.id, type: 'Attendance', title: item.courseCode || item.courseName || 'Attendance record', meta: `${item.status || ''} ${item.date || ''} ${item.session || ''} ${item.notes || ''}`, page: 'attendance', courseId: item.courseId, raw: item }));
    api.data.studyLogs?.forEach((item) => add(next, { id: item.id, type: 'Study Log', title: item.subject || 'Study Session', meta: `${item.topic || ''} ${item.method || ''} ${item.location || ''} ${item.notes || ''}`, page: 'analyzer', courseId: item.courseId, raw: item }));
    api.data.focusSessions?.forEach((item) => add(next, { id: item.id, type: 'Focus Session', title: item.topic || 'Pomodoro Focus', meta: `${item.minutes || 0} minutes ${item.dateISO || ''} ${item.notes || ''}`, page: 'timer', courseId: item.courseId, raw: item }));
    api.data.calendarItems?.forEach((item) => add(next, { id: item.id, type: 'Calendar Event', title: item.title || 'Untitled event', meta: `${item.type || ''} ${item.date || ''} ${item.startTime || ''} ${item.location || ''} ${item.description || ''}`, page: 'calendar', raw: item }));
    api.data.routineExceptions?.forEach((item) => { const routine = api.data.routines?.find((entry) => entry.id === item.routineId); add(next, { id: item.id, type: 'Routine Change', title: routine?.title || 'Routine exception', meta: `${item.status || ''} ${item.originalDate || ''} ${item.newDate || ''} ${item.notes || ''}`, page: 'routine', courseId: routine?.courseId, raw: item }); });
    return next.map((item) => ({ ...item, courseId: canonicalCourseId(item.courseId), courseLabel: item.courseId ? courseMap.get(item.courseId) || '' : '' }));
  }, [api.data, courseMap]);

  const types = ['All', ...new Set(items.map((item) => item.type))];
  const results = useMemo(() => {
    if (!q) return [];
    return items.filter((item) => item.text.includes(q))
      .filter((item) => typeFilter === 'All' || item.type === typeFilter)
      .filter((item) => courseFilter === 'All' || item.courseId === courseFilter)
      .sort((a, b) => {
        const titleA = a.title.toLowerCase(); const titleB = b.title.toLowerCase();
        const scoreA = titleA === q ? 0 : titleA.startsWith(q) ? 1 : titleA.includes(q) ? 2 : 3;
        const scoreB = titleB === q ? 0 : titleB.startsWith(q) ? 1 : titleB.includes(q) ? 2 : 3;
        return scoreA - scoreB || a.title.localeCompare(b.title);
      });
  }, [courseFilter, items, q, typeFilter]);

  const submitSearch = (event) => {
    event?.preventDefault();
    const term = safe(query);
    if (!term) return;
    setSubmittedQuery(term);
    const entry = { id: uid(), query: term, date: new Date().toISOString() };
    const previous = (api.data.searchHistory || []).filter((item) => item.query.toLowerCase() !== term.toLowerCase());
    api.update('searchHistory', [entry, ...previous].slice(0, 10));
  };

  const openResult = (result) => {
    const entry = { id: uid(), entityType: result.type, entityId: result.id, title: result.title, page: result.page, openedAt: new Date().toISOString() };
    const previous = (api.data.recentItems || []).filter((item) => !(item.entityType === entry.entityType && item.entityId === entry.entityId));
    api.update('recentItems', [entry, ...previous].slice(0, 12));
    if (api.navigate) api.navigate(result.page, { id: result.id, type: result.type });
    else setPage(result.page);
  };

  const recent = api.data.recentItems || [];
  const history = api.data.searchHistory || [];

  return (
    <>
      <Header title="Global Search 2.0" subtitle="Search every LifeOS module, filter by type or course, preview matches and jump to the relevant record." />
      <section className="statsGrid four">
        <StatCard label="Searchable Items" value={items.length} note="connected records" />
        <StatCard label="Results" value={results.length} note="matched items" tone="green" />
        <StatCard label="Modules" value={types.length - 1} note="search categories" tone="purple" />
        <StatCard label="Recent" value={recent.length} note="recently opened" tone="orange" />
      </section>
      <Card className="globalSearchCard">
        <form className="globalSearchForm" onSubmit={submitSearch}>
          <input className="searchInput" value={query} onChange={(event) => { setQuery(event.target.value); setSubmittedQuery(''); }} placeholder="Search notes, resources, courses, tasks, exams, tags..." autoFocus />
          <button className="primaryBtn" type="submit">Search</button>
        </form>
        <div className="searchFilterRow">
          <label><span>Type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span>Course</span><select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="All">All courses</option>{catalog.map((course) => <option key={course.id} value={course.id}>{courseLabel(course)}</option>)}</select></label>
          {typeFilter !== 'All' || courseFilter !== 'All' ? <button className="ghostBtn" type="button" onClick={() => { setTypeFilter('All'); setCourseFilter('All'); }}>Clear filters</button> : null}
        </div>
        {history.length ? <div className="searchHistory"><strong>Recent searches</strong>{history.map((item) => <button type="button" key={item.id} onClick={() => { setQuery(item.query); setSubmittedQuery(item.query); }}>{item.query}</button>)}<button type="button" className="clearHistory" onClick={() => api.update('searchHistory', [])}>Clear</button></div> : null}
      </Card>

      <Card>
        <div className="cardHead"><div><h3>Results</h3><p>{q ? `${results.length} matches for “${safe(submittedQuery || query)}”` : 'Search across your complete LifeOS workspace.'}</p></div></div>
        {!q ? <EmptyState title="Start searching" text="Search by title, body, tag, course, checklist item, location or resource URL." /> : results.length === 0 ? <EmptyState title="No results" text="Try fewer words, another spelling or clear a filter." /> : <div className="itemGrid searchResultGrid">{results.map((result) => <article className="itemCard searchResultCard" key={`${result.type}-${result.id}`}>
          <div className="searchResultType"><span>{TYPE_ICONS[result.type] || '•'}</span><strong>{result.type}</strong></div>
          <h4>{highlight(result.title, submittedQuery || query)}</h4>
          <p>{highlight(snippet(result.meta), submittedQuery || query)}</p>
          {result.courseLabel ? <span className="tagChip">{result.courseLabel}</span> : null}
          <div className="searchResultActions"><button className="ghostBtn" type="button" onClick={() => setSelected(result)}>Preview</button><button className="primaryBtn" type="button" onClick={() => openResult(result)}>Open Item</button></div>
        </article>)}</div>}
      </Card>

      {recent.length ? <Card><div className="cardHead"><div><h3>Recently Opened</h3><p>Continue where you left off.</p></div><button type="button" className="ghostBtn" onClick={() => api.update('recentItems', [])}>Clear</button></div><div className="recentItemStrip">{recent.map((item) => <button type="button" key={item.id} onClick={() => api.navigate ? api.navigate(item.page, { id: item.entityId, type: item.entityType }) : setPage(item.page)}><span>{TYPE_ICONS[item.entityType] || '•'}</span><strong>{item.title}</strong><small>{item.entityType}</small></button>)}</div></Card> : null}

      <Modal open={Boolean(selected)} wide title={selected?.title || 'Search result'} onClose={() => setSelected(null)} actions={<><button className="ghostBtn" type="button" onClick={() => setSelected(null)}>Close</button><button className="primaryBtn" type="button" onClick={() => openResult(selected)}>Open Item</button></>}>
        {selected ? <DetailGrid rows={[{ label: 'Type', value: selected.type }, { label: 'Course', value: selected.courseLabel || 'Not linked' }, { label: 'Module', value: selected.page }, { label: 'Matched details', value: snippet(selected.meta, 700), full: true }]} /> : null}
      </Modal>
    </>
  );
}
