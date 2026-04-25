import { useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

const today = () => new Date().toISOString().slice(0, 10);
const overdue = (t) => t.due && t.due < today() && !t.done;

export default function Tasks({ api }) {
  const tasks = api.data.tasks || [];
  const [filter, setFilter] = useState('all');
  const addTask = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const task = { id: uid(), title: form.get('title'), priority: form.get('priority'), due: form.get('due'), done: false };
    if (!task.title) return;
    api.update('tasks', [...tasks, task]);
    api.activity?.(`Task added: ${task.title}`);
    e.currentTarget.reset();
  };
  const toggle = (id) => api.update('tasks', tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id) => api.update('tasks', tasks.filter((t) => t.id !== id));
  const doneCount = tasks.filter((t) => t.done).length;
  const overdueCount = tasks.filter(overdue).length;
  const visible = tasks.filter((t) => filter === 'all' ? true : filter === 'done' ? t.done : filter === 'overdue' ? overdue(t) : !t.done);

  return (
    <>
      <Header title="Task Manager" subtitle="Manage daily tasks, assignments and priorities in one simple board." />
      <section className="statsGrid three">
        <StatCard label="All Tasks" value={tasks.length} note="total saved" />
        <StatCard label="Completed" value={doneCount} note="finished work" tone="green" />
        <StatCard label="Overdue" value={overdueCount} note="need attention" tone="orange" />
      </section>
      <section className="twoCol wideLeft">
        <Card>
          <h3>Add Task</h3>
          <form className="formGrid" onSubmit={addTask}>
            <input name="title" placeholder="Task title" />
            <select name="priority"><option>High</option><option>Medium</option><option>Low</option></select>
            <input name="due" type="date" />
            <button className="primaryBtn">Save Task</button>
          </form>
        </Card>
        <Card>
          <h3>Completion</h3>
          <div className="summaryBig">{doneCount}/{tasks.length}</div>
          <div className="progress"><span style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} /></div>
        </Card>
      </section>
      <Card>
        <div className="cardHead"><div><h3>Task List</h3><p>Filter completed, pending or overdue tasks.</p></div><div className="filterTabs"><button onClick={()=>setFilter('all')} className={filter==='all'?'active':''}>All</button><button onClick={()=>setFilter('pending')} className={filter==='pending'?'active':''}>Pending</button><button onClick={()=>setFilter('done')} className={filter==='done'?'active':''}>Done</button><button onClick={()=>setFilter('overdue')} className={filter==='overdue'?'active':''}>Overdue</button></div></div>
        {visible.length === 0 ? <EmptyState title="No tasks here" text="Add or change filters to see tasks." /> : (
          <div className="taskList">
            {visible.map((task) => (
              <div className={`taskItem ${task.done ? 'done' : ''}`} key={task.id}>
                <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} />
                <div><h4>{task.title}</h4><p>{task.priority} priority · {task.due || 'No due date'} {overdue(task) ? '· Overdue' : ''}</p></div>
                <button className="dangerBtn" onClick={() => remove(task.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
