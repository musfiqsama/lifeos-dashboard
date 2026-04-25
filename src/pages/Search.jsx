import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';

export default function Search({ api, setPage }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const items = [];
    api.data.tasks?.forEach((x) => items.push({ type: 'Task', title: x.title, meta: x.priority, page: 'tasks' }));
    api.data.goals?.forEach((x) => items.push({ type: 'Goal', title: x.title, meta: x.type, page: 'goals' }));
    api.data.notes?.forEach((x) => items.push({ type: 'Note', title: x.title || 'Untitled Note', meta: x.body, page: 'notes' }));
    api.data.habits?.forEach((x) => items.push({ type: 'Habit', title: x.title, meta: `${x.streak || 0} streak`, page: 'habits' }));
    api.data.exams?.forEach((x) => items.push({ type: 'Exam', title: x.title, meta: x.subject, page: 'exams' }));
    return q ? items.filter((x) => `${x.type} ${x.title} ${x.meta}`.toLowerCase().includes(q)) : [];
  }, [api.data, q]);

  return (
    <>
      <Header title="Global Search" subtitle="Find tasks, goals, notes, habits and exams instantly." />
      <section className="statsGrid three">
        <StatCard label="Searchable Items" value={(api.data.tasks?.length||0)+(api.data.goals?.length||0)+(api.data.notes?.length||0)+(api.data.habits?.length||0)+(api.data.exams?.length||0)} note="total records" />
        <StatCard label="Results" value={results.length} note="matched items" tone="green" />
        <StatCard label="Scope" value="5" note="modules" tone="purple" />
      </section>
      <Card>
        <input className="searchInput" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything..." />
      </Card>
      <Card>
        <h3>Results</h3>
        {!q ? <EmptyState title="Start typing" text="Search by task, note, goal, habit or exam title." /> : results.length === 0 ? <EmptyState title="No results" text="Try a different keyword." /> : <div className="itemGrid">{results.map((r, i) => <div className="itemCard" key={i}><div className="pill">{r.type}</div><h4>{r.title}</h4><p>{r.meta || 'No details'}</p><button className="ghostBtn full" onClick={() => setPage(r.page)}>Open</button></div>)}</div>}
      </Card>
    </>
  );
}
