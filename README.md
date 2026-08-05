# LifeOS Web 2.0.1

LifeOS is a local-first academic and productivity workspace for university students. It combines academic records, attendance, planning, routines, focus sessions, notes, resources, analytics, reports, and achievements in one responsive React application.

## Stable Release

Version: **2.0.1**  
Storage schema: **11**  
Storage key: `lifeos-v2base-final`

This patch keeps the complete LifeOS Web 2.0 feature set and fixes the dark-theme contrast, calendar clarity, responsive filter overflow, and legacy surface colors reported after the stable release. Existing LifeOS browser data and versioned/legacy backups continue to work without a storage migration.

## Main Modules

- Dashboard and Global Search
- Academic System 2.0 and CGPA planning
- Attendance Tracker
- Routine, Calendar, and Reminders
- Tasks, Goals, and Exam Preparation
- Real Habit Tracker
- Persistent Pomodoro and Focus Mode
- Study Analyzer
- Markdown Notes and Course Resources
- Analytics, Course Health, Smart Insights, and Achievements
- Custom Reports
- Settings, Backup, Restore, and Reset

## 2.0.1 Contrast Patch

- Rebalanced the dark palette with brighter primary, secondary, muted, and label text.
- Replaced pale hard-coded legacy surfaces with theme-aware slate surfaces.
- Rebuilt Calendar month/week/day contrast, grid separation, selected/today states, and event chips.
- Fixed Routine and other CRUD filter toolbars so every field wraps inside the card.
- Fixed Attendance filter labels and result text contrast.
- Fixed Dashboard Weekly Performance and Achievement Progress summary rows.
- Re-audited academic, attendance, habit, focus, note, search, analytics, and report widgets.
- Added automated WCAG contrast and regression-selector tests.

## Stable Release Improvements

- Route-level lazy loading for feature pages
- Portable relative production base path by default
- Dedicated GitHub Pages build command
- Unsafe external URL filtering during form validation, migration, restore, and display
- Consistent Note ↔ Resource relationships after duplication or deletion
- Nested-modal focus handling and unique accessible dialog labels
- Keyboard focus trapping and scroll locking in the mobile navigation sheet
- Stale preference-update protection
- Stable reminder interval lifecycle
- Explicit button types throughout the interface
- Additional storage round-trip, URL-safety, and cross-module integration tests
- Dependency-free source verification command

## Requirements

- Node.js 20.19.0 or newer
- npm

## Run Locally

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite.

## Test and Verify

Run the automated suite and dependency-free source audit:

```bash
npm run test:stable
```

Run tests, source verification, and a production build:

```bash
npm run check
```

Run only the production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

The default production base is relative (`./`), so the generated `dist` folder is portable across normal static hosts.

For GitHub Pages under `/lifeos-dashboard/`:

```bash
npm run build:github
```

Then deploy the generated `dist` folder.

## Data and Privacy

- Data is stored in the current browser using `localStorage`.
- No account, server database, or automatic multi-device synchronization is included yet.
- Export a JSON backup before clearing browser data or changing devices.
- Imports larger than 5 MB or with invalid LifeOS structure are rejected.
- Unsafe `javascript:`, `data:`, and unsupported external-link protocols are removed during normalization.

## Reminder Behavior

- In-app reminders work while LifeOS is open.
- Browser notifications require explicit permission.
- Background push after all LifeOS tabs are closed is reserved for the cloud phase.

## Documentation

- `USER_GUIDE.md`
- `DEPLOYMENT.md`
- `DATA_MODEL.md`
- `KNOWN_LIMITATIONS.md`
- `PHASE_11_SUMMARY.md`
- `PHASE_11_VERIFICATION.md`
- `PHASE_11_BUG_FIXES.md`

## Author

Made by Sama
