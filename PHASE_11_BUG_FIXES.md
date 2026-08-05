# Phase 11 — Bug Fixes and Hardening

## Security and Data Safety

- Validated Task resource URLs with the same protocol allowlist used by Resources.
- Sanitized unsafe Task and Resource URLs during migration, restore, and save normalization.
- Protected external links with `rel="noopener noreferrer"`.
- Replaced related-resource external anchors in Note details with safe internal record navigation.

## Relationship Integrity

- Duplicating a Note now adds the duplicated note ID to all linked Resources.
- Duplicating a Resource now adds the duplicated resource ID to all linked Notes.
- Existing delete cleanup remains intact.

## Accessibility and Interaction

- Added explicit `type="button"` to every non-submit button.
- Added unique dialog title IDs.
- Added topmost-only Escape and focus handling for nested dialogs.
- Preserved body scroll lock until the last modal closes.
- Added keyboard focus trap, Escape handling, focus restoration, and scroll lock to mobile navigation.

## Reliability and Performance

- Preference updates now derive from the latest state to avoid stale-value overwrites.
- Reminder polling now keeps a current API ref instead of recreating the interval on every state update.
- Reminder release timers are cleared during cleanup.
- Feature pages now use route-level lazy loading with an accessible loading state.
- Default production asset base changed to portable relative URLs.
