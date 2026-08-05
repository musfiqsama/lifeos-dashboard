import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { Field } from '../components/Crud.jsx';
import { buildAnalyticsSnapshot, resolveDateRange } from '../utils/analytics.js';
import { addDaysISO } from '../utils/habits.js';
import { todayLocalISO } from '../utils/date.js';

const presets = [
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['month', 'This month'],
  ['semester', 'This semester'],
  ['custom', 'Custom range'],
  ['all', 'All data'],
];

function dailySeries(data, range) {
  const points = [];
  const byDate = new Map();
  const seriesStart = range.days > 120 ? addDaysISO(range.end, -119) : range.start;
  for (let date = seriesStart; date <= range.end && points.length < 120; date = addDaysISO(date, 1)) {
    const row = { date, label: date.slice(5), Study: 0, Focus: 0, Tasks: 0 };
    byDate.set(date, row);
    points.push(row);
  }
  (data.studyLogs || []).forEach((item) => {
    const date = String(item.date || '').slice(0, 10);
    if (byDate.has(date)) byDate.get(date).Study += Number((Number(item.minutes || 0) / 60).toFixed(2));
  });
  (data.focusSessions || []).forEach((item) => {
    const date = String(item.dateISO || item.completedAt || '').slice(0, 10);
    if (byDate.has(date)) byDate.get(date).Focus += Number((Number(item.minutes || 0) / 60).toFixed(2));
  });
  (data.tasks || []).forEach((item) => {
    const date = String(item.updatedAt || item.due || '').slice(0, 10);
    if (byDate.has(date) && (item.done || item.status === 'Completed')) byDate.get(date).Tasks += 1;
  });
  return points;
}

function changeLabel(value, suffix = '%') {
  const number = Number(value) || 0;
  if (!number) return `No change${suffix === ' pts' ? '' : ''}`;
  return `${number > 0 ? '+' : ''}${number}${suffix}`;
}

