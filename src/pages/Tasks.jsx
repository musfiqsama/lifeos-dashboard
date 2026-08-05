import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { ChecklistEditor, CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { cleanText, compareDate, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { buildRecurringTask, normalizeChecklist, taskProgress, taskScheduleState } from '../utils/planning.js';
import { isSafeResourceUrl } from '../utils/knowledge.js';

const emptyDraft = {
  title: '', description: '', category: 'Assignment', priority: 'Medium', startDate: '', due: '', dueTime: '', status: 'Pending',
  courseId: '', goalId: '', recurrence: 'None', estimatedMinutes: 0, resourceUrl: '', reminderMinutes: 60, progress: 0, subtasks: [],
};

export default function Tasks({ api }) {
  const tasks = api.data.tasks || [];
  const courses = api.data.courses || [];
  const goals = api.data.goals || [];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Active');
  const [priority, setPriority] = useState('All');
  const [sort, setSort] = useState('due-asc');
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const closeForm = () => { setEditingId(null); setDraft(emptyDraft); };
  const openEdit = (task) => { setEditingId(task.id); setDraft({ ...emptyDraft, ...task, subtasks: normalizeChecklist(task.subtasks) }); };

  const saveTask = (event) => {
    event.preventDefault();
    const title = cleanText(draft.title);
    const resourceUrl = cleanText(draft.resourceUrl);
    if (!title) return api.notify('Task title is required.', 'warning', 'Task not saved');
    if (draft.startDate && draft.due && draft.startDate > draft.due) return api.notify('Start date cannot be after the due date.', 'warning', 'Task not saved');
    if (!isSafeResourceUrl(resourceUrl)) return api.notify('Use a valid http, https or mailto link.', 'warning', 'Unsafe resource link');
    const existing = tasks.find((task) => task.id === editingId) || {};
    const subtasks = normalizeChecklist(draft.subtasks);
    const status = draft.status || 'Pending';
    const checklistCompleted = subtasks.length > 0 && subtasks.every((item) => item.done);
    const finalStatus = checklistCompleted ? 'Completed' : status;
    const next = {
      ...existing, ...draft, id: editingId || uid(), title, description: cleanText(draft.description), resourceUrl,
      subtasks, estimatedMinutes: Math.max(0, Number(draft.estimatedMinutes) || 0), reminderMinutes: Math.max(-1, Number(draft.reminderMinutes ?? 60)), progress: checklistCompleted ? 100 : Math.min(100, Math.max(0, Number(draft.progress) || 0)),
      status: finalStatus, done: finalStatus === 'Completed', ...entityTimestamps(existing),
    };
    api.update('tasks', editingId ? tasks.map((task) => task.id === editingId ? next : task) : [...tasks, next]);
    api.activity?.(`${editingId ? 'Task updated' : 'Task added'}: ${title}`);
    api.notify(`${title} ${editingId ? 'updated' : 'created'}.`, 'success', 'Task saved');
    closeForm();
  };

  const toggle = (task) => {
    const completing = taskScheduleState(task) !== 'Completed';
    const updated = { ...task, done: completing, status: completing ? 'Completed' : 'Pending', progress: completing ? 100 : taskProgress({ ...task, done: false, status: 'Pending' }), ...entityTimestamps(task) };
    let nextTasks = tasks.map((item) => item.id === task.id ? updated : item);
    if (completing && task.recurrence && task.recurrence !== 'None') {
      const recurring = buildRecurringTask(task, uid());
      if (recurring) {
        nextTasks = [...nextTasks, recurring];
        api.notify(`Completed. The next ${task.recurrence.toLowerCase()} task was created for ${recurring.due}.`, 'success', 'Recurring task');
      }
    }
    api.update('tasks', nextTasks);
  };

  const toggleSubtask = (task, subtaskId) => {
    const subtasks = normalizeChecklist(task.subtasks).map((item) => item.id === subtaskId ? { ...item, done: !item.done } : item);
    const progress = taskProgress({ ...task, subtasks, done: false, status: task.status === 'Completed' ? 'In Progress' : task.status });
    const completed = subtasks.length > 0 && subtasks.every((item) => item.done);
    let nextTasks = tasks.map((item) => item.id === task.id ? { ...item, subtasks, progress: completed ? 100 : progress, done: completed, status: completed ? 'Completed' : (progress > 0 ? 'In Progress' : 'Pending'), ...entityTimestamps(item) } : item);
    if (completed && taskScheduleState(task) !== 'Completed' && task.recurrence && task.recurrence !== 'None') {
      const recurring = buildRecurringTask({ ...task, subtasks }, uid());
      if (recurring) {
        nextTasks = [...nextTasks, recurring];
        api.notify(`All subtasks completed. The next ${task.recurrence.toLowerCase()} task was created for ${recurring.due}.`, 'success', 'Recurring task');
      }
    }
    api.update('tasks', nextTasks);
  };

  const duplicate = (task) => {
    const copy = { ...task, id: uid(), title: `${task.title} (Copy)`, done: false, status: 'Pending', progress: 0, subtasks: normalizeChecklist(task.subtasks).map((item) => ({ ...item, id: uid(), done: false })), ...entityTimestamps() };
    api.update('tasks', [...tasks, copy]);
    api.notify('Task duplicated.', 'success');
  };

  const archive = (task) => api.update('tasks', tasks.map((item) => item.id === task.id ? { ...item, status: item.status === 'Archived' ? 'Pending' : 'Archived', done: false, ...entityTimestamps(item) } : item));
  const remove = async (task) => {
    if (!await api.confirm({ title: 'Delete task?', message: `“${task.title}” will be permanently removed.`, confirmLabel: 'Delete task', danger: true })) return;
    api.update('tasks', tasks.filter((item) => item.id !== task.id));
    api.notify('Task deleted.', 'success');
  };

  const visible = useMemo(() => tasks.filter((task) => {
    const state = taskScheduleState(task);
    const statusMatch = filter === 'All' || (filter === 'Active' && !['Completed', 'Archived'].includes(state)) || state === filter;
    return statusMatch && (priority === 'All' || (task.priority || 'Medium') === priority)
      && matchesSearch(query, task.title, task.description, task.category, task.priority, task.due, task.subtasks?.map((item) => item.title), task.resourceUrl);
  }).sort((a, b) => {
    if (sort === 'title') return compareText(a.title, b.title);
    if (sort === 'progress') return taskProgress(b) - taskProgress(a);
    if (sort === 'priority') return compareText(a.priority, b.priority);
    if (sort === 'updated') return compareDate(b.updatedAt || '', a.updatedAt || '');
    if (sort === 'due-desc') return compareDate(b.due || '9999', a.due || '9999');
    return compareDate(a.due || '9999', b.due || '9999');
  }), [filter, priority, query, sort, tasks]);

  const completed = tasks.filter((task) => taskScheduleState(task) === 'Completed').length;
  const overdue = tasks.filter((task) => taskScheduleState(task) === 'Overdue').length;
  const estimated = tasks.filter((task) => !['Completed', 'Archived'].includes(taskScheduleState(task))).reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0);
  const formOpen = editingId !== null || draft !== emptyDraft;
  const courseName = (task) => courses.find((course) => course.id === task.courseId)?.name || 'Not linked';
  const goalName = (task) => goals.find((goal) => goal.id === task.goalId)?.title || 'Not linked';

  return (
    <>
      <Header title="Advanced Task Manager" subtitle="Plan assignments and projects with subtasks, goals, recurrence and realistic effort estimates." />
      <section className="statsGrid four">
        <StatCard label="All Tasks" value={tasks.length} note="including archived" />
        <StatCard label="Completed" value={completed} note="finished work" tone="green" />
        <StatCard label="Overdue" value={overdue} note="need attention" tone="orange" />
        <StatCard label="Planned Effort" value={`${Math.round(estimated / 60)}h`} note={`${estimated} active minutes`} tone="purple" />
      </section>
      <Card>
        <div className="cardHead"><div><h3>Task Board</h3><p>Track work from planning to completion and automatically repeat recurring tasks.</p></div><button className="primaryBtn" type="button" onClick={() => setDraft({ ...emptyDraft, subtasks: [] })}>Add Task</button></div>
        <CrudToolbar query={query} onQueryChange={setQuery} queryPlaceholder="Search tasks, subtasks or links" count={visible.length}
          filters={[{ label: 'Status', value: filter, onChange: setFilter, options: ['Active', 'All', 'Pending', 'In Progress', 'Overdue', 'Completed', 'Archived'] }, { label: 'Priority', value: priority, onChange: setPriority, options: ['All', 'High', 'Medium', 'Low'] }]}
          sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'due-asc', label: 'Due date: earliest' }, { value: 'due-desc', label: 'Due date: latest' }, { value: 'progress', label: 'Progress' }, { value: 'title', label: 'Title' }, { value: 'priority', label: 'Priority' }, { value: 'updated', label: 'Recently updated' }]} />
        {visible.length === 0 ? <EmptyState title="No matching tasks" text="Create a task or change the current filters." /> : <div className="taskList crudList">{visible.map((task) => {
          const state = taskScheduleState(task); const progress = taskProgress(task); const subtasks = normalizeChecklist(task.subtasks);
          return <article className={`taskItem taskItemExpanded ${state === 'Completed' ? 'done' : ''}`} key={task.id}>
            <input aria-label={`Mark ${task.title} complete`} type="checkbox" checked={state === 'Completed'} disabled={state === 'Archived'} onChange={() => toggle(task)} />
            <div>
              <div className="inlinePills"><span className="pill">{task.category || 'Task'}</span><span className="pill subtle">{task.priority || 'Medium'}</span><span className={`pill ${state === 'Overdue' ? 'dangerPill' : 'subtle'}`}>{state}</span>{task.recurrence !== 'None' ? <span className="pill subtle">{task.recurrence}</span> : null}</div>
              <h4>{task.title}</h4><p>{task.description || 'No description'} · Due {task.due || 'not set'} {task.dueTime || ''}</p>
              <div className="progress compactProgress"><span style={{ width: `${progress}%` }} /></div><small>{progress}% · {subtasks.filter((item) => item.done).length}/{subtasks.length} subtasks · {task.estimatedMinutes || 0} min</small>
            </div>
            <ItemActions onView={() => setViewing(task)} onEdit={() => openEdit(task)} onDuplicate={() => duplicate(task)} onArchive={() => archive(task)} archiveLabel={state === 'Archived' ? 'Restore' : 'Archive'} onDelete={() => remove(task)} />
          </article>;
        })}</div>}
      </Card>

      <Modal open={Boolean(formOpen)} wide title={editingId ? 'Edit Task' : 'Create Task'} onClose={closeForm} actions={<><button type="button" className="ghostBtn" onClick={closeForm}>Cancel</button><button type="submit" form="task-form" className="primaryBtn">Save Task</button></>}>
        <form id="task-form" className="formGrid modalForm" onSubmit={saveTask}>
          <Field label="Title" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Task title" autoFocus /></Field>
          <Field label="Description" full><textarea rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What needs to be done?" /></Field>
          <Field label="Category"><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Assignment</option><option>Quiz</option><option>Project</option><option>Study</option><option>Personal</option><option>Other</option></select></Field>
          <Field label="Priority"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
          <Field label="Start date"><input type="date" value={draft.startDate || ''} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field>
          <Field label="Due date"><input type="date" value={draft.due || ''} onChange={(event) => setDraft({ ...draft, due: event.target.value })} /></Field>
          <Field label="Due time"><input type="time" value={draft.dueTime || ''} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value })} /></Field>
          <Field label="Reminder"><select value={draft.reminderMinutes ?? 60} onChange={(event) => setDraft({ ...draft, reminderMinutes: Number(event.target.value) })}><option value="-1">No reminder</option><option value="0">At due time</option><option value="15">15 minutes before</option><option value="30">30 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option></select></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Pending</option><option>In Progress</option><option>Completed</option><option>Archived</option></select></Field>
          <Field label="Course link"><select value={draft.courseId || ''} onChange={(event) => setDraft({ ...draft, courseId: event.target.value })}><option value="">Not linked</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ''}{course.name || 'Untitled'}</option>)}</select></Field>
          <Field label="Goal link"><select value={draft.goalId || ''} onChange={(event) => setDraft({ ...draft, goalId: event.target.value })}><option value="">Not linked</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field>
          <Field label="Recurrence"><select value={draft.recurrence || 'None'} onChange={(event) => setDraft({ ...draft, recurrence: event.target.value })}><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></Field>
          <Field label="Estimated minutes"><input type="number" min="0" value={draft.estimatedMinutes || 0} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value })} /></Field>
          <Field label="Manual progress" hint="Used only when no subtasks exist"><input type="number" min="0" max="100" value={draft.progress || 0} onChange={(event) => setDraft({ ...draft, progress: event.target.value })} /></Field>
          <Field label="Resource URL"><input type="url" value={draft.resourceUrl || ''} onChange={(event) => setDraft({ ...draft, resourceUrl: event.target.value })} placeholder="https://..." /></Field>
          <Field label="Subtasks" full><ChecklistEditor items={draft.subtasks || []} onChange={(subtasks) => setDraft({ ...draft, subtasks })} addLabel="Add subtask" itemPlaceholder="Subtask title" /></Field>
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} wide title={viewing?.title || 'Task details'} onClose={() => setViewing(null)} actions={<button type="button" className="primaryBtn" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Task</button>}>
        {viewing ? <><DetailGrid rows={[{ label: 'Description', value: viewing.description || 'No description', full: true }, { label: 'Status', value: taskScheduleState(viewing) }, { label: 'Progress', value: `${taskProgress(viewing)}%` }, { label: 'Category', value: viewing.category }, { label: 'Priority', value: viewing.priority }, { label: 'Course', value: courseName(viewing) }, { label: 'Goal', value: goalName(viewing) }, { label: 'Start', value: viewing.startDate || 'Not set' }, { label: 'Due', value: `${viewing.due || 'Not set'} ${viewing.dueTime || ''}` }, { label: 'Recurrence', value: viewing.recurrence || 'None' }, { label: 'Reminder', value: Number(viewing.reminderMinutes) < 0 ? 'Disabled' : `${viewing.reminderMinutes || 0} minutes before` }, { label: 'Estimate', value: `${viewing.estimatedMinutes || 0} minutes` }, { label: 'Resource', value: viewing.resourceUrl && isSafeResourceUrl(viewing.resourceUrl) ? <a href={viewing.resourceUrl} target="_blank" rel="noopener noreferrer">Open resource</a> : viewing.resourceUrl ? 'Invalid link' : 'Not set' }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} />
          {normalizeChecklist(viewing.subtasks).length ? <div className="detailChecklist"><h4>Subtasks</h4>{normalizeChecklist(viewing.subtasks).map((item) => <label key={item.id}><input type="checkbox" checked={item.done} onChange={() => toggleSubtask(viewing, item.id)} /><span>{item.title}</span></label>)}</div> : null}</> : null}
      </Modal>
    </>
  );
}
