import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import MobileNavigation from './components/MobileNavigation.jsx';
import { ConfirmDialog, ToastStack } from './components/Feedback.jsx';
import ReminderWatcher from './components/ReminderWatcher.jsx';
import Home from './pages/Home.jsx';
import { load, normalizeState, save, starterState, uid } from './data/storage.js';
import { MAX_ACTIVITY_ITEMS, STORAGE_KEY } from './constants/app.js';
import { formatDateTime } from './utils/date.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Academic = lazy(() => import('./pages/Academic.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));
const Tasks = lazy(() => import('./pages/Tasks.jsx'));
const Habits = lazy(() => import('./pages/Habits.jsx'));
const Notes = lazy(() => import('./pages/Notes.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Analyzer = lazy(() => import('./pages/Analyzer.jsx'));
const Routine = lazy(() => import('./pages/Routine.jsx'));
const Attendance = lazy(() => import('./pages/Attendance.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const Timer = lazy(() => import('./pages/Timer.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Achievements = lazy(() => import('./pages/Achievements.jsx'));
const Focus = lazy(() => import('./pages/Focus.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Backup = lazy(() => import('./pages/Backup.jsx'));

function PageLoading() {
  return (
    <section className="pageLoading" role="status" aria-live="polite">
      <div className="loadingShimmer loadingTitle" />
      <div className="loadingGrid">
        <div className="loadingShimmer" />
        <div className="loadingShimmer" />
        <div className="loadingShimmer" />
      </div>
      <span className="srOnly">Loading LifeOS section…</span>
    </section>
  );
}

const pages = {
  home: Home,
  dashboard: Dashboard,
  academic: Academic,
  goals: Goals,
  tasks: Tasks,
  habits: Habits,
  notes: Notes,
  resources: Resources,
  analyzer: Analyzer,
  routine: Routine,
  attendance: Attendance,
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
  const [data, setData] = useState(() => load(STORAGE_KEY, starterState));
  const [toasts, setToasts] = useState([]);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const saveFailureShown = useRef(false);

  const dismissToast = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message, type = 'info', title = '') => {
    const id = uid();
    setToasts((items) => [...items.slice(-3), { id, message, type, title }]);
    window.setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setConfirmRequest({
      title: options?.title || 'Confirm action',
      message: options?.message || 'Are you sure?',
      confirmLabel: options?.confirmLabel || 'Confirm',
      danger: Boolean(options?.danger),
      resolve,
    });
  }), []);

  const resolveConfirm = useCallback((accepted) => {
    setConfirmRequest((current) => {
      current?.resolve(Boolean(accepted));
      return null;
    });
  }, []);

  useEffect(() => {
    const preferences = data.uiPreferences?.[0] || {};
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const applyAppearance = () => {
      const resolvedTheme = preferences.theme === 'system' ? (media?.matches ? 'dark' : 'light') : (preferences.theme || 'light');
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.density = preferences.density || 'comfortable';
      document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? 'true' : 'false';
      document.documentElement.lang = preferences.language === 'bn' ? 'bn' : 'en';
      document.documentElement.style.colorScheme = resolvedTheme;
    };
    applyAppearance();
    media?.addEventListener?.('change', applyAppearance);
    return () => media?.removeEventListener?.('change', applyAppearance);
  }, [data.uiPreferences]);

  useEffect(() => {
    const result = save(STORAGE_KEY, data);
    if (!result.ok && !saveFailureShown.current) {
      saveFailureShown.current = true;
      notify(`Changes could not be saved: ${result.error}`, 'error', 'Storage problem');
    }
    if (result.ok) saveFailureShown.current = false;
  }, [data, notify]);

  const api = useMemo(() => ({
    data,
    setData,
    notify,
    confirm,
    update(key, value) {
      if (!Object.hasOwn(starterState, key) || !Array.isArray(value)) {
        notify(`LifeOS ignored an invalid update for “${key}”.`, 'error', 'Update blocked');
        return;
      }
      setData((previous) => ({ ...previous, [key]: value }));
    },
    activity(text) {
      setData((previous) => ({
        ...previous,
        activities: [
          { id: uid(), text, date: formatDateTime() },
          ...(previous.activities || []),
        ].slice(0, MAX_ACTIVITY_ITEMS),
      }));
    },
    replaceAll(next) {
      setData(normalizeState(next));
    },
    navigationTarget,
    navigate(nextPage, target = null) {
      setNavigationTarget(target ? { ...target, page: nextPage } : null);
      setPage(nextPage);
    },
    consumeNavigationTarget() {
      setNavigationTarget(null);
    },
  }), [confirm, data, navigationTarget, notify]);

  const Page = pages[page] || Dashboard;
  const content = page === 'home'
    ? <Home setPage={setPage} api={api} />
    : (
      <div className="appShell">
        <Sidebar page={page} setPage={setPage} api={api} />
        <main className="content">
          <Suspense fallback={<PageLoading />}>
            <Page api={api} setPage={setPage} />
          </Suspense>
        </main>
        <MobileNavigation page={page} setPage={setPage} api={api} />
      </div>
    );

  return (
    <>
      {content}
      <ReminderWatcher api={api} />
      <ToastStack items={toasts} onDismiss={dismissToast} />
      <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />
    </>
  );
}