export default function Analytics({ api, setPage }) {
  const [preset, setPreset] = useState('30d');
  const [customStart, setCustomStart] = useState(todayLocalISO());
  const [customEnd, setCustomEnd] = useState(todayLocalISO());
  const range = useMemo(() => resolveDateRange(preset, customStart, customEnd, todayLocalISO(), api.data.semesters || []), [preset, customStart, customEnd, api.data.semesters]);
  const snapshot = useMemo(() => buildAnalyticsSnapshot(api.data, range), [api.data, range]);
  const series = useMemo(() => dailySeries(api.data, range), [api.data, range]);
  const semesterTrend = (api.data.semesters || []).map((item, index) => ({ name: item.name || `S${index + 1}`, GPA: Number(item.gpa || 0) }));
  const strongest = [...snapshot.productivity.factors].filter((item) => item.available).sort((a, b) => b.value - a.value)[0];
  const weakest = [...snapshot.productivity.factors].filter((item) => item.available).sort((a, b) => a.value - b.value)[0];

  return (
    <>
      <Header title="Advanced Analytics" subtitle="Compare periods, inspect transparent scores and find the courses that need attention." />

      <Card className="analyticsFilterCard noPrint">
        <div className="analyticsFilters">
          <Field label="Date range">
            <select value={preset} onChange={(event) => setPreset(event.target.value)}>{presets.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          </Field>
          {preset === 'custom' ? <><Field label="Start"><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></Field><Field label="End"><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></Field></> : null}
          <div className="rangeSummary"><strong>{range.label}</strong><span>{range.start} → {range.end} · {range.days} day{range.days === 1 ? '' : 's'}</span></div>
        </div>
      </Card>

      <section className="statsGrid five">
        <StatCard label="Productivity Score" value={`${snapshot.productivity.score}%`} note="available factors reweighted" />
        <StatCard label="Study Time" value={`${(snapshot.current.study / 60).toFixed(1)}h`} note={`${changeLabel(snapshot.comparison.studyChange)} vs previous`} tone="green" />
        <StatCard label="Focus Time" value={`${(snapshot.current.focus / 60).toFixed(1)}h`} note={`${changeLabel(snapshot.comparison.focusChange)} vs previous`} tone="purple" />
        <StatCard label="Completed Tasks" value={snapshot.current.completedTasks} note={`${changeLabel(snapshot.comparison.completedTaskChange)} vs previous`} tone="orange" />
        <StatCard label="Attendance" value={`${snapshot.current.attendance.toFixed(1)}%`} note={`${changeLabel(snapshot.comparison.attendanceChange, ' pts')} vs previous`} tone="blue" />
      </section>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Productivity Breakdown</h3><p>Score uses only factors that have data in the selected range.</p></div><strong>{snapshot.productivity.score}%</strong></div>
          <div className="factorList">{snapshot.productivity.factors.map((factor) => <div className={`factorRow ${factor.available ? '' : 'mutedFactor'}`} key={factor.key}><div><strong>{factor.label}</strong><span>{factor.available ? factor.detail : 'No data in range'}</span></div><div className="factorMeter"><i style={{ width: `${factor.available ? factor.value : 0}%` }} /><span>{factor.available ? `${factor.value}% · weight ${factor.weight}` : 'Not scored'}</span></div></div>)}</div>
        </Card>
        <Card>
          <h3>Strongest & Weakest Areas</h3>
          {!strongest ? <EmptyState title="No scored activity" text="Add tasks, habits, attendance or study sessions to calculate a score." /> : <div className="planningInsightList"><div><span>Strongest area</span><strong className="safeText">{strongest.label} · {strongest.value}%</strong></div><div><span>Weakest area</span><strong className="riskText">{weakest.label} · {weakest.value}%</strong></div><div><span>Overall CGPA</span><strong>{snapshot.cumulative.gpa.toFixed(2)}</strong></div><div><span>Counted credits</span><strong>{snapshot.cumulative.credits}</strong></div></div>}
        </Card>
      </section>

      <section className="twoCol">
        <Card><h3>Study, Focus & Completed Tasks</h3>{series.some((item) => item.Study || item.Focus || item.Tasks) ? <div className="chartBox"><ResponsiveContainer width="100%" height={280}><LineChart data={series}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip/><Line type="monotone" dataKey="Study" strokeWidth={3}/><Line type="monotone" dataKey="Focus" strokeWidth={3}/><Line type="monotone" dataKey="Tasks" strokeWidth={3}/></LineChart></ResponsiveContainer></div> : <EmptyState title="No dated activity" text="Log study, focus or completed tasks inside the selected range." />}</Card>
        <Card><h3>Semester GPA Trend</h3>{semesterTrend.length ? <div className="chartBox"><ResponsiveContainer width="100%" height={280}><LineChart data={semesterTrend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis domain={[0, 4]}/><Tooltip/><Line type="monotone" dataKey="GPA" strokeWidth={4} dot={{ r: 5 }}/></LineChart></ResponsiveContainer></div> : <EmptyState title="No semester history" text="Save semesters in Academic to unlock GPA trends." />}</Card>
      </section>

      <Card>
        <div className="cardHead"><div><h3>Course Health</h3><p>Dynamic score from attendance, tasks, study, exam readiness and knowledge coverage.</p></div></div>
        {snapshot.courseHealth.length ? <div className="tableWrap"><table className="dataTable"><thead><tr><th>Course</th><th>Health</th><th>Grade</th><th>Attendance</th><th>Task Progress</th><th>Pending</th><th>Study</th><th>Exam Ready</th><th>Knowledge</th></tr></thead><tbody>{snapshot.courseHealth.map((item) => <tr key={item.id}><td><strong>{item.code || '—'}</strong><br/><span>{item.name}</span></td><td><strong className={item.score < 50 ? 'riskText' : item.score >= 75 ? 'safeText' : ''}>{item.score}%</strong></td><td>{item.grade || '—'}</td><td>{item.attendance ? `${item.attendance.toFixed(1)}%` : '—'}</td><td>{item.taskProgress ? `${item.taskProgress}%` : '—'}</td><td>{item.pendingTasks}</td><td>{item.studyMinutes} min</td><td>{item.examReadiness ? `${item.examReadiness}%` : '—'}</td><td>{item.notes + item.resources}</td></tr>)}</tbody></table></div> : <EmptyState title="No course-linked data" text="Link attendance, tasks, study logs, exams, notes or resources to courses." />}
      </Card>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Smart Insights</h3><p>Transparent rule-based observations—no AI or hidden scoring.</p></div></div>
          <div className="insightList">{snapshot.insights.map((item) => <button type="button" className={`insightCard ${item.severity}`} key={item.id} onClick={() => setPage(item.page)}><span>{item.severity}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></button>)}</div>
        </Card>
        <Card><h3>Course Health Distribution</h3>{snapshot.courseHealth.length ? <div className="chartBox"><ResponsiveContainer width="100%" height={280}><BarChart data={snapshot.courseHealth.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="code"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="score" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div> : <EmptyState title="No course scores" text="Course-linked data will appear here." />}</Card>
      </section>
    </>
  );
}
