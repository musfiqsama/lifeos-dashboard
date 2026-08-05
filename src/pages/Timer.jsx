import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { todayLocalISO } from '../utils/date.js';
import { entityTimestamps } from '../utils/entity.js';
import {
  defaultTimerSettings,
  defaultTimerState,
  durationForMode,
  focusMinutesToday,
  formatTimer,
  nextBreakMode,
  normalizeTimerSettings,
  normalizeTimerState,
  remainingTimerSeconds,
} from '../utils/focus.js';

function playCompletionSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
    oscillator.start(); oscillator.stop(context.currentTime + 0.45);
  } catch { /* sound is optional */ }
}

export default function Timer({ api }) {
  const settings = normalizeTimerSettings(api.data.timerSettings?.[0] || defaultTimerSettings);
  const timer = normalizeTimerState(api.data.activeTimer?.[0] || defaultTimerState, settings);
  const sessions = api.data.focusSessions || [];
  const tasks = api.data.tasks || [];
  const courseCatalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const [seconds, setSeconds] = useState(() => remainingTimerSeconds(timer));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(settings);
  const [viewing, setViewing] = useState(null);
  const handledCompletion = useRef('');

  const updateTimer = useCallback((patch) => {
    const current = normalizeTimerState(api.data.activeTimer?.[0] || defaultTimerState, normalizeTimerSettings(api.data.timerSettings?.[0] || defaultTimerSettings));
    api.update('activeTimer', [{ ...current, ...patch }]);
  }, [api]);

  const completeTimer = useCallback(() => {
    const currentSettings = normalizeTimerSettings(api.data.timerSettings?.[0] || defaultTimerSettings);
    const currentTimer = normalizeTimerState(api.data.activeTimer?.[0] || defaultTimerState, currentSettings);
    const completionKey = `${currentTimer.mode}:${currentTimer.startedAt}:${currentTimer.endsAt}`;
    if (!currentTimer.running || handledCompletion.current === completionKey) return;
    handledCompletion.current = completionKey;
    const now = new Date();
    const completedAt = now.toISOString();
    const dateISO = todayLocalISO();
    const completedFocus = currentTimer.mode === 'focus';
    const completedMinutes = durationForMode(currentTimer.mode, currentSettings);
    const nextCycleCount = completedFocus ? currentTimer.cycleCount + 1 : currentTimer.cycleCount;
    const nextMode = completedFocus ? nextBreakMode(nextCycleCount, currentSettings) : 'focus';
    const autoStart = completedFocus ? currentSettings.autoStartBreak : currentSettings.autoStartFocus;
    const nextSeconds = durationForMode(nextMode, currentSettings) * 60;
    const nextTimer = {
      ...currentTimer,
      mode: nextMode,
      running: autoStart,
      remainingSeconds: nextSeconds,
      endsAt: autoStart ? new Date(Date.now() + nextSeconds * 1000).toISOString() : '',
      startedAt: autoStart ? completedAt : '',
      cycleCount: nextCycleCount,
      topic: completedFocus ? currentTimer.topic : currentTimer.topic,
    };

    api.setData((previous) => {
      if (!completedFocus) return { ...previous, activeTimer: [nextTimer] };
      const sessionId = uid();
      const session = {
        id: sessionId,
        minutes: completedMinutes,
        plannedMinutes: currentSettings.focusMinutes,
        dateISO,
        startedAt: currentTimer.startedAt || new Date(now.getTime() - completedMinutes * 60000).toISOString(),
        completedAt,
        taskId: currentTimer.taskId || '',
        courseId: currentTimer.courseId || '',
        topic: currentTimer.topic || '',
        notes: '', rating: 3, source: 'pomodoro', ...entityTimestamps(),
      };
      const linkedCourse = courseCatalog.find((course) => course.id === currentTimer.courseId);
      const linkedTask = tasks.find((task) => task.id === currentTimer.taskId);
      const studyLog = {
        id: uid(), date: dateISO, startTime: '', endTime: '', subject: linkedCourse?.name || linkedTask?.title || 'Pomodoro Focus',
        topic: currentTimer.topic || linkedTask?.title || '', minutes: completedMinutes, hours: Number((completedMinutes / 60).toFixed(2)), rating: 3,
        notes: '', courseId: currentTimer.courseId || '', taskId: currentTimer.taskId || '', method: 'Pomodoro', location: '', distractionLevel: 2,
        source: 'pomodoro', focusSessionId: sessionId, ...entityTimestamps(),
      };
      return {
        ...previous,
        focusSessions: [session, ...(previous.focusSessions || [])],
        studyLogs: currentSettings.logToAnalyzer ? [...(previous.studyLogs || []), studyLog] : previous.studyLogs,
        activeTimer: [nextTimer],
      };
    });
    if (currentSettings.soundEnabled) playCompletionSound();
    api.activity?.(completedFocus ? `Focus session completed: ${completedMinutes} minutes` : `${currentTimer.mode === 'longBreak' ? 'Long' : 'Short'} break completed`);
    api.notify(completedFocus ? `${completedMinutes}-minute focus session saved${currentSettings.logToAnalyzer ? ' to Focus History and Study Analyzer' : ''}.` : 'Break complete. Ready for the next focus session.', 'success', completedFocus ? 'Focus complete' : 'Break complete');
  }, [api, courseCatalog, tasks]);

  useEffect(() => {
    setSeconds(remainingTimerSeconds(timer));
    if (!timer.running) return undefined;
    const tick = () => {
      const remaining = remainingTimerSeconds(timer);
      setSeconds(remaining);
      if (remaining <= 0) completeTimer();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [completeTimer, timer.endsAt, timer.mode, timer.running, timer.remainingSeconds, timer.startedAt]);

  const start = () => {
    const remaining = Math.max(1, remainingTimerSeconds(timer) || durationForMode(timer.mode, settings) * 60);
    handledCompletion.current = '';
    updateTimer({ running: true, remainingSeconds: remaining, endsAt: new Date(Date.now() + remaining * 1000).toISOString(), startedAt: timer.startedAt || new Date().toISOString() });
  };
  const pause = () => updateTimer({ running: false, remainingSeconds: remainingTimerSeconds(timer), endsAt: '' });
  const reset = () => {
    const duration = durationForMode(timer.mode, settings) * 60;
    handledCompletion.current = '';
    updateTimer({ running: false, remainingSeconds: duration, endsAt: '', startedAt: '' });
    setSeconds(duration);
  };
  const switchMode = (nextMode) => {
    const duration = durationForMode(nextMode, settings) * 60;
    handledCompletion.current = '';
    updateTimer({ mode: nextMode, running: false, remainingSeconds: duration, endsAt: '', startedAt: '' });
    setSeconds(duration);
  };
  const updateContext = (patch) => updateTimer(patch);
  const saveSettings = (event) => {
    event.preventDefault();
    const next = normalizeTimerSettings(settingsDraft);
    api.update('timerSettings', [next]);
    if (!timer.running) {
      const duration = durationForMode(timer.mode, next) * 60;
      api.update('activeTimer', [{ ...timer, remainingSeconds: duration, endsAt: '' }]);
      setSeconds(duration);
    }
    setSettingsOpen(false);
    api.notify('Pomodoro settings saved.', 'success');
  };
  const removeSession = async (session) => {
    if (!await api.confirm({ title: 'Delete focus session?', message: `${session.minutes} minutes will be removed from Focus History. Any linked Study Analyzer log will remain.`, confirmLabel: 'Delete session', danger: true })) return;
    api.update('focusSessions', sessions.filter((item) => item.id !== session.id));
    api.notify('Focus session deleted.', 'success');
  };

  const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0);
  const todayMinutes = focusMinutesToday(sessions);
  const dailyProgress = Math.min(100, Math.round((todayMinutes / settings.dailyGoalMinutes) * 100));
  const selectedTask = tasks.find((task) => task.id === timer.taskId);
  const selectedCourse = courseCatalog.find((course) => course.id === timer.courseId);
  const modeLabel = timer.mode === 'focus' ? 'Focus' : timer.mode === 'longBreak' ? 'Long Break' : 'Short Break';
  const sessionGroups = useMemo(() => sessions.slice(0, 12), [sessions]);

  return (
    <>
      <Header title="Persistent Pomodoro" subtitle="Run custom focus cycles that survive refreshes and connect to tasks, courses and Study Analyzer." />
      <section className="statsGrid four">
        <StatCard label="Today Focus" value={`${todayMinutes}m`} note={`${dailyProgress}% of ${settings.dailyGoalMinutes}m goal`} tone="blue" />
        <StatCard label="Completed Sessions" value={sessions.length} note={`${totalMinutes} total minutes`} tone="green" />
        <StatCard label="Current Cycle" value={timer.cycleCount} note={`long break every ${settings.sessionsBeforeLongBreak}`} tone="purple" />
        <StatCard label="Current Mode" value={modeLabel} note={`${durationForMode(timer.mode, settings)} minute plan`} tone="orange" />
      </section>
      <section className="twoCol wideLeft">
        <Card className="timerCard persistentTimerCard">
          <div className="rowBetween"><div><p className="eyebrow">{modeLabel}</p><h3>{selectedTask?.title || selectedCourse?.name || timer.topic || 'Ready to focus'}</h3></div><button type="button" className="ghostBtn" onClick={() => { setSettingsDraft(settings); setSettingsOpen(true); }}>Settings</button></div>
          <div className="timerDisplay">{formatTimer(seconds)}</div>
          <div className="progress timerGoalProgress"><span style={{ width: `${dailyProgress}%` }} /></div><small>{todayMinutes}/{settings.dailyGoalMinutes} daily focus minutes</small>
          <div className="timerButtons">
            <button type="button" className="primaryBtn" onClick={timer.running ? pause : start}>{timer.running ? 'Pause' : 'Start'}</button>
            <button type="button" className="ghostBtn" onClick={reset}>Reset</button>
            <button type="button" className="ghostBtn" onClick={() => switchMode(timer.mode === 'focus' ? 'shortBreak' : 'focus')}>Switch</button>
          </div>
          <div className="timerModeTabs">
            <button type="button" className={timer.mode === 'focus' ? 'active' : ''} onClick={() => switchMode('focus')}>Focus</button>
            <button type="button" className={timer.mode === 'shortBreak' ? 'active' : ''} onClick={() => switchMode('shortBreak')}>Short Break</button>
            <button type="button" className={timer.mode === 'longBreak' ? 'active' : ''} onClick={() => switchMode('longBreak')}>Long Break</button>
          </div>
        </Card>
        <Card>
          <h3>Session Context</h3><p>Linking context makes Focus History and Study Analyzer more useful.</p>
          <div className="formGrid timerContextForm">
            <Field label="Task"><select value={timer.taskId || ''} onChange={(event) => updateContext({ taskId: event.target.value })}><option value="">Not linked</option>{tasks.filter((task) => task.status !== 'Archived').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
            <Field label="Course"><select value={timer.courseId || ''} onChange={(event) => updateContext({ courseId: event.target.value })}><option value="">Not linked</option>{courseCatalog.map((course) => <option key={course.id} value={course.id}>{courseLabel(course)}</option>)}</select></Field>
            <Field label="Topic" full><input value={timer.topic || ''} onChange={(event) => updateContext({ topic: event.target.value })} placeholder="Chapter, topic or focus intention" /></Field>
          </div>
          <div className="timerContextSummary"><span>Task</span><strong>{selectedTask?.title || 'Not linked'}</strong><span>Course</span><strong>{selectedCourse ? courseLabel(selectedCourse) : 'Not linked'}</strong></div>
        </Card>
      </section>
      <Card>
        <div className="cardHead"><div><h3>Focus Session History</h3><p>Completed focus blocks are stored separately from break cycles.</p></div></div>
        {sessionGroups.length === 0 ? <EmptyState title="No completed focus sessions" text="Complete a focus timer to create your first persistent session record." /> : <div className="taskList crudList">{sessionGroups.map((session) => {
          const task = tasks.find((item) => item.id === session.taskId);
          const course = courseCatalog.find((item) => item.id === session.courseId);
          return <article className="taskItem taskItemExpanded" key={session.id}><div className="pill">{session.minutes}m</div><div><h4>{session.topic || task?.title || course?.name || 'Focus Session'}</h4><p>{session.dateISO || String(session.completedAt || '').slice(0, 10)} · {task?.title || 'No task'} · {course ? courseLabel(course) : 'No course'}</p></div><ItemActions onView={() => setViewing(session)} onDelete={() => removeSession(session)} /></article>;
        })}</div>}
      </Card>
      <Modal open={settingsOpen} wide title="Pomodoro Settings" onClose={() => setSettingsOpen(false)} actions={<><button type="button" className="ghostBtn" onClick={() => setSettingsOpen(false)}>Cancel</button><button className="primaryBtn" type="submit" form="timer-settings-form">Save Settings</button></>}>
        <form id="timer-settings-form" className="formGrid modalForm" onSubmit={saveSettings}>
          <Field label="Focus minutes"><input type="number" min="1" max="180" value={settingsDraft.focusMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, focusMinutes: event.target.value })} /></Field>
          <Field label="Short break minutes"><input type="number" min="1" max="60" value={settingsDraft.shortBreakMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, shortBreakMinutes: event.target.value })} /></Field>
          <Field label="Long break minutes"><input type="number" min="1" max="90" value={settingsDraft.longBreakMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, longBreakMinutes: event.target.value })} /></Field>
          <Field label="Focus sessions before long break"><input type="number" min="1" max="12" value={settingsDraft.sessionsBeforeLongBreak} onChange={(event) => setSettingsDraft({ ...settingsDraft, sessionsBeforeLongBreak: event.target.value })} /></Field>
          <Field label="Daily focus goal (minutes)"><input type="number" min="1" max="1440" value={settingsDraft.dailyGoalMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, dailyGoalMinutes: event.target.value })} /></Field>
          <Field label="Automation" full><div className="settingsChecks"><label><input type="checkbox" checked={settingsDraft.autoStartBreak} onChange={(event) => setSettingsDraft({ ...settingsDraft, autoStartBreak: event.target.checked })} /> Auto-start breaks</label><label><input type="checkbox" checked={settingsDraft.autoStartFocus} onChange={(event) => setSettingsDraft({ ...settingsDraft, autoStartFocus: event.target.checked })} /> Auto-start focus</label><label><input type="checkbox" checked={settingsDraft.soundEnabled} onChange={(event) => setSettingsDraft({ ...settingsDraft, soundEnabled: event.target.checked })} /> Completion sound</label><label><input type="checkbox" checked={settingsDraft.logToAnalyzer} onChange={(event) => setSettingsDraft({ ...settingsDraft, logToAnalyzer: event.target.checked })} /> Save focus sessions to Study Analyzer</label></div></Field>
        </form>
      </Modal>
      <Modal open={Boolean(viewing)} title="Focus session details" onClose={() => setViewing(null)}>
        {viewing ? <DetailGrid rows={[{ label: 'Minutes', value: viewing.minutes }, { label: 'Date', value: viewing.dateISO || String(viewing.completedAt || '').slice(0, 10) }, { label: 'Topic', value: viewing.topic || 'Not set', full: true }, { label: 'Started', value: viewing.startedAt ? new Date(viewing.startedAt).toLocaleString() : 'Not recorded' }, { label: 'Completed', value: viewing.completedAt ? new Date(viewing.completedAt).toLocaleString() : 'Not recorded' }, { label: 'Task', value: tasks.find((item) => item.id === viewing.taskId)?.title || 'Not linked' }, { label: 'Course', value: courseLabel(courseCatalog.find((item) => item.id === viewing.courseId) || {}) }, { label: 'Source', value: viewing.source || 'pomodoro' }]} /> : null}
      </Modal>
    </>
  );
}
