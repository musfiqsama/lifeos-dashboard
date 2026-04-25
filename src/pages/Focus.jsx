import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';

export default function Focus({ api, setPage }) {
  const tasks = api.data.tasks || [];
  const pending = tasks.filter((t) => !t.done).slice(0, 5);
  const focusMinutes = (api.data.focusSessions || []).reduce((sum, s) => sum + Number(s.minutes || 0), 0);
  const toggleTask = (id) => api.update('tasks', tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  return (
    <>
      <Header title="Focus Mode" subtitle="A distraction-free view for today’s top tasks and focus sessions." />
      <section className="statsGrid three">
        <StatCard label="Pending Tasks" value={tasks.filter((t)=>!t.done).length} note="work queue" />
        <StatCard label="Focus Minutes" value={focusMinutes} note="from timer" tone="green" />
        <StatCard label="Mode" value="Clean" note="minimal workspace" tone="purple" />
      </section>
      <section className="twoCol wideLeft">
        <Card className="focusPanel">
          <h3>Focus Queue</h3>
          {pending.length === 0 ? <EmptyState title="No pending tasks" text="Add tasks first, then come back to focus mode." /> : <div className="taskList">{pending.map((t) => <div className="taskItem" key={t.id}><input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} /><div><h4>{t.title}</h4><p>{t.priority} priority · {t.due || 'No due date'}</p></div><span className="pill">Focus</span></div>)}</div>}
        </Card>
        <Card>
          <h3>Quick Tools</h3>
          <div className="actionGrid"><button onClick={() => setPage('timer')}>Open Timer</button><button onClick={() => setPage('tasks')}>Manage Tasks</button><button onClick={() => setPage('notes')}>Write Notes</button><button onClick={() => setPage('analyzer')}>Log Study</button></div>
        </Card>
      </section>
    </>
  );
}
