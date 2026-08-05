# Phase 0 Baseline Audit

## Baseline

The uploaded `lifeos-light-clean-fixed.zip` is the canonical source. The separately uploaded `package-lock.json` and `vite.config.js` are included because they belong to the same LifeOS file set.

## Source Summary

- React single-page application rendered by Vite
- 18 routed views managed by local page state in `App.jsx`
- 4 shared UI components in the original baseline
- One central application state object persisted in browser localStorage
- Recharts for dashboard and analytics visualizations
- Lucide React for navigation icons
- No backend, authentication, cloud sync, server API, or native mobile layer

## Existing Functional Areas

1. Dashboard and life score
2. Academic GPA calculator and semester snapshots
3. Goals
4. Tasks with filters and overdue detection
5. Habits with weekly checks
6. Notes and pinning
7. Study-hour analyzer
8. Weekly routine
9. Calendar summary
10. Exam countdown
11. Pomodoro timer
12. Analytics
13. Global search
14. Achievement badges
15. Focus mode
16. Printable reports
17. JSON backup/restore
18. Landing page

## Baseline Risks Found

- Dependencies used `latest`, making future installs non-reproducible.
- Storage writes could throw and interrupt the app.
- Stored and imported JSON was only shallowly trusted.
- Backup import accepted any JSON object and immediately replaced app data.
- Browser `alert()` and `confirm()` interrupted the user experience.
- Several date-only calculations used UTC conversion and could shift dates by timezone.
- No render error boundary existed.
- No automated tests existed.
- Semester saving used two separate updates, increasing the risk of inconsistent state changes.
- Most modules have partial CRUD only; full CRUD is intentionally reserved for Phase 2.

## Phase 1 Resolution

Phase 1 addresses installation reproducibility, safe persistence, migration, backup validation, feedback UI, date-only reliability, render recovery, and core logic tests without redesigning or removing current features.

## Deferred to Later Phases

- Full CRUD and relationship model
- Complete semester management and overall CGPA
- Attendance module
- Date-based habit streaks
- Full calendar views
- Persistent/custom Pomodoro
- Authentication, cloud database, and mobile application
