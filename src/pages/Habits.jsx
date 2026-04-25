import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

const week = ['M','T','W','T','F','S','S'];

export default function Habits({ api }) {
  const habits = api.data.habits || [];
  const addHabit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const habit = { id: uid(), title: form.get('title'), checked: false, streak: 0, week: [false,false,false,false,false,false,false] };
    if (!habit.title) return;
    api.update('habits', [...habits, habit]);
    api.activity?.(`Habit added: ${habit.title}`);
    e.currentTarget.reset();
  };
  const toggle = (id) => api.update('habits', habits.map((h) => h.id === id ? { ...h, checked: !h.checked, streak: !h.checked ? h.streak + 1 : Math.max(0, h.streak - 1) } : h));
  const toggleDay = (id, index) => api.update('habits', habits.map((h) => h.id === id ? { ...h, week: (h.week || [false,false,false,false,false,false,false]).map((v,i)=> i === index ? !v : v) } : h));
  const remove = (id) => api.update('habits', habits.filter((h) => h.id !== id));
  const checked = habits.filter((h) => h.checked).length;
  const best = habits.reduce((top, h) => Number(h.streak || 0) > Number(top?.streak || 0) ? h : top, null);

  return (
    <>
      <Header title="Habit Tracker" subtitle="Track study, coding, reading and custom habits with daily check-ins." />
      <section className="statsGrid three">
        <StatCard label="Today Checked" value={`${checked}/${habits.length}`} note="daily consistency" />
        <StatCard label="Best Streak" value={best?.streak || 0} note={best?.title || 'No habit'} tone="green" />
        <StatCard label="Total Habits" value={habits.length} note="active habits" tone="purple" />
      </section>
      <section className="twoCol wideLeft">
        <Card>
          <h3>Add Habit</h3>
          <form className="formGrid" onSubmit={addHabit}>
            <input name="title" placeholder="Habit name, e.g. 2 hours study" />
            <button className="primaryBtn">Save Habit</button>
          </form>
        </Card>
        <Card>
          <h3>Weekly Heatmap</h3>
          {habits.length === 0 ? <EmptyState title="No habits yet" text="Add habits to see the weekly heatmap." /> : <div className="heatmapGrid">{habits.slice(0,6).map((h) => (h.week || []).map((v,i) => <button key={`${h.id}-${i}`} onClick={() => toggleDay(h.id,i)} className={`heatCell ${v ? 'active' : ''}`}>{week[i]}</button>))}</div>}
        </Card>
      </section>
      <Card>
        <h3>Your Habits</h3>
        {habits.length === 0 ? <EmptyState title="No habits yet" text="Add a study or coding habit to start building consistency." /> : (
          <div className="itemGrid">
            {habits.map((h) => (
              <div className="itemCard" key={h.id}>
                <div className="rowBetween"><h4>{h.title}</h4><input type="checkbox" checked={h.checked} onChange={() => toggle(h.id)} /></div>
                <p>Streak: <strong>{h.streak}</strong> checks</p>
                <div className="habitWeek">{week.map((d,i)=><button key={i} onClick={()=>toggleDay(h.id,i)} className={(h.week || [])[i] ? 'active' : ''}>{d}</button>)}</div>
                <button className="dangerBtn full" onClick={() => remove(h.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
