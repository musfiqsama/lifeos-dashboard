# Changelog

## 2.0.1 — Dark Contrast & Layout Patch

- Increased dark-theme text, label, muted-text, border, and surface contrast.
- Reworked Calendar month/week/day colors, grid visibility, date states, and semantic event chips.
- Fixed Routine and shared CRUD filter overflow with responsive wrapping.
- Fixed Attendance filter labels that faded into the toolbar background.
- Fixed Dashboard Weekly Performance and Achievement Progress row readability.
- Converted remaining pale legacy widgets to theme-aware surfaces across Academic, Attendance, Habits, Focus, Notes, Search, Analytics, and Reports.
- Added WCAG contrast and reported-regression automated tests.
- Kept storage schema 11 and the existing localStorage key unchanged.

## 2.0.0 — Stable Web Release

- Finalized stable release metadata and documentation.
- Added feature-page lazy loading and accessible loading UI.
- Added dependency-free source verification.
- Added storage round-trip and cross-module integration tests.
- Sanitized unsafe Task/Resource URLs during normalization and restore.
- Fixed Note/Resource duplicate relationship consistency.
- Hardened nested modal and mobile-navigation focus behavior.
- Fixed stale preference updates and reminder interval lifecycle.
- Added portable default build base and GitHub Pages build command.
- Added explicit button types across the interface.

## 2.0.0-phase.8 — Knowledge Notes, Resources and Global Search 2.0

### Added
- Markdown note editor and safe React-based preview for headings, emphasis, links, lists, checklists, quotes and code blocks.
- Course, folder, multi-tag, pin, favorite, archive and related-resource metadata for notes.
- Existing-note autosave, word count, reading estimate, duplicate, copy, Markdown/text export and print flow.
- Dedicated Resources page with type, course, URL, tags, note/task/exam links, pin/favorite/archive and recent-open metadata.
- Safe resource URL validation for http, https and mailto protocols.
- Bidirectional Note ↔ Resource relationship synchronization.
- Search history and recently opened collections.
- Global Search 2.0 with 14 record categories, relevance sorting, type/course filters, match highlighting, preview and direct Note/Resource opening.
- Dashboard Knowledge Hub and Recently Opened panels.
- Knowledge-by-course Analytics and printable Knowledge & Resources report section.
- Knowledge utility and migration tests.

### Changed
- App version updated to `2.0.0-phase.8`.
- Storage schema updated from 8 to 9.
- Notes now use a multiple-tag Markdown knowledge model while preserving the legacy `tag` field for compatibility.
- Backup and reset copy now explicitly includes resources.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 7 notes migrate without deleting title, body, legacy tag or pin state.
- Large files are not stored in localStorage.
- Invalid or unsafe resource URLs are blocked before saving.
- Deleting a note/resource removes only its relationship reference and does not silently delete the linked entity.

### Verification
- 54 automated tests passed.
- 54 JavaScript/JSX source files passed TypeScript JSX syntax transpilation.
- Relative import resolution passed with zero missing files.
- App and six Phase 8 pages passed CommonJS-transpiled runtime smoke imports/renders with test stubs.
- Production Vite build was not completed in this environment because its npm proxy does not expose the Vite package, so dependencies could not be installed.

## 2.0.0-phase.7 — Calendar, Routine Changes and Reminders

### Added
- Month, Week and Day calendar views with navigation and selected-day agenda.
- Unified calendar event generation from tasks, goals, exams, routines, habits, attendance, focus sessions and manual events.
- Personal calendar-event CRUD, search, source filtering, colors, completion status and reminders.
- Weekly routine validity ranges and per-date Cancelled/Rescheduled exceptions.
- Reminder watcher with in-app alerts while LifeOS is open.
- Optional browser notifications, quiet hours, reminder lead time, snooze and dismiss history.
- Task, Exam and Routine reminder controls.
- Dashboard reminder queue plus Search and printable Report integration.
- Calendar and reminder utilities with automated tests.

