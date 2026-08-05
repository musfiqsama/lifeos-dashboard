# LifeOS Web 2.0.1 — Dark Contrast & Layout Patch

## Purpose

This patch addresses the visual regressions reported after LifeOS Web 2.0 Stable. It keeps every existing module and all local data behavior intact while making the dark theme readable and the shared filter layouts responsive.

## Confirmed Issues Fixed

1. Calendar month/week/day views were difficult to understand in dark mode.
2. Secondary, muted, and field-label text faded into dark surfaces.
3. Routine filters overflowed the toolbar and appeared behind adjacent content.
4. Attendance `Course`, `Status`, and `Sort` labels were hard to read.
5. Dashboard Weekly Performance and Achievement Progress rows used light text on pale blocks.

## Main Changes

- Rebalanced dark background, card, raised-surface, border, primary text, muted text, and field-label tokens.
- Added dedicated tokens for interactive surfaces, disabled text, calendar grid lines, and semantic event colors.
- Replaced remaining pale hard-coded legacy surfaces with theme-aware surfaces.
- Converted shared CRUD toolbars from a fixed-column grid to a wrapping flex layout.
- Strengthened calendar grid separation, today/selected states, outside-month dates, weekday headers, week cards, agendas, and reminder cards.
- Added readable green, blue, purple, orange, rose, gray, and teal event-chip combinations for both light and dark themes.
- Fixed summary-row label/value hierarchy and semantic success/risk colors.
- Re-audited Academic, Attendance, Routine, Calendar, Habits, Focus, Notes, Search, Analytics, Reports, and Dashboard widgets.

## Compatibility

- App version: `2.0.1`
- Storage schema: `11` (unchanged)
- Storage key: `lifeos-v2base-final` (unchanged)
- Existing browser data: preserved
- Existing backups: compatible
- New dependencies: none
