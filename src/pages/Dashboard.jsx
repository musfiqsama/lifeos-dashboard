import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { calculateGPA, completionPercent } from '../data/storage.js';

const todayISO = () => new Date().toISOString().slice(0, 10);
const isOverdue = (t) => t.due && t.due < todayISO() && !t.done;
const daysLeft = (date) => Math.ceil((new Date(date + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 86400000);

export default function Dashboard({ api, setPage }) {
  const { courses = [], semesters = [], tasks = [], goals = [], habits = [], studyLogs = [], routines = [], focusSessions = [], activities = [], exams = [], notes = [] } = api.data;
  const current = calculateGPA(courses);
  const completedTasks = tasks.filter((t) => t.done).length;
  const activeGoals = goals.filter((g) => g.status !== 'Completed').length;
  const checkedHabits = habits.filter((h) => h.checked).length;
  const studyHours = studyLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const focusMinutes = focusSessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayRoutine = routines.filter((r) => r.day === today).length;
  const overdue = tasks.filter(isOverdue);
  const upcomingExam = exams.filter((e) => daysLeft(e.date) >= 0).sort((a,b) => a.date.localeCompare(b.date))[0];
  const pinnedNotes = notes.filter((n) => n.pinned).slice(0, 3);
  const productivity = Math.round((completionPercent(completedTasks, tasks.length) * .28) + (completionPercent(checkedHabits, habits.length) * .26) + Math.min(22, studyHours * 1.5) + Math.min(24, current.gpa * 6));
  const health = Math.min(100, Math.max(0, productivity));
  const trend = semesters.length ? semesters.map((s, i) => ({ name: s.name || `S${i + 1}`, GPA: Number(s.gpa || 0) })) : [{ name: 'Start', GPA: 0 }];
  const studyData = studyLogs.slice(-6).map((l) => ({ name: l.date?.slice(5) || 'Log', Hours: Number(l.hours || 0) }));

  return (
    <>
      <Header title="Your LifeOS Dashboard" />
      <section className="heroPanel">
        <div>
          <p className="eyebrow">Today Overview</p>
          <h2>Build your student life system step by step.</h2>
        </div>
        <div className="healthCircle">
          <strong>{health}%</strong>
          <span>Life Score</span>
        </div>
      </section>

      <section className="statsGrid">
        <StatCard label="Current GPA" value={current.gpa.toFixed(2)} note={`${current.credits} active credits`} tone="blue" />
        <StatCard label="Active Goals" value={activeGoals} note={`${goals.length} total goals`} tone="purple" />
        <StatCard label="Tasks Done" value={`${completedTasks}/${tasks.length}`} note={`${overdue.length} overdue`} tone="green" />
        <StatCard label="Habit Checks" value={`${checkedHabits}/${habits.length}`} note="daily consistency" tone="orange" />
      </section>

      <section className="statsGrid three">
        <StatCard label="Study Hours" value={studyHours.toFixed(1)} note="analyzer logs" tone="blue" />
        <StatCard label="Today Routine" value={todayRoutine} note={today} tone="green" />
        <StatCard label="Next Exam" value={upcomingExam ? `${daysLeft(upcomingExam.date)}d` : '0d'} note={upcomingExam?.title || 'No exam'} tone="purple" />
      </section>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Academic Trend</h3><p>Saved semester GPA overview</p></div><button className="ghostBtn" onClick={() => setPage('academic')}>Open Academic</button></div>
          <div className="chartBox"><ResponsiveContainer width="100%" height={230}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 4]} /><Tooltip /><Line type="monotone" dataKey="GPA" strokeWidth={4} dot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
        </Card>
        <Card>
          <div className="cardHead"><div><h3>Quick Actions</h3><p>Jump into your main tools</p></div></div>
          <div className="actionGrid phase2Actions">
            <button onClick={() => setPage('academic')}>Add Courses</button>
            <button onClick={() => setPage('tasks')}>Plan Tasks</button>
            <button onClick={() => setPage('calendar')}>Calendar</button>
            <button onClick={() => setPage('exams')}>Exams</button>
            <button onClick={() => setPage('analytics')}>Analytics</button>
            <button onClick={() => setPage('focus')}>Focus Mode</button>
          </div>
        </Card>
      </section>

      <section className="twoCol">
        <Card>
          <h3>Study Hours Snapshot</h3>
          {studyData.length === 0 ? <EmptyState title="No study logs" text="Add logs in Analyzer to see weekly effort." /> : <div className="chartBox"><ResponsiveContainer width="100%" height={220}><BarChart data={studyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="Hours" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer></div>}
        </Card>
        <Card>
          <h3>Recent Activity</h3>
          {tasks.length === 0 && goals.length === 0 && habits.length === 0 && activities.length === 0 && pinnedNotes.length === 0 ? <EmptyState title="No activity yet" text="Add a task, goal, habit or note to make the dashboard come alive." /> : (
            <ul className="miniList">
              {overdue.slice(0, 2).map((t) => <li key={t.id}>Overdue · {t.title}</li>)}
              {pinnedNotes.map((n) => <li key={n.id}>Pinned Note · {n.title || 'Untitled'}</li>)}
              {activities.slice(0, 4).map((a) => <li key={a.id}>{a.text} · {a.date}</li>)}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