### Changed
- App version updated to `2.0.0-phase.7`.
- Storage schema updated from 7 to 8.
- Dashboard routine counts now respect cancellations and reschedules.
- Calendar page replaced the old timeline-only view with a complete calendar workspace.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 6 data receives safe defaults for routine exceptions, notification settings and reminder history.
- Routine exceptions do not rewrite the original weekly routine.
- Browser notification permission is requested only from the user-triggered settings action.

## 2.0.0-phase.1 — Foundation and Stability

### Added
- Versioned storage envelope and backward-compatible migration
- Validated versioned backup format with legacy backup support
- Toast notifications, reusable modal, and confirmation dialog
- React error boundary
- Local date utilities
- Automated Node tests
- `.gitignore`, exact dependency versions, and verification scripts
- Phase 0 audit and baseline manifest

### Changed
- Replaced blocking browser alerts/confirmations in Academic and Backup flows
- Added safe backup download cleanup and 5 MB import limit
- Prevented invalid state keys and non-array module data from entering shared state
- Corrected date-only logic to use local calendar dates instead of UTC slicing
- Made semester save update courses and semester history atomically

### Preserved
- Existing visual direction
- Existing pages and navigation
- Existing `lifeos-v2base-final` localStorage key
- Existing GPA grading scale and current feature behavior

## 2.0.0-phase.2 — Core CRUD System

### Added
- Shared CRUD toolbar, labeled fields, item action controls, and detail grids
- Search, filter, sort, view, edit, and safe delete flows for core modules
- Task categories, descriptions, status, course link, duplication, and timestamps
- Goal descriptions, priorities, full progress editing, and detailed view
- Habit category, frequency, target, archive/restore, and detailed view
- Note editing, details, tag/pin filters, and timestamps
- Routine rooms, teachers, descriptions, start/end time, and overlap detection
- Exam types, times, rooms, notes, and upcoming/completed filters
- Study log topics, ratings, notes, editing, and sorting
- Academic course codes, custom semester names, weighted saved CGPA, semester details, search, and deletion
- Entity utility tests and legacy Phase 1 migration tests

### Changed
- Storage schema upgraded from version 2 to version 3
- Legacy entities receive safe defaults without changing the existing localStorage key
- Core page forms now use reusable modal and validation patterns
- Project version updated to `2.0.0-phase.2`

### Preserved
- Existing visual direction and navigation
- Existing local data and backup compatibility
- Existing GPA grading scale
- Existing non-CRUD modules and page behavior

## 2.0.0-phase.3 — Academic System 2.0

### Added
- Versioned academic settings collection and schema v4 migration.
- Custom grading scale editor with grade-label and point validation.
- Current course editor for course code, title, credit, grade, type, instructor, section, status, retake and CGPA inclusion.
- Semester term, year, status, start date and end date metadata.
- Saved-semester editing with automatic GPA and quality-point recalculation.
- Course-attempt-based cumulative CGPA calculation.
- Latest-attempt and all-attempt retake policies.
- Target CGPA planner and projected CGPA calculation.
- Degree-credit progress and saved-grade distribution.
- Expanded printable academic report.
- Academic calculation integration in Dashboard, Analytics and Achievements.

### Changed
- App version updated to `2.0.0-phase.3`.
- Storage schema updated from 3 to 4.
- Semester snapshots now store quality points and expanded metadata.
- Reports use shared academic settings and cumulative calculation logic.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 2 academic data receives safe default fields during normalization.
- Used grade labels cannot be removed from the grading scale accidentally.
- Invalid date ranges, credits, duplicate current course codes and incomplete semester records are blocked before saving.

### Verification
- 15 automated tests passed.
- 34 JS/JSX files passed TypeScript syntax transpilation.
- Relative import resolution passed.
- Production build could not be completed in the working environment because its internal npm registry does not expose the Vite package.

## 2.0.0-phase.4 — Attendance and Course–Routine Integration

