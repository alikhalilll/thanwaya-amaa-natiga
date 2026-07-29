# Subjects proxy (Cloudflare Worker)

A tiny Worker that fetches a single student's Thanaweya Amma detail (name,
school, educational district, section, per-subject scores) from
`natega.youm7.com` and returns JSON with the right CORS headers so the site
can display it on the student detail page.

## One-time setup

1. Install `wrangler` and log in:

   ```bash
   npm install
   npx wrangler login
   ```

2. Deploy:

   ```bash
   npx wrangler deploy
   ```

   Wrangler prints the public URL of your Worker, e.g.
   `https://thanwaya-subjects-proxy.<your-subdomain>.workers.dev`.

3. In the site repo root, create a `.env.production.local` (or set a build-time
   env in your CI) with:

   ```env
   VITE_PROXY_URL=https://thanwaya-subjects-proxy.<your-subdomain>.workers.dev
   ```

4. Rebuild and redeploy the site. The student detail page will now show a
   "درجات المواد" panel that calls the proxy when opened.

## Usage

```
GET https://…/?seat=2001970&system=2
```

- `seat`: 7-digit seating number (required)
- `system`: `2` for the new-system scoring track (default), `1` for the old track

Response:

```json
{
  "seat": "2001970",
  "name": "احمد محمود …",
  "school": "…",
  "district": "…",
  "section": "علمي علوم",
  "total": "290",
  "subjects": [
    { "name": "اللغة العربية", "score": 78 },
    { "name": "اللغة الإنجليزية", "score": 45 }
  ],
  "source": "natega.youm7.com",
  "fetchedAt": "2026-07-29T22:00:00.000Z"
}
```

Fields are omitted when the upstream HTML doesn't include them or the parser
can't locate them — the site handles missing fields gracefully.

## Rate limiting

`wrangler.toml` enables a per-IP rate limit (20 req/60s) to keep the proxy
interactive-only. Do not use this Worker for bulk scraping.

## Legal / operational notes

- The upstream (`natega.youm7.com`) is a public results portal. Responsibility
  for compliance with its Terms of Service rests with the operator of the
  Worker. Keep traffic light and interactive.
- If the upstream changes its HTML markup, adjust the extractor in
  `src/index.ts` (`parseYoum7`).
