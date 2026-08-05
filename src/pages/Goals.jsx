import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { ChecklistEditor, CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { cleanText, compareDate, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { goalProgress, normalizeChecklist, taskProgress } from '../utils/planning.js';

const emptyGoal = { title: '', description: '', type: 'Academic', priority: 'Medium', deadline: '', progress: 0, status: 'Pending', autoProgress: true, milestones: [] };

export default function Goals({ api }) {
  const goals = api.data.goals || [];
  const tasks = api.data.tasks || [];
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('deadline');
  const [draft, setDraft] = useState(emptyGoal);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const closeForm = () => { setDraft(emptyGoal); setEditingId(null); };
  const openEdit = (goal) => { setEditingId(goal.id); setDraft({ ...emptyGoal, ...goal, milestones: normalizeChecklist(goal.milestones) }); };

  const saveGoal = (event) => {
    event.preventDefault();
    const title = cleanText(draft.title);
    if (!title) return api.notify('Goal title is required.', 'warning', 'Goal not saved');
    const existing = goals.find((goal) => goal.id === editingId) || {};
    const next = { ...existing, ...draft, id: editingId || uid(), title, description: cleanText(draft.description), progress: Math.min(100, Math.max(0, Number(draft.progress) || 0)), milestones: normalizeChecklist(draft.milestones), autoProgress: Boolean(draft.autoProgress), ...entityTimestamps(existing) };
    const progress = goalProgress(next, tasks);
    next.status = progress >= 100 ? 'Completed' : (draft.status === 'Completed' ? 'Completed' : 'Pending');
    api.update('goals', editingId ? goals.map((goal) => goal.id === editingId ? next : goal) : [...goals, next]);
    api.activity?.(`${editingId ? 'Goal updated' : 'Goal added'}: ${title}`);
    api.notify('Goal saved successfully.', 'success');
    closeForm();
  };

  const toggleMilestone = (goal, milestoneId) => {
    const milestones = normalizeChecklist(goal.milestones).map((item) => item.id === milestoneId ? { ...item, done: !item.done } : item);
    const candidate = { ...goal, milestones };
    const progress = goalProgress(candidate, tasks);
    api.update('goals', goals.map((item) => item.id === goal.id ? { ...candidate, progress: candidate.autoProgress ? progress : candidate.progress, status: progress >= 100 ? 'Completed' : 'Pending', ...entityTimestamps(item) } : item));
  };

  const createTask = (goal) => {
    const task = { id: uid(), title: `Work on ${goal.title}`, description: goal.description || '', category: 'Project', priority: goal.priority || 'Medium', startDate: '', due: goal.deadline || '', dueTime: '', status: 'Pending', done: false, courseId: '', goalId: goal.id, recurrence: 'None', estimatedMinutes: 60, resourceUrl: '', progress: 0, subtasks: [], ...entityTimestamps() };
    api.update('tasks', [...tasks, task]);
    api.notify('A linked task was created for this goal.', 'success', 'Task created');
  };

  const quickProgress = (goal, amount) => {
    if (goal.autoProgress) return api.notify('This goal uses automatic progress from milestones and linked tasks.', 'info', 'Automatic progress');
    const progress = Math.min(100, Math.max(0, Number(goal.progress || 0) + amount));
    api.update('goals', goals.map((item) => item.id === goal.id ? { ...item, progress, status: progress >= 100 ? 'Completed' : 'Pending', ...entityTimestamps(item) } : item));
  };

  const remove = async (goal) => {
    if (!await api.confirm({ title: 'Delete goal?', message: `“${goal.title}” will be removed. Linked tasks will remain but lose their goal connection.`, confirmLabel: 'Delete goal', danger: true })) return;
    api.setData((previous) => ({ ...previous, goals: goals.filter((item) => item.id !== goal.id), tasks: tasks.map((task) => task.goalId === goal.id ? { ...task, goalId: '' } : task) }));
    api.notify('Goal deleted.', 'success');
  };

  const visible = useMemo(() => goals.filter((goal) => {
    const progress = goalProgress(goal, tasks);
    const computedStatus = progress >= 100 || goal.status === 'Completed' ? 'Completed' : 'Pending';
    return (type === 'All' || goal.type === type) && (status === 'All' || computedStatus === status)
      && matchesSearch(query, goal.title, goal.description, goal.type, goal.priority, goal.milestones?.map((item) => item.title));
  }).sort((a, b) => {
    if (sort === 'title') return compareText(a.title, b.title);
    if (sort === 'progress') return goalProgress(b, tasks) - goalProgress(a, tasks);
    if (sort === 'updated') return compareDate(b.updatedAt || '', a.updatedAt || '');
    return compareDate(a.deadline || '9999', b.deadline || '9999');
  }), [goals, query, sort, status, tasks, type]);

  const completed = goals.filter((goal) => goalProgress(goal, tasks) >= 100 || goal.status === 'Completed').length;
  const average = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goalProgress(goal, tasks), 0) / goals.length) : 0;
  const linkedTaskCount = tasks.filter((task) => task.goalId).length;
  const formOpen = editingId !== null || draft !== emptyGoal;

  return (
    <>
      <Header title="Goal & Milestone Tracker" subtitle="Break outcomes into milestones and connect daily tasks to measurable progress." />
      <section className="statsGrid four">
        <StatCard label="Total Goals" value={goals.length} note="all saved goals" />
        <StatCard label="Completed" value={completed} note="finished outcomes" tone="green" />
        <StatCard label="Average Progress" value={`${average}%`} note="milestones and tasks" tone="purple" />
        <StatCard label="Linked Tasks" value={linkedTaskCount} note="supporting goal work" tone="orange" />
      </section>
      <Card>
        <div className="cardHead"><div><h3>Your Goals</h3><p>Use automatic progress to combine milestone completion with linked task progress.</p></div><button type="button" className="primaryBtn" onClick={() => setDraft({ ...emptyGoal, milestones: [] })}>Add Goal</button></div>
        <CrudToolbar query={query} onQueryChange={setQuery} count={visible.length} queryPlaceholder="Search goals or milestones"
          filters={[{ label: 'Type', value: type, onChange: setType, options: ['All', 'Academic', 'Skill', 'Personal'] }, { label: 'Status', value: status, onChange: setStatus, options: ['All', 'Pending', 'Completed'] }]}
          sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'deadline', label: 'Deadline' }, { value: 'progress', label: 'Progress' }, { value: 'title', label: 'Title' }, { value: 'updated', label: 'Recently updated' }]} />
        {visible.length === 0 ? <EmptyState title="No matching goals" text="Create a goal or change the current filters." /> : <div className="itemGrid">{visible.map((goal) => {
          const progress = goalProgress(goal, tasks); const linked = tasks.filter((task) => task.goalId === goal.id);
          return <article className="itemCard" key={goal.id}>
            <div className="inlinePills"><span className="pill">{goal.type || 'Goal'}</span><span className="pill subtle">{goal.priority || 'Medium'}</span>{goal.autoProgress ? <span className="pill subtle">Auto</span> : null}</div>
            <h4>{goal.title}</h4><p>{goal.description || 'No description'}</p><p>Deadline: {goal.deadline || 'Not set'} · {linked.length} linked task{linked.length === 1 ? '' : 's'}</p>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div><div className="rowBetween"><span>{progress}% complete</span><button type="button" onClick={() => quickProgress(goal, 10)}>+10%</button></div>
            <div className="goalCardButtons"><button type="button" className="ghostBtn" onClick={() => createTask(goal)}>Create Linked Task</button></div>
            <ItemActions onView={() => setViewing(goal)} onEdit={() => openEdit(goal)} onDelete={() => remove(goal)} />
          </article>;
        })}</div>}
      </Card>

      <Modal open={Boolean(formOpen)} wide title={editingId ? 'Edit Goal' : 'Create Goal'} onClose={closeForm} actions={<><button className="ghostBtn" type="button" onClick={closeForm}>Cancel</button><button className="primaryBtn" type="submit" form="goal-form">Save Goal</button></>}>
        <form id="goal-form" className="formGrid modalForm" onSubmit={saveGoal}>
          <Field label="Title" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Goal title" autoFocus /></Field>
          <Field label="Description" full><textarea rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Describe the outcome" /></Field>
          <Field label="Type"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option>Academic</option><option>Skill</option><option>Personal</option></select></Field>
          <Field label="Priority"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
          <Field label="Deadline"><input type="date" value={draft.deadline || ''} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} /></Field>
          <Field label="Manual progress" hint="Used only when automatic progress is disabled"><input type="number" min="0" max="100" value={draft.progress} disabled={draft.autoProgress} onChange={(event) => setDraft({ ...draft, progress: event.target.value })} /></Field>
          <Field label="Progress mode" full><label className="inlineCheck"><input type="checkbox" checked={Boolean(draft.autoProgress)} onChange={(event) => setDraft({ ...draft, autoProgress: event.target.checked })} /><span>Automatically calculate from milestones and linked tasks</span></label></Field>
          <Field label="Milestones" full><ChecklistEditor items={draft.milestones || []} onChange={(milestones) => setDraft({ ...draft, milestones })} addLabel="Add milestone" itemPlaceholder="Milestone outcome" /></Field>
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} wide title={viewing?.title || 'Goal details'} onClose={() => setViewing(null)} actions={<button className="primaryBtn" type="button" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Goal</button>}>
        {viewing ? <><DetailGrid rows={[{ label: 'Description', value: viewing.description || 'No description', full: true }, { label: 'Type', value: viewing.type || 'Goal' }, { label: 'Priority', value: viewing.priority || 'Medium' }, { label: 'Progress', value: `${goalProgress(viewing, tasks)}%` }, { label: 'Mode', value: viewing.autoProgress ? 'Automatic' : 'Manual' }, { label: 'Deadline', value: viewing.deadline || 'Not set' }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} />
          {normalizeChecklist(viewing.milestones).length ? <div className="detailChecklist"><h4>Milestones</h4>{normalizeChecklist(viewing.milestones).map((item) => <label key={item.id}><input type="checkbox" checked={item.done} onChange={() => toggleMilestone(viewing, item.id)} /><span>{item.title}</span></label>)}</div> : null}
          <div className="linkedTaskList"><h4>Linked tasks</h4>{tasks.filter((task) => task.goalId === viewing.id).length ? tasks.filter((task) => task.goalId === viewing.id).map((task) => <div key={task.id}><span>{task.title}</span><strong>{taskProgress(task)}%</strong></div>) : <p>No linked tasks yet.</p>}</div></> : null}
      </Modal>
    </>
  );
}
