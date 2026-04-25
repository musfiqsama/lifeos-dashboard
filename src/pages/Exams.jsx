import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

const daysLeft = (date) => {
  const diff = new Date(date + 'T00:00:00') - new Date(new Date().toISOString().slice(0,10) + 'T00:00:00');
  return Math.ceil(diff / 86400000);
};

export default function Exams({ api }) {
  const exams = api.data.exams || [];
  const upcoming = exams.filter((e) => daysLeft(e.date) >= 0).sort((a,b) => a.date.localeCompare(b.date));
  const nearest = upcoming[0];
  const addExam = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const exam = { id: uid(), title: form.get('title'), subject: form.get('subject'), date: form.get('date'), priority: form.get('priority') };
    if (!exam.title || !exam.date) return;
    api.update('exams', [...exams, exam]);
    api.activity?.(`Exam added: ${exam.title}`);
    e.currentTarget.reset();
  };
  const remove = (id) => api.update('exams', exams.filter((x) => x.id !== id));

  return (
    <>
      <Header title="Exam Countdown" subtitle="Track upcoming exams with clean countdown cards and priority badges." />
      <section className="statsGrid three">
        <StatCard label="Total Exams" value={exams.length} note="saved countdowns" />
        <StatCard label="Upcoming" value={upcoming.length} note="from today onward" tone="green" />
        <StatCard label="Nearest" value={nearest ? `${daysLeft(nearest.date)}d` : '0d'} note={nearest?.title || 'No exam'} tone="orange" />
      </section>
      <section className="twoCol wideLeft">
        <Card>
          <h3>Add Exam</h3>
          <form className="formGrid" onSubmit={addExam}>
            <input name="title" placeholder="Exam name" />
            <input name="subject" placeholder="Subject / course" />
            <input name="date" type="date" />
            <select name="priority"><option>High</option><option>Medium</option><option>Low</option></select>
            <button className="primaryBtn">Save Exam</button>
          </form>
        </Card>
        <Card>
          <h3>Nearest Exam</h3>
          <div className="summaryBig">{nearest ? `${daysLeft(nearest.date)}d` : '0d'}</div>
          <p>{nearest ? `${nearest.title} · ${nearest.subject || 'No subject'}` : 'Add your first exam to start countdown.'}</p>
        </Card>
      </section>
      <Card>
        <h3>Exam List</h3>
        {exams.length === 0 ? <EmptyState title="No exams yet" text="Add an exam to see countdown and priority cards." /> : (
          <div className="itemGrid">{exams.map((exam) => <div className="itemCard" key={exam.id}><div className="pill">{exam.priority}</div><h4>{exam.title}</h4><p>{exam.subject || 'No subject'} · {exam.date}</p><div className="summarySmall">{daysLeft(exam.date)} days left</div><button className="dangerBtn full" onClick={() => remove(exam.id)}>Delete</button></div>)}</div>
        )}
      </Card>
    </>
  );
}
