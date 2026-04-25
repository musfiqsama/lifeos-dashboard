import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Academic from './pages/Academic.jsx';
import Goals from './pages/Goals.jsx';
import Tasks from './pages/Tasks.jsx';
import Habits from './pages/Habits.jsx';
import Notes from './pages/Notes.jsx';
import Analyzer from './pages/Analyzer.jsx';
import Routine from './pages/Routine.jsx';
import Calendar from './pages/Calendar.jsx';
import Exams from './pages/Exams.jsx';
import Timer from './pages/Timer.jsx';
import Analytics from './pages/Analytics.jsx';
import Search from './pages/Search.jsx';
import Achievements from './pages/Achievements.jsx';
import Focus from './pages/Focus.jsx';
import Reports from './pages/Reports.jsx';
import Backup from './pages/Backup.jsx';
import { load, save, starterState, uid } from './data/storage.js';

const pages = {
  home: Home,
  dashboard: Dashboard,
  academic: Academic,
  goals: Goals,
  tasks: Tasks,
  habits: Habits,
  notes: Notes,
  analyzer: Analyzer,
  routine: Routine,
  calendar: Calendar,
  exams: Exams,
  timer: Timer,
  analytics: Analytics,
  search: Search,
  achievements: Achievements,
  focus: Focus,
  reports: Reports,
  backup: Backup,
};

export default function App() {
  const [page, setPage] = useState('home');
  const [data, setData] = useState(() => load('lifeos-v2base-final', starterState));

  useEffect(() => save('lifeos-v2base-final', data), [data]);

  const api = useMemo(() => ({
    data,
    setData,
    update(key, value) {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    activity(text) {
      setData((prev) => ({
        ...prev,
        activities: [{ id: uid(), text, date: new Date().toLocaleString() }, ...(prev.activities || [])].slice(0, 20),
      }));
    },
    replaceAll(next) {
      setData({ ...starterState, ...next });
    },
  }), [data]);

  const Page = pages[page] || Dashboard;

  if (page === 'home') return <Home setPage={setPage} api={api} />;

  return (
    <div className="appShell">
      <Sidebar page={page} setPage={setPage} />
      <main className="content">
        <Page api={api} setPage={setPage} />
      </main>
    </div>
  );
}
