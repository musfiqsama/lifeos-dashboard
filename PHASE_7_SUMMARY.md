# Phase 7 Summary — Calendar, Routine Changes and Reminders

## Baseline

Phase 7 was built directly on `LifeOS-Web-Phase-6-Focus.zip`. Existing pages, storage key, Academic, Attendance, Planning, Habits, Study Analyzer and Pomodoro workflows remain present.

## Calendar Workspace

- Month view with a stable six-week grid
- Week view with seven agenda columns
- Day view with ordered detailed events
- Previous, Today and Next navigation
- Search and source filtering
- Selected-day agenda
- Personal calendar-event CRUD
- Event type, date, start/end time, location, description, color, completion and reminder fields

## Unified Event Sources

The calendar reads from:

- Task start dates and deadlines
- Goal deadlines
- Exams and preparation status
- Weekly routine occurrences
- Routine cancellations and reschedules
- Habit schedules and completion
- Attendance history
- Focus/Pomodoro history
- Personal calendar events

## Routine Changes

- Optional routine active-from and active-until dates
- Per-routine reminder lead time
- Cancel one occurrence without deleting the weekly routine
- Reschedule one occurrence to a new date, time or room
- Edit/remove an exception
- Today's routine and Dashboard counts respect exceptions
- Existing attendance history remains intact when a routine is changed or deleted

## Reminders

- In-app reminder toasts while LifeOS is open
- Optional browser Notification API alerts
- Checks every 30 seconds
- Quiet-hour settings
- Configurable look-ahead window
- Task, Exam, Routine, Habit and personal-event reminders
- 10-minute snooze
- Per-occurrence dismiss
- Persistent reminder history prevents duplicate delivery

## Integration

- Dashboard shows upcoming reminders and exception-aware routine counts
- Global Search includes personal events and routine changes
- Reports include a Calendar & Reminder Overview
- Tasks and Exams expose reminder lead-time controls

## Data Migration

- App version: `2.0.0-phase.7`
- Storage schema: `8`
- Storage key remains `lifeos-v2base-final`
- New collections: `routineExceptions`, `notificationSettings`, `reminderHistory`
- Existing `calendarItems` receive safe Phase 7 defaults
