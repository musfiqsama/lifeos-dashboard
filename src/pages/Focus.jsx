import { useMemo } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { entityTimestamps } from '../utils/entity.js';
import { defaultTimerSettings, defaultTimerState, focusMinutesToday, normalizeTimerSettings, normalizeTimerState } from '../utils/focus.js';
import { taskProgress, taskScheduleState } from '../utils/planning.js';

export default function Focus({ api, setPage }) {
  const tasks = api.data.tasks || [];
  const sessions = api.data.focusSessions || [];
  const settings = normalizeTimerSettings(api.data.timerSettings?.[0] || defaultTimerSettings);
  const timer = normalizeTimerState(api.data.activeTimer?.[0] || defaultTimerState, settings);
  const courses = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const pending = useMemo(() => tasks.filter((task) => !['Completed', 'Archived'].includes(taskScheduleState(task))).sort((a, b) => {
    const priority = { High: 0, Medium: 1, Low: 2 };
    return (priority[a.priority] ?? 3) - (priority[b.priority] ?? 3) || String(a.due || '9999').localeCompare(String(b.due || '9999'));
  }).slice(0, 6), [tasks]);
  const todayMinutes = focusMinutesToday(sessions);
  const dailyProgress = Math.min(100, Math.round((todayMinutes / settings.dailyGoalMinutes) * 100));
  const selectedTask = tasks.find((task) => task.id === timer.taskId);
  const selectedCourse = courses.find((course) => course.id === timer.courseId);

  const chooseTask = (task) => {
    api.update('activeTimer', [{ ...timer, taskId: task.id, courseId: task.courseId || timer.courseId || '', topic: task.title }]);
    api.notify(`${task.title} added to the focus timer.`, 'success', 'Focus queue updated');
  };
  const startSelected = (task = selectedTask) => {
    if (task) api.update('activeTimer', [{ ...timer, taskId: task.id, courseId: task.courseId || timer.courseId || '', topic: task.title }]);
    setPage('timer');
  };
  const completeTask = (task) => {
    api.update('tasks', tasks.map((item) => item.id === task.id ? { ...item, done: true, status: 'Completed', progress: 100, ...entityTimestamps(item) } : item));
    api.notify(`${task.title} completed.`, 'success');
  };

  return (
    <>
      <Header title="Focus Mode" subtitle="Choose one priority, remove distractions and continue directly in the persistent Pomodoro timer." />
      <section className="statsGrid four">
        <StatCard label="Pending Tasks" value={pending.length} note="priority queue" />
        <StatCard label="Today Focus" value={`${todayMinutes}m`} note={`${dailyProgress}% of goal`} tone="green" />
        <StatCard label="Completed Sessions" value={sessions.length} note="focus history" tone="purple" />
        <StatCard label="Selected Context" value={selectedTask ? 'Task' : selectedCourse ? 'Course' : 'None'} note={selectedTask?.title || selectedCourse?.code || 'Choose below'} tone="orange" />
      </section>
      <section className="twoCol wideLeft">
        <Card className="focusPanel focusHeroCard">
          <p className="eyebrow">Current Focus Intention</p>
          <h2>{selectedTask?.title || timer.topic || selectedCourse?.name || 'Choose one meaningful task'}</h2>
          <p>{selectedTask ? `${selectedTask.priority || 'Medium'} priority · ${taskProgress(selectedTask)}% complete · due ${selectedTask.due || 'not set'}` : selectedCourse ? courseLabel(selectedCourse) : 'Your timer context will appear here.'}</p>
          <div className="progress"><span style={{ width: `${dailyProgress}%` }} /></div><small>{todayMinutes}/{settings.dailyGoalMinutes} daily focus minutes</small>
          <div className="timerButtons"><button type="button" className="primaryBtn" onClick={() => startSelected()} disabled={!selectedTask && !selectedCourse && !timer.topic}>Open Focus Timer</button><button type="button" className="ghostBtn" onClick={() => setPage('analyzer')}>Study Analyzer</button></div>
        </Card>
        <Card>
          <h3>Distraction-Free Checklist</h3>
          <ul className="focusChecklist"><li>Choose one task only</li><li>Close unrelated tabs and notifications</li><li>Set a clear topic or outcome</li><li>Work until the timer ends</li><li>Review the session in Study Analyzer</li></ul>
          <div className="timerContextSummary"><span>Course</span><strong>{selectedCourse ? courseLabel(selectedCourse) : 'Not linked'}</strong><span>Timer plan</span><strong>{settings.focusMinutes}m focus / {settings.shortBreakMinutes}m break</strong></div>
        </Card>
      </section>
      <Card>
        <div className="cardHead"><div><h3>Priority Focus Queue</h3><p>High-priority and near-due tasks appear first.</p></div><button type="button" className="ghostBtn" onClick={() => setPage('tasks')}>Manage Tasks</button></div>
        {pending.length === 0 ? <EmptyState title="No pending tasks" text="Add tasks first, or open the timer and focus on a course/topic directly." /> : <div className="taskList">{pending.map((task) => <article className={`taskItem taskItemExpanded ${selectedTask?.id === task.id ? 'selectedFocusTask' : ''}`} key={task.id}><div className="pill">{task.priority || 'Medium'}</div><div><h4>{task.title}</h4><p>{taskScheduleState(task)} · {taskProgress(task)}% · {task.due || 'No due date'}</p></div><div className="itemActions"><button type="button" className="ghostBtn" onClick={() => chooseTask(task)}>Select</button><button type="button" className="primaryBtn" onClick={() => startSelected(task)}>Focus</button><button type="button" className="ghostBtn" onClick={() => completeTask(task)}>Complete</button></div></article>)}</div>}
      </Card>
    </>
  );
}
