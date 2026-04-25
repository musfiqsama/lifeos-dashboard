import Header from '../components/Header.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import { calculateGPA, completionPercent } from '../data/storage.js';

export default function Achievements({ api }) {
  const { courses = [], semesters = [], tasks = [], habits = [], studyLogs = [] } = api.data;
  const current = calculateGPA(courses);
  const bestGpa = Math.max(0, current.gpa, ...semesters.map((s) => Number(s.gpa || 0)));
  const doneTasks = tasks.filter((t) => t.done).length;
  const bestStreak = Math.max(0, ...habits.map((h) => Number(h.streak || 0)));
  const studyHours = studyLogs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const badges = [
    { title: 'First Course Added', text: 'Add at least one course.', unlocked: courses.length > 0 || semesters.length > 0 },
    { title: 'Strong Semester', text: 'Reach 3.75+ GPA once.', unlocked: bestGpa >= 3.75 },
    { title: 'Perfect GPA', text: 'Reach 4.00 GPA once.', unlocked: bestGpa >= 4 },
    { title: 'Task Finisher', text: 'Complete 5 tasks.', unlocked: doneTasks >= 5 },
    { title: 'Habit Builder', text: 'Get a 7-check streak.', unlocked: bestStreak >= 7 },
    { title: 'Focused Student', text: 'Log 10 study hours.', unlocked: studyHours >= 10 },
  ];
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <>
      <Header title="Achievement Badges" />
      <section className="statsGrid three">
        <StatCard label="Unlocked" value={`${unlocked}/${badges.length}`} note="achievement progress" />
        <StatCard label="Task Completion" value={`${completionPercent(doneTasks, tasks.length)}%`} note="badge helper" tone="green" />
        <StatCard label="Best GPA" value={bestGpa.toFixed(2)} note="academic milestone" tone="purple" />
      </section>
      <Card>
        <div className="badgeGrid">
          {badges.map((b) => <div className={`badgeCard ${b.unlocked ? 'unlocked' : ''}`} key={b.title}><div className="badgeIcon">{b.unlocked ? '✓' : '○'}</div><h4>{b.title}</h4><p>{b.text}</p><span>{b.unlocked ? 'Unlocked' : 'Locked'}</span></div>)}
        </div>
      </Card>
    </>
  );
}