### Added
- Dedicated Attendance Tracker page and navigation item.
- Present, Absent, Late, Excused and Cancelled attendance statuses.
- Course-wise attendance history CRUD, search, filtering and sorting.
- Shared course catalog built from current courses and saved semester snapshots.
- Global default attendance target and per-course target overrides.
- Automatic percentage, at-risk, safely missable and required-class calculations.
- Academic course linkage in weekly Routine items.
- Quick attendance marking from today's linked routine classes.
- Attendance warning cards on Dashboard.
- Course attendance visualizations in Analytics.
- Printable course attendance table in Reports.
- Attendance support in Global Search and Calendar timeline.
- Attendance and course-catalog utility tests.

### Changed
- App version updated to `2.0.0-phase.4`.
- Storage schema updated from 4 to 5.
- Routine records now support course identity and attendance-enabled metadata.
- Academic settings now store a default attendance target.
- Productivity score can include a small attendance component when records exist.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 3 records migrate automatically without deleting older data.
- Attendance duplicates for the same course, date and session are blocked.
- Deleting a routine keeps historical attendance records.
- Excused and Cancelled records are excluded from the percentage denominator.

### Verification
- 22 automated tests passed.
- 39 JS/JSX files passed TypeScript syntax parsing.
- Relative import resolution passed with zero missing files.
- Production build was not completed because dependencies were not installed in the verification environment; `npm run build` returned `vite: not found`.


## 2.0.0-phase.5 — Advanced Planning and Exam Preparation

### Added
- Task subtasks, progress, start dates, due times, recurrence, effort estimates, resource links and archive state.
- Automatic next-instance creation when a recurring task is completed.
- Goal milestones and automatic progress calculated from milestones and linked tasks.
- One-click linked task creation from Goal cards.
- Exam course links, syllabus checklists, readiness calculation and preparation status.
- One-click exam preparation tasks generated from incomplete syllabus topics.
- Unified planning timeline in Calendar.
- Planning progress and risk indicators in Dashboard, Analytics and Reports.
- Planning-aware Global Search.
- Shared checklist and planning utility functions with automated tests.

### Changed
- App version updated to `2.0.0-phase.5`.
- Storage schema updated from 5 to 6.
- Task completion now uses checklist-aware progress.
- Productivity analytics now include task progress, goal progress and exam readiness.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 4 task, goal and exam records migrate with safe defaults.
- Recurring tasks are created only after explicit completion and only when a valid recurrence date exists.
- Deleting a goal disconnects linked tasks instead of deleting them.
- Duplicate active exam preparation tasks are blocked.

### Verification
- 30 automated tests passed.
- 41 JS/JSX files passed TypeScript JSX syntax transpilation.
- Relative import resolution passed with zero missing files.
- Production build was not completed because dependencies are not installed in this environment; `npm run build` returned `vite: not found`.

## 2.0.0-phase.6 — Real Habits, Study Analytics and Persistent Focus

### Added
- Date-based habit check-in history with daily targets.
- Daily, weekdays, weekly and custom-day habit schedules.
- Current streak, longest streak, 7-day/30-day consistency and 35/70-day heatmaps.
- Missed scheduled-day detection and historical check-in editing.
- Course/task-linked Study Analyzer sessions.
- Study method, location, start/end time, distraction level and source metadata.
- Persistent Pomodoro state stored by end timestamp.
- Configurable focus, short break, long break, cycle count and daily focus target.
- Task, course and topic context for focus sessions.
- Optional automatic Pomodoro-to-Study-Analyzer logging.
- Focus session details and safe history deletion.
- Upgraded Focus Mode priority queue and selected-context workflow.
- Habit/focus integrations across Dashboard, Analytics, Calendar, Search, Reports and Achievements.
- Habit and focus utility test suites.

### Changed
- App version updated to `2.0.0-phase.6`.
- Storage schema updated from 6 to 7.
- Habit statistics now derive from actual calendar dates instead of `checked`, `week` and `streak` counters.
- Study duration is normalized to minutes while preserving an hours compatibility field.
- Dashboard and reports use real habit consistency and focus-session data.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 5 habits, study logs and focus sessions migrate with safe defaults.
- Timer completion is guarded against duplicate session creation.
- Unscheduled habit dates cannot be checked accidentally from the heatmap.
- Deleting Focus History does not silently delete its Study Analyzer record.

