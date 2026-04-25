import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { completionPercent } from '../data/storage.js';

const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

export default function Analytics({ api }) {
  const { semesters = [], tasks = [], habits = [], studyLogs = [], courses = [] } = api.data;
  const doneTasks = tasks.filter((t) => t.done).length;
  const checkedHabits = habits.filter((h) => h.checked).length;
  const studyData = studyLogs.slice(-7).map((l) => ({ name: l.date?.slice(5) || 'Log', Hours: Number(l.hours || 0) }));
  const trend = semesters.length ? semesters.map((s, i) => ({ name: s.name || `S${i+1}`, GPA: Number(s.gpa || 0) })) : [{ name: 'Start', GPA: 0 }];
  const gradeData = grades.map((g) => ({ name: g, value: courses.filter((c) => c.grade === g).length })).filter((x) => x.value);
  const productivity = Math.round((completionPercent(doneTasks, tasks.length) * .35) + (completionPercent(checkedHabits, habits.length) * .35) + Math.min(30, studyLogs.reduce((s,l)=>s+Number(l.hours||0),0) * 2));

  return (
    <>
      <Header title="Analytics" subtitle="A full visual summary of academics, tasks, habits and study effort." />
      <section className="statsGrid">
        <StatCard label="Productivity" value={`${productivity}%`} note="combined score" />
        <StatCard label="Task Completion" value={`${completionPercent(doneTasks, tasks.length)}%`} note={`${doneTasks}/${tasks.length} done`} tone="green" />
        <StatCard label="Habit Consistency" value={`${completionPercent(checkedHabits, habits.length)}%`} note={`${checkedHabits}/${habits.length} checked`} tone="purple" />
        <StatCard label="Saved Semesters" value={semesters.length} note="academic history" tone="orange" />
      </section>
      <section className="twoCol">
        <Card><h3>CGPA / GPA Trend</h3><div className="chartBox"><ResponsiveContainer width="100%" height={240}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis domain={[0,4]}/><Tooltip/><Line type="monotone" dataKey="GPA" strokeWidth={4} dot={{ r: 5 }}/></LineChart></ResponsiveContainer></div></Card>
        <Card><h3>Study Hours</h3>{studyData.length === 0 ? <EmptyState title="No study logs" text="Add logs in Analyzer to unlock this chart." /> : <div className="chartBox"><ResponsiveContainer width="100%" height={240}><BarChart data={studyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="Hours" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer></div>}</Card>
      </section>
      <section className="twoCol">
        <Card><h3>Grade Distribution</h3>{gradeData.length === 0 ? <EmptyState title="No grades yet" text="Add courses with grades to see distribution." /> : <div className="chartBox"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={gradeData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>{gradeData.map((_, i) => <Cell key={i}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>}</Card>
        <Card><h3>Insight</h3><div className="summaryBig">{productivity}%</div><p>{productivity >= 75 ? 'Strong productivity. Keep your rhythm stable.' : productivity >= 45 ? 'Good base. Complete more tasks and habits to improve.' : 'Start by adding tasks, habits and study logs.'}</p></Card>
      </section>
    </>
  );
}
