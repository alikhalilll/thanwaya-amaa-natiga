# نتيجة الثانوية العامة 2026 — الدور الأول

A fast, animated static site for searching Egyptian General Secondary Education
(Thanaweya Amma) 2026 first-round results by seating number or name, with
status and degree filters.

- **Stack:** Vite + React + TypeScript + Tailwind + Framer Motion + Zustand.
- **Deploy target:** GitHub Pages (via `.github/workflows/deploy.yml`).
- **Data strategy:** the 919K-row Excel is sharded at build time into small
  JSON files under `public/data/` so lookups only fetch what's needed.

## Local development

```bash
npm install
# Build the sharded data (reads ~/Downloads/يرو500.xlsx by default)
npm run build:data
# Or point it at a different xlsx:
node scripts/build-data.mjs /path/to/results.xlsx
npm run dev
```

Then open the URL Vite prints. Try:
- `2001970` in the search box → single-result view.
- Part of an Arabic name → progressive list.
- Combine with the status / degree filters.

## Production build

```bash
npm run build:data   # only needed if the Excel changed
npm run build
npm run preview
```

## Deployment (GitHub Pages)

Any push to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and publishes `dist/` to Pages. The Vite `base` is set to
`/thanwaya-amaa-natiga/` to match the repo name.

## Data output layout

```
public/data/
  index.json              # global metadata (totals, statuses, ranges)
  by-seat/<bucket>.json   # one shard per 4-digit seating prefix
  by-name/<n>.json        # fixed-size flat shards used for name search
```
