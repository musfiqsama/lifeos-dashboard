import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { calculateCumulativeGPA, completionPercent, defaultAcademicSettings } from '../data/storage.js';
import { daysUntil, todayLocalISO } from '../utils/date.js';
import { habitCompletedOn, habitPeriodSummary, habitScheduledOn } from '../utils/habits.js';
import { focusMinutesToday } from '../utils/focus.js';
import { calculateAttendanceSummary, groupAttendanceByCourse } from '../utils/attendance.js';
import { buildCourseCatalog } from '../utils/courses.js';
import { examPreparationProgress, goalProgress, taskProgress, taskScheduleState } from '../utils/planning.js';
import { routineEventsForDate } from '../utils/calendar.js';
import { buildReminderCandidates, defaultNotificationSettings } from '../utils/reminders.js';
import { buildAnalyticsSnapshot, evaluateAchievements, resolveDateRange } from '../utils/analytics.js';

const isOverdue = (task) => taskScheduleState(task) === 'Overdue';
const daysLeft = (date) => daysUntil(date) ?? 0;

export default function Dashboard({ api, setPage }) {
  const { courses = [], semesters = [], academicSettings = [], attendanceRecords = [], attendanceTargets = [], tasks = [], goals = [], habits = [], studyLogs = [], routines = [], routineExceptions = [], focusSessions = [], activities = [], exams = [], notes = [], notificationSettings = [], resources = [], recentItems = [] } = api.data;
  const settings = academicSettings[0] || defaultAcademicSettings;
  const courseCatalog = buildCourseCatalog(courses, semesters);
  const targetMap = new Map(attendanceTargets.map((item) => [item.courseId, Number(item.target) || Number(settings.defaultAttendanceTarget || 75)]));
  const attendanceCourses = courseCatalog.map((course) => ({ ...course, attendanceTarget: targetMap.get(course.id) || Number(settings.defaultAttendanceTarget || 75) }));
  const attendanceSummary = calculateAttendanceSummary(attendanceRecords, settings.defaultAttendanceTarget || 75);
  const attendanceByCourse = groupAttendanceByCourse(attendanceRecords, attendanceCourses, settings.defaultAttendanceTarget || 75);
  const attendanceRisk = attendanceByCourse.filter((item) => item.summary.atRisk);
  const cumulative = calculateCumulativeGPA(semesters, settings.gradingScale, settings.retakePolicy);
  const completedTasks = tasks.filter((task) => taskScheduleState(task) === 'Completed').length;
  const activeGoals = goals.filter((goal) => goalProgress(goal, tasks) < 100 && goal.status !== 'Completed').length;
  const averageTaskProgress = tasks.filter((task) => task.status !== 'Archived').length ? Math.round(tasks.filter((task) => task.status !== 'Archived').reduce((sum, task) => sum + taskProgress(task), 0) / tasks.filter((task) => task.status !== 'Archived').length) : 0;
  const todayISO = todayLocalISO();
  const activeHabits = habits.filter((habit) => !habit.archived);
  const scheduledHabits = activeHabits.filter((habit) => habitScheduledOn(habit, todayISO));
  const checkedHabits = scheduledHabits.filter((habit) => habitCompletedOn(habit, todayISO)).length;
  const habitScheduledDays = activeHabits.reduce((sum, habit) => sum + habitPeriodSummary(habit, 7, todayISO).scheduled, 0);
  const habitCompletedDays = activeHabits.reduce((sum, habit) => sum + habitPeriodSummary(habit, 7, todayISO).completed, 0);
  const habitConsistency = completionPercent(habitCompletedDays, habitScheduledDays);
  const studyMinutes = studyLogs.reduce((sum, log) => sum + Number(log.minutes || Number(log.hours || 0) * 60), 0);
  const studyHours = studyMinutes / 60;
  const todayFocusMinutes = focusMinutesToday(focusSessions, todayISO);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayRoutine = routineEventsForDate(routines, routineExceptions, todayISO).filter((item) => item.status !== 'Cancelled').length;
  const reminderSettings = notificationSettings[0] || defaultNotificationSettings;
  const upcomingReminders = buildReminderCandidates(api.data, new Date(), reminderSettings).slice(0, 5);
  const overdue = tasks.filter(isOverdue);
  const upcomingExam = exams.filter((e) => daysLeft(e.date) >= 0).sort((a,b) => a.date.localeCompare(b.date))[0];
  const examPrepRisk = exams.filter((exam) => daysLeft(exam.date) >= 0 && daysLeft(exam.date) <= 7 && examPreparationProgress(exam) < 60).length;
  const pinnedNotes = notes.filter((n) => n.pinned && !n.archived).slice(0, 3);
  const pinnedResources = resources.filter((item) => item.pinned && !item.archived).slice(0, 3);
  const recentKnowledge = recentItems.filter((item) => ['Note', 'Resource'].includes(item.entityType)).slice(0, 4);
  const weeklyRange = resolveDateRange('7d', '', '', todayISO, semesters);
  const weeklySnapshot = buildAnalyticsSnapshot(api.data, weeklyRange);
  const health = weeklySnapshot.productivity.score;
  const achievementBadges = evaluateAchievements(api.data, api.data.achievementRecords || []);
  const unlockedBadges = achievementBadges.filter((item) => item.unlocked);
  const latestAchievement = [...unlockedBadges].filter((item) => item.unlockedAt).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))[0] || unlockedBadges.at(-1);
  const nextAchievement = achievementBadges.filter((item) => !item.unlocked).sort((a, b) => b.progress - a.progress)[0];
  const scoredFactors = weeklySnapshot.productivity.factors.filter((item) => item.available);
  const strongestFactor = [...scoredFactors].sort((a, b) => b.value - a.value)[0];
  const weakestFactor = [...scoredFactors].sort((a, b) => a.value - b.value)[0];
  const trend = semesters.length ? semesters.map((s, i) => ({ name: s.name || `S${i + 1}`, GPA: Number(s.gpa || 0) })) : [{ name: 'Start', GPA: 0 }];
  const studyData = studyLogs.slice(-6).map((l) => ({ name: l.date?.slice(5) || 'Log', Hours: Number((Number(l.minutes || Number(l.hours || 0) * 60) / 60).toFixed(2)) }));

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
        <StatCard label="Overall CGPA" value={cumulative.gpa.toFixed(2)} note={`${cumulative.credits} completed credits`} tone="blue" />
        <StatCard label="Active Goals" value={activeGoals} note={`${goals.length} total goals`} tone="purple" />
        <StatCard label="Task Progress" value={`${averageTaskProgress}%`} note={`${completedTasks}/${tasks.length} completed · ${overdue.length} overdue`} tone="green" />
        <StatCard label="Habit Checks" value={`${checkedHabits}/${scheduledHabits.length}`} note={`${habitConsistency}% over 7 days`} tone="orange" />
      </section>

      <section className="statsGrid four">
        <StatCard label="Study Hours" value={studyHours.toFixed(1)} note={`${todayFocusMinutes} focus min today`} tone="blue" />
        <StatCard label="Attendance" value={`${attendanceSummary.percentage.toFixed(1)}%`} note={`${attendanceRisk.length} course${attendanceRisk.length === 1 ? '' : 's'} at risk`} tone="orange" />
        <StatCard label="Today Routine" value={todayRoutine} note={`${today} · ${upcomingReminders.length} reminder${upcomingReminders.length === 1 ? '' : 's'}`} tone="green" />
        <StatCard label="Next Exam" value={upcomingExam ? `${daysLeft(upcomingExam.date)}d` : '0d'} note={upcomingExam ? `${upcomingExam.title} · ${examPreparationProgress(upcomingExam)}% ready` : 'No exam'} tone="purple" />
      </section>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Academic Trend</h3><p>Saved semester GPA overview</p></div><button type="button" className="ghostBtn" onClick={() => setPage('academic')}>Open Academic</button></div>
          <div className="chartBox"><ResponsiveContainer width="100%" height={230}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 4]} /><Tooltip /><Line type="monotone" dataKey="GPA" strokeWidth={4} dot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
        </Card>
        <Card>
          <div className="cardHead"><div><h3>Quick Actions</h3><p>Jump into your main tools</p></div></div>
          <div className="actionGrid phase2Actions">
            <button type="button" onClick={() => setPage('academic')}>Add Courses</button>
            <button type="button" onClick={() => setPage('tasks')}>Plan Tasks</button>
            <button type="button" onClick={() => setPage('attendance')}>Attendance</button>
            <button type="button" onClick={() => setPage('notes')}>Notes</button>
            <button type="button" onClick={() => setPage('resources')}>Resources</button>
            <button type="button" onClick={() => setPage('calendar')}>Calendar</button>
            <button type="button" onClick={() => setPage('exams')}>Exams</button>
            <button type="button" onClick={() => setPage('analytics')}>Analytics</button>
            <button type="button" onClick={() => setPage('focus')}>Focus Mode</button>
          </div>
        </Card>
      </section>

      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Attendance Watch</h3><p>Course-wise minimum attendance status</p></div><button type="button" className="ghostBtn" onClick={() => setPage('attendance')}>Open Attendance</button></div>
          {attendanceByCourse.filter((item) => item.summary.total).length === 0 ? <EmptyState title="No attendance yet" text="Link routine classes to courses and mark attendance to see warnings." /> : <ul className="miniList attendanceWatchList">{attendanceByCourse.filter((item) => item.summary.total).sort((a,b) => a.summary.percentage - b.summary.percentage).slice(0,5).map((item) => <li key={item.id}><span>{item.code || item.name}</span><strong className={item.summary.atRisk ? 'riskText' : 'safeText'}>{item.summary.percentage.toFixed(1)}%</strong></li>)}</ul>}
        </Card>
        <Card>
          <h3>Study Hours Snapshot</h3>
          {studyData.length === 0 ? <EmptyState title="No study logs" text="Add logs in Analyzer to see weekly effort." /> : <div className="chartBox"><ResponsiveContainer width="100%" height={220}><BarChart data={studyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="Hours" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer></div>}
        </Card>
        <Card>
          <h3>Recent Activity</h3>
          {examPrepRisk ? <p className="riskText">{examPrepRisk} exam plan{examPrepRisk === 1 ? '' : 's'} need preparation attention this week.</p> : null}
          {tasks.length === 0 && goals.length === 0 && habits.length === 0 && activities.length === 0 && pinnedNotes.length === 0 && pinnedResources.length === 0 ? <EmptyState title="No activity yet" text="Add a task, goal, habit or note to make the dashboard come alive." /> : (
            <ul className="miniList">
              {overdue.slice(0, 2).map((t) => <li key={t.id}>Overdue · {t.title}</li>)}
              {upcomingReminders.slice(0, 2).map((reminder) => <li key={reminder.key}>Reminder · {reminder.title} · {reminder.date}{reminder.startTime ? ` ${reminder.startTime}` : ''}</li>)}
              {pinnedNotes.map((n) => <li key={n.id}>Pinned Note · {n.title || 'Untitled'}</li>)}
              {pinnedResources.map((item) => <li key={item.id}>Pinned Resource · {item.title || 'Untitled'}</li>)}
              {activities.slice(0, 4).map((a) => <li key={a.id}>{a.text} · {a.date}</li>)}
            </ul>
          )}
        </Card>
      </section>


      <section className="twoCol">
        <Card>
          <div className="cardHead"><div><h3>Knowledge Hub</h3><p>Recent notes and saved course resources</p></div><button type="button" className="ghostBtn" onClick={() => setPage('notes')}>Open Notes</button></div>
          {notes.length === 0 && resources.length === 0 ? <EmptyState title="No knowledge items" text="Create Markdown notes or save course resources." /> : <ul className="miniList">
            <li><span>Notes</span><strong>{notes.filter((item) => !item.archived).length}</strong></li>
            <li><span>Resources</span><strong>{resources.filter((item) => !item.archived).length}</strong></li>
            <li><span>Pinned knowledge</span><strong>{pinnedNotes.length + pinnedResources.length}</strong></li>
          </ul>}
        </Card>
        <Card>
          <div className="cardHead"><div><h3>Recently Opened</h3><p>Continue your latest knowledge work</p></div><button type="button" className="ghostBtn" onClick={() => setPage('search')}>Search All</button></div>
          {recentKnowledge.length === 0 ? <EmptyState title="Nothing opened yet" text="Open a note or resource to build your recent list." /> : <ul className="miniList">{recentKnowledge.map((item) => <li key={item.id}><span>{item.entityType}</span><strong>{item.title}</strong></li>)}</ul>}
        </Card>
      </section>

      <section className="twoCol dashboardIntelligence">
        <Card>
          <div className="cardHead"><div><h3>Weekly Performance</h3><p>Transparent score for the last 7 days</p></div><button type="button" className="ghostBtn" onClick={() => setPage('analytics')}>Open Analytics</button></div>
          <div className="planningInsightList">
            <div><span>LifeOS productivity</span><strong>{weeklySnapshot.productivity.score}%</strong></div>
            <div><span>Strongest area</span><strong className="safeText">{strongestFactor ? `${strongestFactor.label} · ${strongestFactor.value}%` : 'No scored data'}</strong></div>
            <div><span>Weakest area</span><strong className="riskText">{weakestFactor ? `${weakestFactor.label} · ${weakestFactor.value}%` : 'No scored data'}</strong></div>
            <div><span>Study vs previous week</span><strong>{weeklySnapshot.comparison.studyChange > 0 ? '+' : ''}{weeklySnapshot.comparison.studyChange}%</strong></div>
          </div>
        </Card>
        <Card>
          <div className="cardHead"><div><h3>Achievement Progress</h3><p>Latest unlock and recommended next badge</p></div><button type="button" className="ghostBtn" onClick={() => setPage('achievements')}>View Badges</button></div>
          <div className="planningInsightList">
            <div><span>Unlocked</span><strong>{unlockedBadges.length}/{achievementBadges.length}</strong></div>
            <div><span>Latest achievement</span><strong>{latestAchievement?.title || 'None yet'}</strong></div>
            <div><span>Next badge</span><strong>{nextAchievement?.title || 'All unlocked'}</strong></div>
            <div><span>Next progress</span><strong>{nextAchievement ? `${nextAchievement.progress}%` : '100%'}</strong></div>
          </div>
        </Card>
      </section>

      <Card className="dashboardInsights">
        <div className="cardHead"><div><h3>Important Insights</h3><p>Rule-based signals from attendance, exams, habits, study and workload</p></div><button type="button" className="ghostBtn" onClick={() => setPage('reports')}>Generate Report</button></div>
        <div className="insightList">{weeklySnapshot.insights.slice(0, 4).map((item) => <button type="button" className={`insightCard ${item.severity}`} key={item.id} onClick={() => setPage(item.page)}><span>{item.severity}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></button>)}</div>
      </Card>

    </>
  );
}
