import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar({ api, setPage }) {
  const { tasks = [], routines = [], exams = [] } = api.data;
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const datedTasks = tasks.filter((t) => t.due);
  const upcomingExams = exams.filter((e) => e.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date));
  const todayTasks = tasks.filter((t) => t.due === todayISO);
  const todayRoutine = routines.filter((r) => r.day === today.toLocaleDateString('en-US', { weekday: 'long' }));
  const cards = [...datedTasks.map((t) => ({ type: 'Task', title: t.title, date: t.due, meta: t.priority })), ...upcomingExams.map((e) => ({ type: 'Exam', title: e.title, date: e.date, meta: e.subject }))].sort((a,b) => a.date.localeCompare(b.date)).slice(0, 12);

  return (
    <>
      <Header title="Calendar View" subtitle="See tasks, routines and exams in one clean schedule overview." />
      <section className="statsGrid three">
        <StatCard label="Today Tasks" value={todayTasks.length} note={todayISO} />
        <StatCard label="Today Routine" value={todayRoutine.length} note="schedule blocks" tone="green" />
        <StatCard label="Upcoming Exams" value={upcomingExams.length} note="exam countdowns" tone="purple" />
      </section>
      <section className="twoCol wideLeft">
        <Card>
          <div className="cardHead"><div><h3>Upcoming Timeline</h3><p>Tasks and exams sorted by date.</p></div><button className="ghostBtn" onClick={() => setPage('tasks')}>Add Task</button></div>
          {cards.length === 0 ? <EmptyState title="No dated items" text="Add task due dates or exams to fill your calendar." /> : (
            <div className="calendarList">{cards.map((c, i) => <div className="calendarItem" key={`${c.type}-${i}`}><div><span className="pill">{c.type}</span><h4>{c.title}</h4><p>{c.meta || 'No details'}</p></div><strong>{c.date}</strong></div>)}</div>
          )}
        </Card>
        <Card>
          <h3>Week Snapshot</h3>
          <div className="weekGrid">{days.map((d) => <div className={`weekDay ${d === today.toLocaleDateString('en-US', { weekday: 'short' }) ? 'active' : ''}`} key={d}><strong>{d}</strong><span>{d === today.toLocaleDateString('en-US', { weekday: 'short' }) ? 'Today' : 'Plan'}</span></div>)}</div>
        </Card>
      </section>
    </>
  );
}
