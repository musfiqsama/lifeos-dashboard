import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { Field } from '../components/Crud.jsx';
import { calculateAttendanceSummary, groupAttendanceByCourse } from '../utils/attendance.js';
import { buildCourseCatalog } from '../utils/courses.js';
import { examPreparationProgress, goalProgress, taskProgress, taskScheduleState } from '../utils/planning.js';
import { habitPeriodSummary } from '../utils/habits.js';
import { todayLocalISO } from '../utils/date.js';
import { normalizeTags, wordCount } from '../utils/knowledge.js';
import { buildAnalyticsSnapshot, REPORT_PRESETS, REPORT_SECTIONS, reportExportRows, resolveDateRange } from '../utils/analytics.js';
import { defaultAcademicSettings, uid } from '../data/storage.js';

const allSections = REPORT_SECTIONS.map((item) => item.id);

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function Reports({ api }) {
  const [title, setTitle] = useState(REPORT_PRESETS.complete.title);
  const [preset, setPreset] = useState('30d');
  const [customStart, setCustomStart] = useState(todayLocalISO());
  const [customEnd, setCustomEnd] = useState(todayLocalISO());
  const [sections, setSections] = useState(allSections);
  const templates = api.data.reportTemplates || [];
  const settings = api.data.academicSettings?.[0] || defaultAcademicSettings;
  const range = useMemo(() => resolveDateRange(preset, customStart, customEnd, todayLocalISO(), api.data.semesters || []), [preset, customStart, customEnd, api.data.semesters]);
  const snapshot = useMemo(() => buildAnalyticsSnapshot(api.data, range), [api.data, range]);

  const catalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const targetMap = new Map((api.data.attendanceTargets || []).map((item) => [item.courseId, Number(item.target) || settings.defaultAttendanceTarget || 75]));
  const attendanceRows = groupAttendanceByCourse(api.data.attendanceRecords || [], catalog.map((course) => ({ ...course, attendanceTarget: targetMap.get(course.id) || settings.defaultAttendanceTarget || 75 })), settings.defaultAttendanceTarget || 75).filter((item) => item.summary.total || item.summary.excused || item.summary.cancelled);
  const attendanceSummary = calculateAttendanceSummary(api.data.attendanceRecords || [], settings.defaultAttendanceTarget || 75);
  const activeTasks = (api.data.tasks || []).filter((item) => item.status !== 'Archived');
  const activeGoals = (api.data.goals || []).filter((item) => item.status !== 'Archived');
  const upcomingExams = (api.data.exams || []).filter((item) => item.date >= todayLocalISO());
  const activeHabits = (api.data.habits || []).filter((item) => !item.archived);
  const habitSummary = activeHabits.reduce((acc, habit) => {
    const summary = habitPeriodSummary(habit, Math.min(range.days, 365), range.end);
    acc.scheduled += summary.scheduled;
    acc.completed += summary.completed;
    return acc;
  }, { scheduled: 0, completed: 0 });
  const activeNotes = (api.data.notes || []).filter((item) => !item.archived);
  const activeResources = (api.data.resources || []).filter((item) => !item.archived);
  const sectionEnabled = (id) => sections.includes(id);

  const applyPreset = (id) => {
    const config = REPORT_PRESETS[id];
    setTitle(config.title);
    setSections(config.sections);
  };

  const toggleSection = (id) => setSections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const saveTemplate = () => {
    const now = new Date().toISOString();
    const template = { id: uid(), title: title.trim() || 'Custom Report', rangePreset: preset, customStart, customEnd, sections, createdAt: now, updatedAt: now };
    api.update('reportTemplates', [template, ...templates].slice(0, 20));
    api.notify('Report template saved.', 'success', 'Reports');
  };

  const loadTemplate = (template) => {
    setTitle(template.title || 'Custom Report');
    setPreset(template.rangePreset || '30d');
    setCustomStart(template.customStart || todayLocalISO());
    setCustomEnd(template.customEnd || todayLocalISO());
    setSections(template.sections?.length ? template.sections : allSections);
    api.notify('Report template loaded.', 'info', 'Reports');
  };

  const deleteTemplate = async (template) => {
    const accepted = await api.confirm({ title: 'Delete report template?', message: `Remove “${template.title}”?`, confirmLabel: 'Delete', danger: true });
    if (accepted) api.update('reportTemplates', templates.filter((item) => item.id !== template.id));
  };

  const exportCSV = () => {
    const rows = reportExportRows(api.data, snapshot);
    downloadFile('lifeos-report.csv', rows.map((row) => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
  };

  const exportJSON = () => downloadFile('lifeos-report.json', JSON.stringify({ app: 'LifeOS', title, generatedAt: new Date().toISOString(), range, sections, snapshot, data: api.data }, null, 2), 'application/json');
  const exportHTML = () => {
    const report = document.getElementById('report-builder-output');
    if (!report) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;max-width:1100px;margin:32px auto;color:#17211b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd7d0;padding:8px;text-align:left}section{margin:24px 0}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.box{border:1px solid #ccd7d0;padding:12px;border-radius:12px}</style></head><body>${report.innerHTML}</body></html>`;
    downloadFile('lifeos-report.html', html, 'text/html;charset=utf-8');
  };

  return (
    <>
      <Header title="Custom Report Builder" subtitle="Choose a time range and sections, save templates, export data or print a PDF-ready report." />

      <Card className="noPrint reportBuilderPanel">
        <div className="presetButtons">{Object.entries(REPORT_PRESETS).map(([id, item]) => <button type="button" className="ghostBtn" onClick={() => applyPreset(id)} key={id}>{item.title}</button>)}</div>
        <div className="formGrid reportBuilderGrid">
          <Field label="Report title" full><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
          <Field label="Date range"><select value={preset} onChange={(event) => setPreset(event.target.value)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="semester">This semester</option><option value="custom">Custom range</option><option value="all">All data</option></select></Field>
          {preset === 'custom' ? <><Field label="Start"><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></Field><Field label="End"><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></Field></> : null}
        </div>
        <div className="reportSectionPicker">{REPORT_SECTIONS.map((item) => <label key={item.id}><input type="checkbox" checked={sections.includes(item.id)} onChange={() => toggleSection(item.id)} /><span>{item.label}</span></label>)}</div>
        <div className="reportActions"><button type="button" className="primaryBtn" onClick={() => window.print()}>Print / Save PDF</button><button type="button" className="ghostBtn" onClick={saveTemplate}>Save Template</button><button type="button" className="ghostBtn" onClick={exportCSV}>Export CSV</button><button type="button" className="ghostBtn" onClick={exportJSON}>Export JSON</button><button type="button" className="ghostBtn" onClick={exportHTML}>Export HTML</button></div>
      </Card>

      {templates.length ? <Card className="noPrint"><div className="cardHead"><div><h3>Saved Templates</h3><p>Reuse your preferred section and date-range setup.</p></div></div><div className="templateList">{templates.map((template) => <div key={template.id}><button type="button" className="templateMain" onClick={() => loadTemplate(template)}><strong>{template.title}</strong><span>{template.sections?.length || 0} sections · {template.rangePreset}</span></button><button type="button" className="dangerBtn" onClick={() => deleteTemplate(template)}>Delete</button></div>)}</div></Card> : null}

      <section className="statsGrid four noPrint">
        <StatCard label="Productivity" value={`${snapshot.productivity.score}%`} note={range.label} />
        <StatCard label="Overall CGPA" value={snapshot.cumulative.gpa.toFixed(2)} note={`${snapshot.cumulative.credits} counted credits`} tone="purple" />
        <StatCard label="Attendance" value={`${attendanceSummary.percentage.toFixed(1)}%`} note={`${attendanceSummary.attended}/${attendanceSummary.total} counted classes`} tone="orange" />
        <StatCard label="Study Time" value={`${(snapshot.current.study / 60).toFixed(1)}h`} note={`${snapshot.current.focus} focus minutes`} tone="green" />
      </section>

      <Card className="reportPaper" id="report-builder-output">
        <div className="reportHeader"><div><p className="eyebrow">LifeOS Student Dashboard</p><h2>{title || 'Custom Report'}</h2><p>Generated {new Date().toLocaleString()} · {range.label} · {range.start} to {range.end}</p></div></div>

        {sectionEnabled('summary') ? <section className="reportSection"><h3>Executive Summary</h3><div className="statsGrid four reportStats"><StatCard label="Productivity" value={`${snapshot.productivity.score}%`} note="transparent weighted score"/><StatCard label="CGPA" value={snapshot.cumulative.gpa.toFixed(2)} note={`${snapshot.cumulative.credits} credits`} tone="purple"/><StatCard label="Study" value={`${(snapshot.current.study / 60).toFixed(1)}h`} note={`${snapshot.comparison.studyChange}% vs previous`} tone="green"/><StatCard label="Attendance" value={`${snapshot.current.attendance.toFixed(1)}%`} note={`${snapshot.comparison.attendanceChange} points vs previous`} tone="orange"/></div></section> : null}

        {sectionEnabled('academic') ? <section className="reportSection"><div className="reportSectionHead"><div><h3>Academic Performance</h3><p>{settings.scaleName} · Retake policy: {settings.retakePolicy === 'all' ? 'all attempts count' : 'latest attempt replaces previous'}</p></div></div>{(api.data.semesters || []).length ? <div className="tableWrap"><table className="dataTable"><thead><tr><th>Semester</th><th>Term</th><th>Status</th><th>Courses</th><th>Credits</th><th>GPA</th></tr></thead><tbody>{api.data.semesters.map((item) => <tr key={item.id}><td>{item.name}</td><td>{[item.term, item.year].filter(Boolean).join(' ') || '—'}</td><td>{item.status || 'Completed'}</td><td>{item.courses?.length || 0}</td><td>{item.credits || 0}</td><td><strong>{Number(item.gpa || 0).toFixed(2)}</strong></td></tr>)}</tbody></table></div> : <p>No saved semesters.</p>}</section> : null}

        {sectionEnabled('attendance') ? <section className="reportSection"><h3>Attendance</h3>{attendanceRows.length ? <div className="tableWrap"><table className="dataTable"><thead><tr><th>Course</th><th>Target</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance</th><th>Status</th></tr></thead><tbody>{attendanceRows.map((item) => <tr key={item.id}><td>{item.code || item.name}</td><td>{item.target}%</td><td>{item.summary.present}</td><td>{item.summary.absent}</td><td>{item.summary.late}</td><td>{item.summary.percentage.toFixed(1)}%</td><td>{item.summary.atRisk ? 'At risk' : 'On target'}</td></tr>)}</tbody></table></div> : <p>No attendance records.</p>}</section> : null}

        {sectionEnabled('planning') ? <section className="reportSection"><h3>Tasks & Goals</h3><div className="tableWrap"><table className="dataTable"><thead><tr><th>Area</th><th>Items</th><th>Average Progress</th><th>Attention</th></tr></thead><tbody><tr><td>Active Tasks</td><td>{activeTasks.length}</td><td>{activeTasks.length ? Math.round(activeTasks.reduce((sum, item) => sum + taskProgress(item), 0) / activeTasks.length) : 0}%</td><td>{activeTasks.filter((item) => taskScheduleState(item) === 'Overdue').length} overdue</td></tr><tr><td>Goals</td><td>{activeGoals.length}</td><td>{activeGoals.length ? Math.round(activeGoals.reduce((sum, item) => sum + goalProgress(item, activeTasks), 0) / activeGoals.length) : 0}%</td><td>{activeGoals.filter((item) => goalProgress(item, activeTasks) < 50).length} below 50%</td></tr></tbody></table></div></section> : null}

        {sectionEnabled('exams') ? <section className="reportSection"><h3>Exam Preparation</h3>{upcomingExams.length ? <div className="tableWrap"><table className="dataTable"><thead><tr><th>Exam</th><th>Date</th><th>Course</th><th>Readiness</th><th>Status</th></tr></thead><tbody>{upcomingExams.map((item) => <tr key={item.id}><td>{item.title || item.subject}</td><td>{item.date}</td><td>{catalog.find((course) => [course.id, course.sourceId].includes(item.courseId))?.code || '—'}</td><td>{examPreparationProgress(item)}%</td><td>{examPreparationProgress(item) >= 100 ? 'Ready' : examPreparationProgress(item) >= 60 ? 'In progress' : 'Needs attention'}</td></tr>)}</tbody></table></div> : <p>No upcoming exams.</p>}</section> : null}

        {sectionEnabled('habits') ? <section className="reportSection"><h3>Habits</h3><p>{habitSummary.completed}/{habitSummary.scheduled} scheduled habit days completed in the selected range ({habitSummary.scheduled ? Math.round((habitSummary.completed / habitSummary.scheduled) * 100) : 0}%).</p></section> : null}

        {sectionEnabled('study') ? <section className="reportSection"><h3>Study & Focus</h3><div className="reportGrid"><div><strong>Study minutes</strong><p>{snapshot.current.study}</p></div><div><strong>Focus minutes</strong><p>{snapshot.current.focus}</p></div><div><strong>Previous-period change</strong><p>Study {snapshot.comparison.studyChange}% · Focus {snapshot.comparison.focusChange}%</p></div></div></section> : null}

        {sectionEnabled('knowledge') ? <section className="reportSection"><h3>Notes & Resources</h3><div className="reportGrid"><div><strong>Active notes</strong><p>{activeNotes.length}</p></div><div><strong>Words written</strong><p>{activeNotes.reduce((sum, item) => sum + wordCount(item.body), 0)}</p></div><div><strong>Resources</strong><p>{activeResources.length}</p></div><div><strong>Unique tags</strong><p>{new Set([...activeNotes, ...activeResources].flatMap((item) => normalizeTags(item.tags))).size}</p></div></div></section> : null}

        {sectionEnabled('courses') ? <section className="reportSection"><h3>Course Health</h3>{snapshot.courseHealth.length ? <div className="tableWrap"><table className="dataTable"><thead><tr><th>Course</th><th>Health</th><th>Attendance</th><th>Pending Tasks</th><th>Study</th><th>Exam Ready</th><th>Knowledge</th></tr></thead><tbody>{snapshot.courseHealth.map((item) => <tr key={item.id}><td>{item.code || item.name}</td><td>{item.score}%</td><td>{item.attendance ? `${item.attendance.toFixed(1)}%` : '—'}</td><td>{item.pendingTasks}</td><td>{item.studyMinutes} min</td><td>{item.examReadiness ? `${item.examReadiness}%` : '—'}</td><td>{item.notes + item.resources}</td></tr>)}</tbody></table></div> : <p>No course-linked analytics.</p>}</section> : null}

        {sectionEnabled('insights') ? <section className="reportSection"><h3>Smart Insights</h3>{snapshot.insights.length ? <ul className="reportInsightList">{snapshot.insights.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.text}</span></li>)}</ul> : <EmptyState title="No insight" text="Add more data to generate insights." />}</section> : null}

        <p className="reportFooter">Made by Sama · LifeOS Phase 9</p>
      </Card>
    </>
  );
}
