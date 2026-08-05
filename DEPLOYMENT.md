# LifeOS Web 2.0 — Deployment

## Standard Static Hosting

```bash
npm install
npm run check
```

Upload the generated `dist` directory to a static host such as Firebase Hosting, Netlify, Vercel static hosting, Cloudflare Pages, or a standard web server.

The default Vite base path is `./`, making asset URLs portable.

## GitHub Pages

For the repository path `/lifeos-dashboard/`:

```bash
npm install
npm run test:stable
npm run build:github
```

Deploy `dist` to GitHub Pages.

## Custom Subdirectory

```bash
VITE_BASE_PATH=/your-subdirectory/ npm run build
```

On Windows PowerShell:

```powershell
$env:VITE_BASE_PATH='/your-subdirectory/'
npm run build
```

## Deployment Verification

After deployment, verify:

- Landing page and workspace navigation
- Lazy-loaded pages
- Light/dark theme
- Refresh and localStorage persistence
- Backup export/import
- Note/resource links
- Calendar and reminders
- Report printing
- Mobile bottom navigation

## Important Limitation

LifeOS Web 2.0 is local-first. Static hosting does not provide accounts, cloud storage, or cross-device synchronization. Those belong to the cloud phase.
