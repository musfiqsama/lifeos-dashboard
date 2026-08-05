# LifeOS Web 2.0 — Data Model Summary

LifeOS saves one versioned object under `lifeos-v2base-final`.

## Core Collections

- `courses`: current-semester course drafts
- `semesters`: saved semester snapshots and courses
- `academicSettings`: grading scale, retake policy, target CGPA, attendance defaults
- `attendanceRecords`, `attendanceTargets`
- `routines`, `routineExceptions`
- `tasks`, `goals`, `exams`
- `habits`
- `studyLogs`, `focusSessions`, `timerSettings`, `activeTimer`
- `notes`, `resources`
- `calendarItems`
- `notificationSettings`, `reminderHistory`
- `achievementRecords`, `achievementDismissed`
- `reportTemplates`
- `searchHistory`, `recentItems`
- `activities`
- `uiPreferences`

## Main Relationships

- Courses can be linked to tasks, exams, attendance, routines, notes, resources, study logs, and focus sessions.
- Tasks can link to goals and resources.
- Notes and resources maintain bidirectional ID arrays.
- Routine exceptions modify one occurrence without changing the weekly routine.
- Calendar events are generated from multiple collections rather than stored as duplicates.

## Compatibility

`normalizeState()` supplies defaults, clamps unsafe values, migrates legacy fields, removes unknown collections, validates URL protocols, and preserves the current schema-11 structure.
