# ⚠️ Cloudflare Worker version (does not work with Youm7)

**Do not use.** Left in the repo for reference only.

`natega.youm7.com` is itself hosted on Cloudflare and its bot management
silently blocks Cloudflare-Worker → Cloudflare-site traffic — the upstream
returns the empty Home form instead of a result page, so this Worker cannot
extract subject scores.

Verified end-to-end: the same POST that returns the empty Home form from a
Worker returns the real result HTML (with subjects, section, total, percent)
when issued from a non-Cloudflare IP (a Mac, a Vercel Function, etc.).

## Working alternative

Use the Vercel Serverless Function at `../api/subjects.ts`. It uses AWS IPs
that pass through Youm7's edge. Deploy from the repo root:

```bash
cd ..          # back to repo root
npm i -g vercel
vercel        # answer prompts, hit "yes" to deploy
```

Vercel prints the deploy URL. Set that as the `VITE_PROXY_URL` GitHub Actions
repo variable, re-run the "Deploy to GitHub Pages" workflow, and the site's
detail page will fetch subjects live.
