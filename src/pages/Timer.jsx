import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function Timer({ api }) {
  const sessions = api.data.focusSessions || [];
  const [mode, setMode] = useState('focus');
  const [seconds, setSeconds] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds !== 0 || !running) return;
    setRunning(false);
    if (mode === 'focus') {
      const session = { id: uid(), minutes: FOCUS_MINUTES, date: new Date().toLocaleString() };
      api.update('focusSessions', [session, ...sessions]);
      api.activity?.('Focus session completed');
      setMode('break');
      setSeconds(BREAK_MINUTES * 60);
    } else {
      setMode('focus');
      setSeconds(FOCUS_MINUTES * 60);
    }
  }, [seconds, running, mode, sessions, api]);

  const reset = () => {
    setRunning(false);
    setSeconds(mode === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60);
  };
  const switchMode = (next) => {
    setRunning(false);
    setMode(next);
    setSeconds(next === 'focus' ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60);
  };
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const totalMinutes = sessions.reduce((sum, s) => sum + Number(s.minutes || 0), 0);

  return (
    <>
      <Header title="Pomodoro Focus Timer" subtitle="Use focused study sessions and keep a simple record of completed focus time." />
      <section className="statsGrid three">
        <StatCard label="Focus Sessions" value={sessions.length} note="completed" tone="blue" />
        <StatCard label="Focus Minutes" value={totalMinutes} note="total time" tone="green" />
        <StatCard label="Current Mode" value={mode === 'focus' ? 'Focus' : 'Break'} note="25/5 cycle" tone="purple" />
      </section>
      <section className="twoCol">
        <Card className="timerCard">
          <p className="eyebrow">{mode === 'focus' ? 'Deep Work' : 'Short Break'}</p>
          <div className="timerDisplay">{mm}:{ss}</div>
          <div className="timerButtons">
            <button className="primaryBtn" onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
            <button className="ghostBtn" onClick={reset}>Reset</button>
            <button className="ghostBtn" onClick={() => switchMode(mode === 'focus' ? 'break' : 'focus')}>Switch</button>
          </div>
        </Card>
        <Card>
          <h3>Session History</h3>
          {sessions.length === 0 ? <p>No completed focus sessions yet.</p> : <ul className="miniList">{sessions.slice(0, 8).map((s) => <li key={s.id}>{s.minutes} minutes · {s.date}</li>)}</ul>}
        </Card>
      </section>
    </>
  );
}
