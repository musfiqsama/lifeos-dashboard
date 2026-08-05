import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { cleanText, entityTimestamps, matchesSearch } from '../utils/entity.js';
import {
  WEEKDAY_SHORT,
  buildCalendarEvents,
  formatCalendarTitle,
  monthGrid,
  shiftISODate,
  shiftMonthISO,
  weekDates,
} from '../utils/calendar.js';
import { todayLocalISO } from '../utils/date.js';
import {
  buildReminderCandidates,
  defaultNotificationSettings,
  reminderHistoryState,
  reminderLabel,
  upsertReminderHistory,
} from '../utils/reminders.js';

const emptyEvent = {
  title: '', type: 'Personal', date: '', startTime: '', endTime: '', location: '', description: '', color: 'teal', completed: false, reminderMinutes: 30,
};
const eventTypes = ['Personal', 'Study', 'Class', 'Meeting', 'Deadline', 'Health', 'Other'];
const colorOptions = ['teal', 'green', 'blue', 'purple', 'orange', 'rose', 'gray'];
const reminderOptions = [
  { value: -1, label: 'No reminder' },
  { value: 0, label: 'At event time' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

const dateLabel = (iso) => {
  const parsed = new Date(`${iso}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

function EventChip({ event, onClick }) {
  return (
    <button type="button" className={`calendarEventChip event-${event.color || 'teal'} ${event.status === 'Cancelled' ? 'cancelled' : ''}`} onClick={(click) => { click.stopPropagation(); onClick(event); }}>
      {event.startTime ? <span>{event.startTime}</span> : null}<strong>{event.title}</strong>
    </button>
  );
}

export default function Calendar({ api, setPage }) {
  const todayISO = todayLocalISO();
  const calendarItems = api.data.calendarItems || [];
  const reminderHistory = api.data.reminderHistory || [];
  const settings = api.data.notificationSettings?.[0] || defaultNotificationSettings;
  const [view, setView] = useState('month');
  const [anchorISO, setAnchorISO] = useState(todayISO);
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);

  const monthCells = useMemo(() => monthGrid(anchorISO, todayISO), [anchorISO, todayISO]);
  const week = useMemo(() => weekDates(anchorISO), [anchorISO]);
  const range = useMemo(() => {
    if (view === 'month') return [monthCells[0].iso, monthCells.at(-1).iso];
    if (view === 'week') return [week[0], week[6]];
    return [anchorISO, anchorISO];
  }, [anchorISO, monthCells, view, week]);
  const allEvents = useMemo(() => buildCalendarEvents(api.data, range[0], range[1]), [api.data, range]);
  const visibleEvents = useMemo(() => allEvents.filter((event) => (
    (typeFilter === 'All' || event.sourceType === typeFilter || event.type === typeFilter)
    && matchesSearch(query, event.title, event.type, event.description, event.location)
  )), [allEvents, query, typeFilter]);
  const selectedEvents = visibleEvents.filter((event) => event.date === selectedISO);
  const todayEvents = buildCalendarEvents(api.data, todayISO, todayISO);
  const upcomingCandidates = useMemo(() => buildReminderCandidates(api.data, new Date(), settings).slice(0, 12), [api.data, settings]);
  const upcomingExams = allEvents.filter((event) => event.sourceType === 'exam' && event.date >= todayISO).length;
  const eventTypesInData = ['All', ...new Set(allEvents.map((event) => event.sourceType).filter(Boolean))];

  const navigate = (direction) => {
    if (view === 'month') setAnchorISO((current) => shiftMonthISO(current, direction));
    else if (view === 'week') setAnchorISO((current) => shiftISODate(current, direction * 7));
    else setAnchorISO((current) => shiftISODate(current, direction));
  };

  const openAdd = (date = selectedISO) => {
    setEditingId(null);
    setDraft({ ...emptyEvent, date: date || todayISO });
  };
  const openEdit = (item) => {
    setEditingId(item.id);
    setDraft({ ...emptyEvent, ...item });
  };
  const closeForm = () => { setDraft(null); setEditingId(null); };

  const saveEvent = (event) => {
    event.preventDefault();
    const title = cleanText(draft?.title);
    if (!title || !draft?.date) return api.notify('Event title and date are required.', 'warning', 'Event not saved');
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) return api.notify('End time must be later than start time.', 'warning', 'Invalid time range');
    const existing = calendarItems.find((item) => item.id === editingId) || {};
    const next = {
      ...existing,
      ...draft,
      id: editingId || uid(),
      title,
      location: cleanText(draft.location),
      description: cleanText(draft.description),
      reminderMinutes: Number(draft.reminderMinutes),
      ...entityTimestamps(existing),
    };
    api.update('calendarItems', editingId ? calendarItems.map((item) => item.id === editingId ? next : item) : [...calendarItems, next]);
    api.activity?.(`${editingId ? 'Calendar event updated' : 'Calendar event added'}: ${title}`);
    api.notify('Calendar event saved.', 'success');
    setSelectedISO(next.date);
    closeForm();
  };

  const removeEvent = async (item) => {
    if (!await api.confirm({ title: 'Delete calendar event?', message: `“${item.title}” will be permanently removed.`, confirmLabel: 'Delete event', danger: true })) return;
    api.update('calendarItems', calendarItems.filter((entry) => entry.id !== item.id));
    api.notify('Calendar event deleted.', 'success');
    setViewing(null);
  };

  const openEvent = (event) => {
    if (event.sourceType === 'calendar') {
      const item = calendarItems.find((entry) => entry.id === event.sourceId);
      if (item) setViewing(item);
      return;
    }
    if (event.page) setPage(event.page);
  };

  const saveSettings = async () => {
    const next = { ...settings, ...settingsDraft, defaultLeadMinutes: Number(settingsDraft.defaultLeadMinutes), lookAheadDays: Number(settingsDraft.lookAheadDays) };
    if (next.browserEnabled && typeof Notification === 'undefined') {
      next.browserEnabled = false;
      api.notify('This browser does not support system notifications. In-app reminders remain available.', 'warning');
    } else if (next.browserEnabled && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      next.browserEnabled = permission === 'granted';
      if (permission !== 'granted') api.notify('Browser notification permission was not granted. In-app reminders remain available.', 'warning');
    }
    api.update('notificationSettings', [next]);
    api.notify('Reminder settings saved.', 'success');
    setSettingsDraft(null);
  };

  const dismissReminder = (candidate) => {
    api.update('reminderHistory', upsertReminderHistory(reminderHistory, candidate.key, { dismissedAt: new Date().toISOString(), snoozedUntil: '' }).slice(-250));
    api.notify('Reminder dismissed for this occurrence.', 'info');
  };

  const snoozeReminder = (candidate) => {
    const until = new Date(Date.now() + 10 * 60000).toISOString();
    api.update('reminderHistory', upsertReminderHistory(reminderHistory, candidate.key, { snoozedUntil: until, dismissedAt: '', notifiedAt: '' }).slice(-250));
    api.notify('Reminder snoozed for 10 minutes.', 'success');
  };

  const selectDate = (iso) => {
    setSelectedISO(iso);
    setAnchorISO(iso);
  };

  return (
    <>
      <Header title="Calendar & Reminders" subtitle="Plan month, week and day views with routines, deadlines, exams, habits and personal events in one place." />
      <section className="statsGrid four">
        <StatCard label="Today Events" value={todayEvents.length} note={dateLabel(todayISO)} />
        <StatCard label="Visible Events" value={visibleEvents.length} note={`${formatCalendarTitle(anchorISO, view)} · ${view}`} tone="green" />
        <StatCard label="Upcoming Exams" value={upcomingExams} note="in current calendar range" tone="purple" />
        <StatCard label="Reminders" value={upcomingCandidates.filter((candidate) => !reminderHistoryState(reminderHistory, candidate.key)?.dismissedAt).length} note={settings.inAppEnabled ? 'in-app active' : 'in-app disabled'} tone="orange" />
      </section>

      <Card className="calendarControlCard">
        <div className="calendarTopbar">
          <div className="calendarNav">
            <button type="button" className="ghostBtn" onClick={() => navigate(-1)}>Previous</button>
            <button type="button" className="ghostBtn" onClick={() => { setAnchorISO(todayISO); setSelectedISO(todayISO); }}>Today</button>
            <button type="button" className="ghostBtn" onClick={() => navigate(1)}>Next</button>
          </div>
          <h2>{formatCalendarTitle(anchorISO, view)}</h2>
          <div className="calendarViewTabs">
            {['month', 'week', 'day'].map((mode) => <button type="button" className={view === mode ? 'active' : ''} onClick={() => setView(mode)} key={mode}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}
          </div>
        </div>
        <div className="calendarFilters">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search calendar" aria-label="Search calendar" />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter event source">
            {eventTypesInData.map((item) => <option value={item} key={item}>{item === 'All' ? 'All event sources' : item}</option>)}
          </select>
          <button type="button" className="ghostBtn" onClick={() => setSettingsDraft({ ...settings })}>Reminder Settings</button>
          <button type="button" className="primaryBtn" onClick={() => openAdd(selectedISO)}>Add Event</button>
        </div>
      </Card>

      {view === 'month' ? (
        <Card className="calendarBoardCard">
          <div className="monthWeekHeader">{WEEKDAY_SHORT.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="monthGrid">{monthCells.map((cell) => {
            const events = visibleEvents.filter((event) => event.date === cell.iso);
            return <div className={`monthCell ${cell.inMonth ? '' : 'outside'} ${cell.isToday ? 'today' : ''} ${selectedISO === cell.iso ? 'selected' : ''}`} role="button" tabIndex="0" onClick={() => selectDate(cell.iso)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectDate(cell.iso); }} key={cell.iso}>
              <span className="monthDayNumber">{cell.day}</span>
              <div className="monthCellEvents">{events.slice(0, 3).map((event) => <EventChip event={event} onClick={openEvent} key={event.id} />)}{events.length > 3 ? <small>+{events.length - 3} more</small> : null}</div>
            </div>;
          })}</div>
        </Card>
      ) : null}

      {view === 'week' ? (
        <Card className="calendarBoardCard">
          <div className="weekCalendarGrid">{week.map((iso) => {
            const events = visibleEvents.filter((event) => event.date === iso);
            return <section className={`weekCalendarDay ${iso === todayISO ? 'today' : ''}`} key={iso}>
              <button type="button" className="weekDayHeading" onClick={() => { selectDate(iso); setView('day'); }}><strong>{dateLabel(iso)}</strong><span>{events.length} event{events.length === 1 ? '' : 's'}</span></button>
              <div>{events.length ? events.map((event) => <EventChip event={event} onClick={openEvent} key={event.id} />) : <p className="mutedCalendarText">No events</p>}</div>
            </section>;
          })}</div>
        </Card>
      ) : null}

      {view === 'day' ? (
        <Card className="dayCalendarCard">
          <div className="cardHead"><div><h3>{dateLabel(anchorISO)}</h3><p>{visibleEvents.filter((event) => event.date === anchorISO).length} scheduled item(s)</p></div><button type="button" className="primaryBtn" onClick={() => openAdd(anchorISO)}>Add on this day</button></div>
          {visibleEvents.filter((event) => event.date === anchorISO).length === 0 ? <EmptyState title="Nothing scheduled" text="Add a personal event or use another LifeOS module to create a dated item." /> : <div className="dayAgenda">{visibleEvents.filter((event) => event.date === anchorISO).map((event) => <button type="button" className={`dayAgendaItem event-${event.color || 'teal'}`} onClick={() => openEvent(event)} key={event.id}><time>{event.startTime || 'All day'}</time><div><span>{event.type}</span><h4>{event.title}</h4><p>{[event.location, event.description].filter(Boolean).join(' · ') || 'No extra details'}</p></div></button>)}</div>}
        </Card>
      ) : null}

      {view === 'month' ? (
        <section className="twoCol wideLeft">
          <Card>
            <div className="cardHead"><div><h3>{dateLabel(selectedISO)}</h3><p>Selected-day agenda</p></div><button type="button" className="ghostBtn" onClick={() => { setAnchorISO(selectedISO); setView('day'); }}>Open Day View</button></div>
            {selectedEvents.length === 0 ? <EmptyState title="No events on this day" text="Choose another date or add a calendar event." /> : <div className="dayAgenda compact">{selectedEvents.map((event) => <button type="button" className={`dayAgendaItem event-${event.color || 'teal'}`} onClick={() => openEvent(event)} key={event.id}><time>{event.startTime || 'All day'}</time><div><span>{event.type}</span><h4>{event.title}</h4><p>{event.description || event.location || 'Open details'}</p></div></button>)}</div>}
          </Card>
          <Card>
            <div className="cardHead"><div><h3>Reminder Center</h3><p>Next scheduled alerts while LifeOS is open.</p></div><button type="button" className="ghostBtn" onClick={() => setSettingsDraft({ ...settings })}>Settings</button></div>
            {upcomingCandidates.length === 0 ? <EmptyState title="No upcoming reminders" text="Add times to tasks, exams, routines, habits or personal events." /> : <div className="reminderList">{upcomingCandidates.slice(0, 6).map((candidate) => {
              const state = reminderHistoryState(reminderHistory, candidate.key);
              return <article className={state?.dismissedAt ? 'dismissed' : ''} key={candidate.key}><div><span>{candidate.type}</span><strong>{candidate.title}</strong><p>{dateLabel(candidate.date)}{candidate.startTime ? ` · ${candidate.startTime}` : ''} · {reminderLabel(candidate)}</p></div><div className="reminderActions"><button type="button" onClick={() => snoozeReminder(candidate)}>Snooze</button><button type="button" onClick={() => dismissReminder(candidate)}>Dismiss</button></div></article>;
            })}</div>}
          </Card>
        </section>
      ) : null}

      <Modal open={Boolean(draft)} wide title={editingId ? 'Edit Calendar Event' : 'Add Calendar Event'} onClose={closeForm} actions={<><button type="button" className="ghostBtn" onClick={closeForm}>Cancel</button><button type="submit" form="calendar-event-form" className="primaryBtn">Save Event</button></>}>
        {draft ? <form id="calendar-event-form" className="formGrid modalForm" onSubmit={saveEvent}>
          <Field label="Title" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Event title" autoFocus /></Field>
          <Field label="Type"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{eventTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
          <Field label="Start time"><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field>
          <Field label="End time"><input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></Field>
          <Field label="Location"><input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Room or location" /></Field>
          <Field label="Color"><select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}>{colorOptions.map((item) => <option value={item} key={item}>{item}</option>)}</select></Field>
          <Field label="Reminder"><select value={draft.reminderMinutes} onChange={(event) => setDraft({ ...draft, reminderMinutes: Number(event.target.value) })}>{reminderOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Status"><label className="checkRow"><input type="checkbox" checked={Boolean(draft.completed)} onChange={(event) => setDraft({ ...draft, completed: event.target.checked })} /><span>Mark completed</span></label></Field>
          <Field label="Description" full><textarea rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Optional details" /></Field>
        </form> : null}
      </Modal>

      <Modal open={Boolean(viewing)} title={viewing?.title || 'Event details'} onClose={() => setViewing(null)} actions={<><button type="button" className="dangerBtn" onClick={() => removeEvent(viewing)}>Delete</button><button type="button" className="primaryBtn" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Event</button></>}>
        {viewing ? <><DetailGrid rows={[{ label: 'Type', value: viewing.type }, { label: 'Date', value: dateLabel(viewing.date) }, { label: 'Time', value: viewing.startTime ? `${viewing.startTime}${viewing.endTime ? `–${viewing.endTime}` : ''}` : 'All day' }, { label: 'Location', value: viewing.location || 'Not set' }, { label: 'Reminder', value: reminderOptions.find((item) => item.value === Number(viewing.reminderMinutes))?.label || `${viewing.reminderMinutes} minutes before` }, { label: 'Status', value: viewing.completed ? 'Completed' : 'Open' }, { label: 'Description', value: viewing.description || 'No description', full: true }]} /><ItemActions onEdit={() => { openEdit(viewing); setViewing(null); }} onDelete={() => removeEvent(viewing)} /></> : null}
      </Modal>

      <Modal open={Boolean(settingsDraft)} title="Reminder & Notification Settings" onClose={() => setSettingsDraft(null)} actions={<><button type="button" className="ghostBtn" onClick={() => setSettingsDraft(null)}>Cancel</button><button type="button" className="primaryBtn" onClick={saveSettings}>Save Settings</button></>}>
        {settingsDraft ? <div className="formGrid modalForm">
          <Field label="In-app reminders" full><label className="checkRow"><input type="checkbox" checked={Boolean(settingsDraft.inAppEnabled)} onChange={(event) => setSettingsDraft({ ...settingsDraft, inAppEnabled: event.target.checked })} /><span>Show LifeOS toast reminders while the app is open</span></label></Field>
          <Field label="Browser notifications" full><label className="checkRow"><input type="checkbox" checked={Boolean(settingsDraft.browserEnabled)} onChange={(event) => setSettingsDraft({ ...settingsDraft, browserEnabled: event.target.checked })} /><span>Use browser notifications when permission is granted</span></label></Field>
          <Field label="Default reminder lead"><select value={settingsDraft.defaultLeadMinutes} onChange={(event) => setSettingsDraft({ ...settingsDraft, defaultLeadMinutes: Number(event.target.value) })}>{reminderOptions.filter((item) => item.value >= 0).map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Look-ahead days"><input type="number" min="1" max="60" value={settingsDraft.lookAheadDays} onChange={(event) => setSettingsDraft({ ...settingsDraft, lookAheadDays: Number(event.target.value) })} /></Field>
          <Field label="Quiet hours start"><input type="time" value={settingsDraft.quietStart || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, quietStart: event.target.value })} /></Field>
          <Field label="Quiet hours end"><input type="time" value={settingsDraft.quietEnd || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, quietEnd: event.target.value })} /></Field>
        </div> : null}
      </Modal>
    </>
  );
}
