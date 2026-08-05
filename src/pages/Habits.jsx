import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { cleanText, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { todayLocalISO } from '../utils/date.js';
import {
  DAY_LABELS,
  buildHabitHeatmap,
  currentHabitStreak,
  habitCheckinCount,
  habitCompletedOn,
  habitPeriodSummary,
  habitScheduledOn,
  habitTarget,
  longestHabitStreak,
  normalizeCustomDays,
  updateHabitCheckin,
} from '../utils/habits.js';

const emptyHabit = {
  title: '', category: 'Study', frequency: 'Daily', target: 1, customDays: [0, 1, 2, 3, 4, 5, 6],
  checkins: {}, archived: false, reminderTime: '', startDate: '', notes: '',
};

export default function Habits({ api }) {
  const habits = api.data.habits || [];
  const today = todayLocalISO();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Active');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('streak');
  const [draft, setDraft] = useState(emptyHabit);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const closeForm = () => { setDraft(emptyHabit); setEditingId(null); };
  const openEdit = (habit) => {
    setEditingId(habit.id);
    setDraft({ ...emptyHabit, ...habit, customDays: normalizeCustomDays(habit.customDays, habit.frequency), checkins: { ...(habit.checkins || {}) } });
  };

  const saveHabit = (event) => {
    event.preventDefault();
    const title = cleanText(draft.title);
    if (!title) return api.notify('Habit name is required.', 'warning', 'Habit not saved');
    const customDays = normalizeCustomDays(draft.customDays, draft.frequency);
    if ((draft.frequency === 'Custom' || draft.frequency === 'Weekly') && customDays.length === 0) return api.notify('Select at least one scheduled day.', 'warning', 'Habit not saved');
    const existing = habits.find((habit) => habit.id === editingId) || {};
    const next = {
      ...existing, ...draft, id: editingId || uid(), title,
      target: Math.max(1, Math.round(Number(draft.target) || 1)), customDays,
      notes: cleanText(draft.notes), reminderTime: draft.reminderTime || '', startDate: draft.startDate || '',
      checkins: { ...(existing.checkins || {}), ...(draft.checkins || {}) }, ...entityTimestamps(existing),
    };
    api.update('habits', editingId ? habits.map((habit) => habit.id === editingId ? next : habit) : [...habits, next]);
    api.activity?.(`${editingId ? 'Habit updated' : 'Habit added'}: ${title}`);
    api.notify('Habit saved successfully.', 'success');
    closeForm();
  };

  const changeToday = (habit, change) => {
    if (!habitScheduledOn(habit, today)) return api.notify('This habit is not scheduled for today.', 'info', 'No check-in needed');
    const nextCheckins = updateHabitCheckin(habit, today, change);
    api.update('habits', habits.map((item) => item.id === habit.id ? { ...item, checkins: nextCheckins, ...entityTimestamps(item) } : item));
  };
  const setDayCount = (habit, date, nextCount) => api.update('habits', habits.map((item) => item.id === habit.id ? {
    ...item,
    checkins: { ...(item.checkins || {}), [date]: Math.max(0, Number(nextCount) || 0) },
    ...entityTimestamps(item),
  } : item));
  const archive = (habit) => api.update('habits', habits.map((item) => item.id === habit.id ? { ...item, archived: !item.archived, ...entityTimestamps(item) } : item));
  const remove = async (habit) => {
    if (!await api.confirm({ title: 'Delete habit?', message: `“${habit.title}” and its complete check-in history will be removed.`, confirmLabel: 'Delete habit', danger: true })) return;
    api.update('habits', habits.filter((item) => item.id !== habit.id));
    api.notify('Habit deleted.', 'success');
  };

  const categories = ['All', ...new Set(habits.map((habit) => habit.category).filter(Boolean))];
  const visible = useMemo(() => habits.filter((habit) => (
    (status === 'All' || (status === 'Active' ? !habit.archived : habit.archived))
    && (category === 'All' || habit.category === category)
    && matchesSearch(query, habit.title, habit.category, habit.frequency, habit.notes)
  )).sort((a, b) => {
    if (sort === 'consistency') return habitPeriodSummary(b, 30, today).percentage - habitPeriodSummary(a, 30, today).percentage;
    if (sort === 'streak') return currentHabitStreak(b, today) - currentHabitStreak(a, today);
    return compareText(a.title, b.title);
  }), [category, habits, query, sort, status, today]);

  const active = habits.filter((habit) => !habit.archived);
  const scheduledToday = active.filter((habit) => habitScheduledOn(habit, today));
  const completedToday = scheduledToday.filter((habit) => habitCompletedOn(habit, today));
  const best = active.reduce((top, habit) => currentHabitStreak(habit, today) > currentHabitStreak(top, today) ? habit : top, null);
  const totalSeven = active.reduce((sum, habit) => sum + habitPeriodSummary(habit, 7, today).scheduled, 0);
  const completeSeven = active.reduce((sum, habit) => sum + habitPeriodSummary(habit, 7, today).completed, 0);
  const weekConsistency = totalSeven ? Math.round((completeSeven / totalSeven) * 100) : 0;
  const formOpen = editingId !== null || draft !== emptyHabit;

  return (
    <>
      <Header title="Habit Tracker" subtitle="Build real date-based streaks, review missed days and track consistency on a calendar." />
      <section className="statsGrid four">
        <StatCard label="Today Complete" value={`${completedToday.length}/${scheduledToday.length}`} note="scheduled habits" />
        <StatCard label="Best Current Streak" value={best ? currentHabitStreak(best, today) : 0} note={best?.title || 'No active habit'} tone="green" />
        <StatCard label="7-Day Consistency" value={`${weekConsistency}%`} note={`${completeSeven}/${totalSeven || 0} scheduled days`} tone="orange" />
        <StatCard label="Active Habits" value={active.length} note={`${habits.length - active.length} archived`} tone="purple" />
      </section>
      <Card>
        <div className="cardHead"><div><h3>Your Habits</h3><p>Check in only on scheduled dates. Streaks are calculated from calendar history.</p></div><button type="button" className="primaryBtn" onClick={() => setDraft({ ...emptyHabit, checkins: {} })}>Add Habit</button></div>
        <CrudToolbar query={query} onQueryChange={setQuery} count={visible.length} queryPlaceholder="Search habits" filters={[{ label: 'Status', value: status, onChange: setStatus, options: ['All', 'Active', 'Archived'] }, { label: 'Category', value: category, onChange: setCategory, options: categories }]} sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'streak', label: 'Current streak' }, { value: 'consistency', label: '30-day consistency' }, { value: 'title', label: 'Title' }]} />
        {visible.length === 0 ? <EmptyState title="No matching habits" text="Create a habit or change the current filters." /> : <div className="habitCardGrid">{visible.map((habit) => {
          const current = currentHabitStreak(habit, today);
          const longest = longestHabitStreak(habit, today);
          const month = habitPeriodSummary(habit, 30, today);
          const todayCount = habitCheckinCount(habit, today);
          const scheduled = habitScheduledOn(habit, today);
          const heatmap = buildHabitHeatmap(habit, 35, today);
          return <article className="itemCard habitCalendarCard" key={habit.id}>
            <div className="rowBetween"><div className="inlinePills"><span className="pill">{habit.category || 'Habit'}</span><span className="pill subtle">{habit.frequency}</span>{habit.archived ? <span className="pill subtle">Archived</span> : null}</div><strong className={month.percentage >= 75 ? 'safeText' : 'riskText'}>{month.percentage}%</strong></div>
            <h4>{habit.title}</h4><p>{scheduled ? `Today ${todayCount}/${habitTarget(habit)} completed` : 'Not scheduled today'} · Current {current} · Best {longest}</p>
            <div className="habitCheckControl">
              <button type="button" className="ghostBtn" disabled={!scheduled || todayCount <= 0} onClick={() => changeToday(habit, -1)}>−</button>
              <div><strong>{todayCount}</strong><span>of {habitTarget(habit)} today</span></div>
              <button type="button" className="primaryBtn" disabled={!scheduled || habit.archived} onClick={() => changeToday(habit, 1)}>+ Check-in</button>
            </div>
            <div className="habitHeatmap" aria-label={`${habit.title} 35 day history`}>{heatmap.map((day) => <button type="button" key={day.date} title={`${day.date}: ${day.count} check-in${day.count === 1 ? '' : 's'}`} disabled={!day.scheduled || habit.archived} className={`${day.scheduled ? 'scheduled' : ''} ${day.completed ? 'complete' : ''} ${day.date === today ? 'today' : ''}`} onClick={() => day.scheduled && setDayCount(habit, day.date, day.completed ? 0 : habitTarget(habit))} />)}</div>
            <div className="habitLegend"><span>35 days</span><span><i /> Scheduled</span><span><i className="done" /> Complete</span></div>
            <ItemActions onView={() => setViewing(habit)} onEdit={() => openEdit(habit)} onArchive={() => archive(habit)} archiveLabel={habit.archived ? 'Restore' : 'Archive'} onDelete={() => remove(habit)} />
          </article>;
        })}</div>}
      </Card>
      <Modal open={Boolean(formOpen)} wide title={editingId ? 'Edit Habit' : 'Create Habit'} onClose={closeForm} actions={<><button className="ghostBtn" type="button" onClick={closeForm}>Cancel</button><button className="primaryBtn" type="submit" form="habit-form">Save Habit</button></>}>
        <form id="habit-form" className="formGrid modalForm" onSubmit={saveHabit}>
          <Field label="Habit name" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Example: Solve coding problems" autoFocus /></Field>
          <Field label="Category"><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Study</option><option>Coding</option><option>Reading</option><option>Health</option><option>Personal</option><option>Other</option></select></Field>
          <Field label="Frequency"><select value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value, customDays: normalizeCustomDays(draft.customDays, event.target.value) })}><option>Daily</option><option>Weekdays</option><option>Weekly</option><option>Custom</option></select></Field>
          <Field label="Target check-ins per scheduled day"><input type="number" min="1" max="20" value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })} /></Field>
          <Field label="Start date"><input type="date" value={draft.startDate || ''} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field>
          <Field label="Reminder time"><input type="time" value={draft.reminderTime || ''} onChange={(event) => setDraft({ ...draft, reminderTime: event.target.value })} /></Field>
          <Field label="Status"><select value={draft.archived ? 'Archived' : 'Active'} onChange={(event) => setDraft({ ...draft, archived: event.target.value === 'Archived' })}><option>Active</option><option>Archived</option></select></Field>
          <Field label="Scheduled days" full><div className="customDayPicker">{DAY_LABELS.map((day, index) => <label key={day}><input type="checkbox" disabled={draft.frequency === 'Daily' || draft.frequency === 'Weekdays'} checked={normalizeCustomDays(draft.customDays, draft.frequency).includes(index)} onChange={() => { const selected = normalizeCustomDays(draft.customDays, draft.frequency); const next = draft.frequency === 'Weekly' ? [index] : (selected.includes(index) ? selected.filter((value) => value !== index) : [...selected, index]); setDraft({ ...draft, customDays: next }); }} /><span>{day}</span></label>)}</div></Field>
          <Field label="Notes" full><textarea rows="4" value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Why this habit matters or how you will complete it." /></Field>
        </form>
      </Modal>
      <Modal open={Boolean(viewing)} wide title={viewing?.title || 'Habit details'} onClose={() => setViewing(null)} actions={<button className="primaryBtn" type="button" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Habit</button>}>
        {viewing ? <><DetailGrid rows={[{ label: 'Category', value: viewing.category || 'Habit' }, { label: 'Frequency', value: viewing.frequency || 'Daily' }, { label: 'Daily target', value: habitTarget(viewing) }, { label: 'Current streak', value: `${currentHabitStreak(viewing, today)} scheduled days` }, { label: 'Longest streak', value: `${longestHabitStreak(viewing, today)} scheduled days` }, { label: '30-day consistency', value: `${habitPeriodSummary(viewing, 30, today).percentage}%` }, { label: 'Reminder', value: viewing.reminderTime || 'Not set' }, { label: 'Notes', value: viewing.notes || 'No notes', full: true }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt), full: true }]} /><div className="habitHeatmap large">{buildHabitHeatmap(viewing, 70, today).map((day) => <span key={day.date} title={`${day.date}: ${day.count}`} className={`${day.scheduled ? 'scheduled' : ''} ${day.completed ? 'complete' : ''}`} />)}</div></> : null}
      </Modal>
    </>
  );
}
