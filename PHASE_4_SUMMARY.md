# Phase 4 Summary — Attendance Tracker and Course–Routine Integration

## Baseline

Phase 4 was developed from `LifeOS-Web-Phase-3-Academic-System.zip`. Existing UI direction, Academic System 2.0, Phase 2 CRUD modules, storage key and user-data compatibility were preserved.

## Attendance Data Model

### Attendance Record

Each record can store:

- ID
- Course identity
- Course code and name snapshot
- Date
- Status: Present, Absent, Late, Excused or Cancelled
- Session label
- Notes
- Optional routine source ID
- Created and updated timestamps

### Attendance Target

Each course can store an independent attendance target override. Academic settings also store a global default target, initially 75%.

## Calculation Rules

- Present: counted and attended
- Late: counted and attended
- Absent: counted but not attended
- Excused: not counted
- Cancelled: not counted

The system calculates:

- Counted classes
- Attended classes
- Present, Absent and Late totals
- Attendance percentage
- At-risk status
- Number of classes that can still be missed safely
- Number of consecutive classes required to recover to the target

## User-Facing Features

1. Attendance page in Sidebar and App routing.
2. Attendance record add, details, edit and safe delete.
3. Course, status and text filters.
4. Newest, oldest and course sorting.
5. Course summary cards with percentage and risk guidance.
6. Per-course minimum target editing.
7. Academic global attendance target.
8. Routine course selection from current and saved academic courses.
9. Quick Present, Absent, Late and Cancelled buttons for today's classes.
10. Duplicate attendance protection.
11. Dashboard attendance summary and risk watch.
12. Analytics attendance chart and course insight list.
13. Printable attendance section in Reports.
14. Attendance records in Global Search and Calendar timeline.

## Deferred

The following remain planned for later phases:

- Date-based habit streak rebuild
- Full monthly/weekly/day calendar
- Native/browser reminders
- Course resource attachments
- Cloud authentication and synchronization
- Flutter mobile application
