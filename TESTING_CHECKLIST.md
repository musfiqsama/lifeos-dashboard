# LifeOS Web 2.0 — Manual Acceptance Checklist

Use this after `npm install` and `npm run dev` or `npm run preview`.

## General

- [ ] Landing page opens without console errors
- [ ] Enter Workspace opens Dashboard
- [ ] Desktop sidebar and mobile bottom navigation work
- [ ] Light, dark, and system theme work
- [ ] Compact/comfortable density persists after refresh
- [ ] Modal Escape, focus trap, and focus restoration work
- [ ] Mobile More sheet traps focus and restores focus on close

## Academic and Attendance

- [ ] Add/edit/remove a current course
- [ ] Save and edit a semester
- [ ] Custom grading scale recalculates GPA
- [ ] Retake policy updates cumulative CGPA
- [ ] Attendance status calculations match the documented rules
- [ ] Routine quick-mark creates or updates attendance

## Planning and Focus

- [ ] Task CRUD, subtasks, recurrence, archive, and safe resource URL validation
- [ ] Goal milestones and linked-task progress
- [ ] Exam checklist and readiness
- [ ] Habit date check-ins, streaks, and heatmap
- [ ] Pomodoro continues after refresh
- [ ] Completed focus session appears in history and optional Study Log

## Calendar and Reminders

- [ ] Month, week, and day views work
- [ ] Personal event CRUD works
- [ ] Routine cancellation and rescheduling affect only one occurrence
- [ ] In-app reminders, snooze, dismiss, and quiet hours work
- [ ] Browser permission denial does not break in-app reminders

## Knowledge

- [ ] Markdown note create/edit/autosave/preview/print/export
- [ ] Resource CRUD and safe URL open
- [ ] Note ↔ Resource links remain consistent after edit, duplicate, and delete
- [ ] Global Search opens direct Note/Resource records

## Analytics and Reports

- [ ] Range filters update metrics
- [ ] Course health and smart insights render with empty and populated data
- [ ] Achievement progress and unlock records work
- [ ] Report presets, custom sections, CSV/JSON/HTML, and Print/PDF work

## Data Safety

- [ ] Refresh preserves data
- [ ] Exported backup imports correctly
- [ ] Legacy backup imports correctly
- [ ] Invalid and oversized backups are rejected
- [ ] Reset All requires confirmation
- [ ] Unsafe external URLs are rejected or removed

## Responsive Screens

- [ ] 320 px mobile
- [ ] 375–430 px mobile
- [ ] 768 px tablet
- [ ] 1024–1440 px laptop/desktop
- [ ] Tables, charts, modals, calendar, reports, and editors do not cause unusable overflow
