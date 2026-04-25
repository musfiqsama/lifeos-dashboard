import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function Routine({ api }) {
  const routines = api.data.routines || [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayItems = routines.filter((r) => r.day === today);

  const addRoutine = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const item = { id: uid(), title: form.get('title'), type: form.get('type'), day: form.get('day'), time: form.get('time') };
    if (!item.title) return;
    api.update('routines', [...routines, item]);
    api.activity?.(`Routine added: ${item.title}`);
    e.currentTarget.reset();
  };
  const remove = (id) => api.update('routines', routines.filter((r) => r.id !== id));

  return (
    <>
      <Header title="Routine & Schedule" />
      <section className="statsGrid three">
        <StatCard label="Total Items" value={routines.length} note="routine blocks" />
        <StatCard label="Today" value={todayItems.length} note={today} tone="green" />
        <StatCard label="Categories" value={[...new Set(routines.map((r) => r.type))].length} note="routine types" tone="purple" />
      </section>

      <section className="twoCol wideLeft">
        <Card>
          <h3>Add Schedule Item</h3>
          <form className="formGrid" onSubmit={addRoutine}>
            <input name="title" placeholder="Class / study / task title" />
            <select name="type"><option>Class</option><option>Study</option><option>Personal</option><option>Exam</option></select>
            <select name="day">{days.map((d) => <option key={d}>{d}</option>)}</select>
            <input name="time" type="time" />
            <button className="primaryBtn">Save Routine</button>
          </form>
        </Card>
        <Card>
          <h3>Today's Schedule</h3>
          {todayItems.length === 0 ? <EmptyState title="No routine today" text="Add a routine item for today to show it here." /> : (
            <ul className="miniList">{todayItems.map((r) => <li key={r.id}>{r.time || 'Anytime'} · {r.title}</li>)}</ul>
          )}
        </Card>
      </section>

      <Card>
        <h3>Weekly Routine</h3>
        {routines.length === 0 ? <EmptyState title="No routine yet" text="Build your weekly class and study schedule." /> : (
          <div className="itemGrid">{routines.map((r) => <div className="itemCard" key={r.id}><div className="pill">{r.type}</div><h4>{r.title}</h4><p>{r.day} · {r.time || 'Anytime'}</p><button className="dangerBtn full" onClick={() => remove(r.id)}>Delete</button></div>)}</div>
        )}
      </Card>
    </>
  );
}
