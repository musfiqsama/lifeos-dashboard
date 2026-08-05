# LifeOS Web 2.0.1 Diff Summary

Baseline: `LifeOS-Web-2.0-Stable-Source.zip`

## Modified Runtime Files

- `src/styles.css`
  - Added high-contrast dark tokens.
  - Replaced hard-coded pale legacy surfaces.
  - Fixed shared CRUD toolbar wrapping.
  - Reworked Calendar contrast and semantic event colors.
  - Fixed Dashboard summary rows and form/table labels.
- `src/constants/app.js`
  - App version updated to `2.0.1`; storage schema remains `11`.
- `package.json`
  - Package version updated to `2.0.1`.
- `package-lock.json`
  - Root package metadata updated to `2.0.1`.
- `scripts/verify-source.mjs`
  - Stable patch version assertion updated to `2.0.1`.

## Added Automated Test

- `src/utils/theme.test.js`
  - WCAG AA contrast checks for dark text hierarchy.
  - Regression checks for toolbar wrapping, Dashboard rows, Calendar grid, and event-chip tokens.

## Documentation Changes

- Updated `README.md` and `CHANGELOG.md`.
- Added patch summary, color audit, verification, manual checklist, diff summary, and source hashes.

## Compatibility

- No runtime feature removed.
- No collection added or removed.
- No storage migration required.
- Existing browser data and backups remain compatible.
