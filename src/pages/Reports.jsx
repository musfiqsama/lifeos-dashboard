import Header from '../components/Header.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import { calculateGPA, completionPercent } from '../data/storage.js';

export default function Reports({ api }) {
  const { courses, semesters, tasks, goals, habits, notes, studyLogs = [], focusSessions = [] } = api.data;
  const current = calculateGPA(courses);
  const doneTasks = tasks.filter((t) => t.done).length;
  const checkedHabits = habits.filter((h) => h.checked).length;
  const studyHours = studyLogs.reduce((sum, l) => sum + Number(l.hours || 0), 0);
  const focusMinutes = focusSessions.reduce((sum, s) => sum + Number(s.minutes || 0), 0);
  const latestSemester = semesters.at(-1);

  return (
    <>
      <Header title="Reports" subtitle="A simple printable summary of your academic and productivity progress." />
      <section className="statsGrid three noPrint">
        <StatCard label="Task Completion" value={`${completionPercent(doneTasks, tasks.length)}%`} note={`${doneTasks}/${tasks.length} done`} />
        <StatCard label="Study Hours" value={studyHours.toFixed(1)} note="logged in analyzer" tone="green" />
        <StatCard label="Focus Minutes" value={focusMinutes} note="pomodoro sessions" tone="purple" />
      </section>

      <Card className="reportPaper" id="report">
        <div className="reportHeader">
          <div>
            <p className="eyebrow">LifeOS Student Dashboard</p>
            <h2>Academic & Productivity Report</h2>
            <p>Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <button className="primaryBtn noPrint" onClick={() => window.print()}>Print Report</button>
        </div>
        <section className="statsGrid three">
          <StatCard label="Current GPA" value={current.gpa.toFixed(2)} note={`${current.credits} active credits`} />
          <StatCard label="Latest Saved GPA" value={latestSemester ? latestSemester.gpa.toFixed(2) : '0.00'} note={latestSemester?.name || 'No saved semester'} tone="green" />
          <StatCard label="LifeOS Items" value={tasks.length + goals.length + habits.length + notes.length} note="tasks, goals, habits, notes" tone="purple" />
        </section>
        <div className="reportGrid">
          <div><h3>Academic</h3><p>Saved semesters: {semesters.length}</p><p>Active courses: {courses.length}</p></div>
          <div><h3>Productivity</h3><p>Tasks completed: {doneTasks}/{tasks.length}</p><p>Habit checks: {checkedHabits}/{habits.length}</p></div>
          <div><h3>Focus</h3><p>Study hours: {studyHours.toFixed(1)}</p><p>Pomodoro minutes: {focusMinutes}</p></div>
        </div>
        <p className="reportFooter">Made by Sama</p>
      </Card>
    </>
  );
}
