import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Analyzer({ api }) {
  const logs = api.data.studyLogs || [];
  const total = logs.reduce((sum, l) => sum + Number(l.hours || 0), 0);
  const avg = logs.length ? total / logs.length : 0;
  const score = Math.min(100, Math.round((avg / 4) * 100));
  const insight = score >= 75 ? 'Strong consistency. Keep this weekly rhythm.' : score >= 45 ? 'Good start. Try to add one more focused session.' : 'Low study data. Add daily hours to unlock better insight.';

  const addLog = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const log = { id: uid(), date: form.get('date') || new Date().toISOString().slice(0, 10), subject: form.get('subject'), hours: Number(form.get('hours') || 0) };
    if (!log.hours) return;
    api.update('studyLogs', [...logs, log]);
    api.activity?.(`Study log added: ${log.hours}h`);
    e.currentTarget.reset();
  };

  const remove = (id) => api.update('studyLogs', logs.filter((l) => l.id !== id));
  const chartData = logs.slice(-7).map((l) => ({ name: l.date.slice(5), Hours: l.hours }));

  return (
    <>
      <Header title="Study Analyzer" />
      <section className="statsGrid three">
        <StatCard label="Study Hours" value={total.toFixed(1)} note="total logged" tone="blue" />
        <StatCard label="Daily Average" value={avg.toFixed(1)} note="hours per log" tone="green" />
        <StatCard label="Productivity" value={`${score}%`} note="logic-based score" tone="purple" />
      </section>

      <section className="twoCol wideLeft">
        <Card>
          <div className="cardHead"><div><h3>Add Study Log</h3><p>Record focused hours by date and subject.</p></div></div>
          <form className="formGrid" onSubmit={addLog}>
            <input name="subject" placeholder="Subject or topic" />
            <input name="hours" type="number" step="0.25" min="0" placeholder="Hours" />
            <input name="date" type="date" />
            <button className="primaryBtn">Save Log</button>
          </form>
        </Card>
        <Card>
          <h3>Smart Insight</h3>
          <div className="summaryBig">{score}%</div>
          <p>{insight}</p>
        </Card>
      </section>

      <section className="twoCol">
        <Card>
          <h3>Last 7 Logs</h3>
          {chartData.length === 0 ? <EmptyState title="No study logs" text="Add study hours to see your weekly effort chart." /> : (
            <div className="chartBox"><ResponsiveContainer width="100%" height={230}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="Hours" radius={[10,10,0,0]} /></BarChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card>
          <h3>Recent Logs</h3>
          {logs.length === 0 ? <EmptyState title="Nothing yet" text="Your logged study sessions will appear here." /> : (
            <div className="taskList">{logs.slice().reverse().slice(0,6).map((l) => <div className="taskItem" key={l.id}><div className="pill">{l.hours}h</div><div><h4>{l.subject || 'Study Session'}</h4><p>{l.date}</p></div><button className="dangerBtn" onClick={() => remove(l.id)}>Delete</button></div>)}</div>
          )}
        </Card>
      </section>
    </>
  );
}