### Verification
- 38 automated tests passed.
- 45 JS/JSX files passed TypeScript JSX syntax parsing.
- Relative import resolution passed with zero missing files.
- Production dependency installation could not complete because the internal verification registry returned HTTP 404 for `vite-8.0.10.tgz`.

## 2.0.0-phase.9 — Advanced Analytics, Custom Reports and Achievements

### Added
- Date-range analytics for 7-day, 30-day, current-month, semester, custom and all-data views.
- Current-versus-previous-period comparison for study minutes, focus minutes, completed tasks and attendance.
- Transparent dynamic productivity scoring with visible factor values and weights.
- Course Health scoring from attendance, tasks, study, exam readiness and knowledge coverage.
- Rule-based smart insights for attendance, exams, overdue tasks, habit streaks, study trends, GPA trends, workload and focus goals.
- Custom Report Builder with selectable sections and seven ready-made report presets.
- Persistent saved report templates.
- CSV, JSON, standalone HTML and browser Print/Save PDF report output.
- Rules-based Achievement System 2.0 with progress, unlock dates and next-badge recommendation.
- Dashboard weekly-performance, achievement and smart-insight panels.
- Analytics and achievement utility test suite.

### Changed
- App version updated to `2.0.0-phase.9`.
- Storage schema updated from 9 to 10.
- Dashboard Life Score now uses the shared transparent Phase 9 productivity calculation.
- Analytics, Reports, Achievements and Dashboard now use shared calculation utilities.
- Reports page changed from one fixed report to a configurable report builder.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 8 data migrates automatically without deleting prior records.
- Empty analytics factors are excluded instead of lowering the score artificially.
- Achievement unlock records are stored separately from the calculated badge rules.
- Report templates store configuration only and do not duplicate application data.
- CSV, JSON and HTML exports are generated locally in the browser.

### Verification
- 59 automated tests passed.
- 56 JS/JSX source files passed TypeScript syntax parsing with zero syntax errors.
- 219 relative imports resolved with zero missing files.
- 25 plain JavaScript files passed `node --check`.
- Production dependency installation could not complete because the internal verification registry returned HTTP 404 for required Vite/Recharts dependency tarballs.

## 2.0.0-phase.10 — Premium UI/UX and Responsive Finalization

### Added
- Neutral slate, indigo and cyan premium design system.
- Complete light, dark and system theme support.
- Theme bootstrap script that prevents startup color flashing.
- Grouped and collapsible desktop sidebar.
- Mobile bottom navigation and full-section navigation sheet.
- Profile identity and appearance preferences in Settings & Data.
- Comfortable and compact density modes.
- Reduced-motion preference and system reduced-motion support.
- English and Bangla navigation-label foundation.
- Keyboard focus trapping, Escape handling and focus restoration for dialogs.
- Mobile-safe-area spacing and responsive navigation.
- UI preference migration tests.

### Changed
- App version updated to `2.0.0-phase.10`.
- Storage schema updated from 10 to 11.
- Previous green-dominant gradients were replaced by neutral surfaces and semantic colors.
- Green is now reserved for success and positive progress.
- Landing page, sidebar, cards, forms, buttons, search, reports, analytics and modal styling were refreshed.
- Backup page became Settings & Data while preserving export/import/reset behavior.
- Existing reports receive refined print-safe styling.

### Safety
- Existing `lifeos-v2base-final` storage key remains unchanged.
- Phase 1–9 data migrates automatically without deleting existing collections.
- No Phase 9 source file was removed.
- UI settings are stored in the separate `uiPreferences` collection.
- Existing routes and module identifiers remain unchanged.

### Verification
- 60 automated tests passed.
- 58 JavaScript/JSX source files passed TypeScript JSX syntax parsing.
- Relative import resolution passed with zero missing files.
- CSS braces and source archive integrity passed.
- Production build could not run in the verification environment because dependencies were not installed; `npm run build` returned `vite: not found`.
