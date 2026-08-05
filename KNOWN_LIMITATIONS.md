# LifeOS Web 2.0 — Known Limitations

- Browser-local data only; no account or automatic cloud sync.
- Clearing browser storage removes data unless a backup exists.
- External files are not uploaded; Resources stores metadata and links.
- Browser notification behavior depends on permission and an open LifeOS tab.
- No service worker or background push delivery.
- Bangla support is a navigation/interface foundation, not a complete translation of every page.
- Browser Print / Save as PDF is used instead of a server-generated PDF service.
- Production dependency installation requires access to the configured npm registry.
- This release was source-tested in the current environment, but a production Vite build could not be executed here because the environment could not install the Vite package.
