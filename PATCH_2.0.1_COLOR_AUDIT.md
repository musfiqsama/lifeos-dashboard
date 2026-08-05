# Phase 11.1 Color & Responsive Audit

## Dark Theme Hierarchy

The patch now uses a clearer layered structure:

- Page background: darkest layer
- Standard cards: elevated dark navy surface
- Interactive and summary rows: slightly lighter slate surface
- Borders and calendar grid: stronger neutral slate lines
- Primary text: near-white
- Field labels: bright cool gray
- Secondary text: readable muted gray
- Disabled text: visibly subdued but not invisible

Automated contrast checks verify that primary, label, muted, and secondary-muted text all meet at least a 4.5:1 contrast ratio against the dark interactive surface.

## Calendar Audit

Checked and patched:

- Month weekday header
- Month cell boundaries
- Outside-month dates
- Today indicator
- Selected date indicator
- Event time and title
- Seven semantic event colors
- Week cards and headings
- Day agenda rows
- Reminder and routine-exception cards
- Mobile month-card layout

## Shared Filter Audit

The shared CRUD toolbar now:

- Wraps instead of creating implicit overflow columns
- Keeps search, filters, and sort fields inside the parent card
- Allows select elements to shrink safely
- Uses full-width stacked controls on narrow screens
- Uses dedicated high-contrast label text

This fixes Routine, Attendance, Tasks, Goals, Exams, Habits, Notes, Resources, and any other page using the shared toolbar.

## Legacy Surface Sweep

Theme-aware replacements were applied to:

- Academic result and degree blocks
- Attendance course cards, metric chips, rings, and quick actions
- Routine cards and planning insight rows
- Habit controls and custom-day picker
- Timer context, settings checks, and focus checklist
- Notes editor tabs and preview panel
- Search history controls
- Analytics factor/insight rows
- Report range, section, and template controls
- Dashboard score and achievement rows
