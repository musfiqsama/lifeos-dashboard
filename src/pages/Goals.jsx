import Header from '../components/Header.jsx';
import { Card, EmptyState } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

export default function Goals({ api }) {
  const goals = api.data.goals;
  const addGoal = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const goal = { id: uid(), title: form.get('title'), type: form.get('type'), deadline: form.get('deadline'), progress: Number(form.get('progress') || 0), status: 'Pending' };
    if (!goal.title) return;
    api.update('goals', [...goals, goal]);
    e.currentTarget.reset();
  };
  const update = (id, patch) => api.update('goals', goals.map((g) => g.id === id ? { ...g, ...patch } : g));
  const remove = (id) => api.update('goals', goals.filter((g) => g.id !== id));

  return (
    <>
      <Header title="Goal Tracker" subtitle="Track academic, skill and personal goals with progress and deadlines." />
      <section className="twoCol wideLeft">
        <Card>
          <h3>Add New Goal</h3>
          <form className="formGrid" onSubmit={addGoal}>
            <input name="title" placeholder="Goal title" />
            <select name="type"><option>Academic</option><option>Skill</option><option>Personal</option></select>
            <input name="deadline" type="date" />
            <input name="progress" type="number" min="0" max="100" placeholder="Progress %" />
            <button className="primaryBtn">Save Goal</button>
          </form>
        </Card>
        <Card>
          <h3>Goal Summary</h3>
          <div className="summaryBig">{goals.length}</div>
          <p>Total goals created</p>
        </Card>
      </section>
      <Card>
        <div className="cardHead"><div><h3>Your Goals</h3><p>Update progress as you move forward.</p></div></div>
        {goals.length === 0 ? <EmptyState title="No goals yet" text="Create your first academic, skill or personal goal." /> : (
          <div className="itemGrid">
            {goals.map((g) => (
              <div className="itemCard" key={g.id}>
                <div className="pill">{g.type}</div>
                <h4>{g.title}</h4>
                <p>Deadline: {g.deadline || 'No deadline'}</p>
                <div className="progress"><span style={{ width: `${g.progress}%` }} /></div>
                <div className="rowBetween"><span>{g.progress}% done</span><button onClick={() => update(g.id, { progress: Math.min(100, g.progress + 10), status: g.progress + 10 >= 100 ? 'Completed' : 'Pending' })}>+10%</button></div>
                <button className="dangerBtn full" onClick={() => remove(g.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
