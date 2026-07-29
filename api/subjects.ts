/**
 * Vercel Serverless Function — proxy for natega.youm7.com per-student results.
 *
 * Why Vercel and not Cloudflare Workers: natega.youm7.com sits behind
 * Cloudflare and blocks Worker-to-Worker (Cloudflare-to-Cloudflare) traffic
 * silently — the upstream returns the empty Home form. Vercel functions run
 * on AWS IPs that pass through, so we get the real result page.
 *
 * Endpoint:  GET /api/subjects?seat=2001970[&system=1|2][&debug=1]
 * Response:  { seat, name?, section?, status?, education?, total?, totalMax?,
 *              percentTotal?, subjects: [{name, score, max, percent, offered}],
 *              source, fetchedAt }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTREAM = 'https://natega.youm7.com';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120 Safari/537.36';

const ALLOWED_ORIGINS = new Set([
  'https://alikhalilll.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const seat = String(req.query.seat ?? '').trim();
  const system = String(req.query.system ?? '1').trim();
  const debug = req.query.debug === '1';

  if (!/^\d{7}$/.test(seat)) {
    return res.status(400).json({ error: 'seat must be 7 digits' });
  }
  if (!/^[12]$/.test(system)) {
    return res.status(400).json({ error: 'system must be 1 or 2' });
  }

  try {
    // Step 1: warm up a session with GET /Home so we look like a browser.
    await fetch(`${UPSTREAM}/Home`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });

    // Step 2: POST /Result/1 with the real field names.
    const body = new URLSearchParams({ seating_no: seat, system }).toString();
    const upstream = await fetch(`${UPSTREAM}/Result/1`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${UPSTREAM}/Home`,
        Origin: UPSTREAM,
      },
      body,
    });
    const html = await upstream.text();

    if (debug) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Upstream-Status', String(upstream.status));
      return res.status(200).send(html);
    }

    const parsed = parseYoum7(html, seat);
    res.setHeader('Cache-Control', 's-maxage=3600, max-age=60');
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(502).json({
      error: 'upstream fetch failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── HTML → structured extractor ───────────────────────────────────────────

type Subject = {
  name: string;
  score: number | null;
  max: number | null;
  percent: number | null;
  offered: boolean;
};

type Parsed = {
  seat: string;
  name?: string;
  section?: string;
  status?: string;
  education?: string;
  total?: number;
  totalMax?: number;
  percentTotal?: number;
  subjects: Subject[];
  source: string;
  fetchedAt: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toPlain(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function extractLabel(plain: string, labels: string[]): string | undefined {
  // Value follows "<label>:" or "<label>" then a run of tokens ending before
  // the next known section marker.
  const stopMarkers = [
    'حالة الطالب',
    'نوعية التعليم',
    'الشعبة',
    'رقم الجلوس',
    'تنزيل',
    'المادة',
    'الدرجة',
    'النسبة المئوية',
    'مجموع الدرجات',
    'النسبة المئوية الكلية',
  ];
  for (const label of labels) {
    const re = new RegExp(
      escapeRe(label) + '\\s*[:：]?\\s*(.*?)(?=' +
        stopMarkers.filter((m) => m !== label).map(escapeRe).join('|') +
        '|$)',
    );
    const m = plain.match(re);
    if (m) {
      const v = m[1].trim();
      if (v && v.length < 200) return v;
    }
  }
  return undefined;
}

/** Youm7 renders subjects as "<subject-name> <score> / <max> <percent>%" lines
 *  (or "غير مقرر / <max> —" when not registered for that subject). */
function extractSubjects(plain: string): Subject[] {
  const out: Subject[] = [];
  // Anchor scan to the block between "المادة الدرجة النسبة المئوية" (header row)
  // and "النسبة المئوية الكلية" (grand-total row).
  const headerIdx = plain.indexOf('المادة الدرجة النسبة المئوية');
  const totalIdx = plain.indexOf('النسبة المئوية الكلية');
  if (headerIdx < 0) return out;
  const region = plain.slice(
    headerIdx + 'المادة الدرجة النسبة المئوية'.length,
    totalIdx > headerIdx ? totalIdx : plain.length,
  );

  // Match either "<subj> <score> / <max> <pct>%" or "<subj> غير مقرر / <max> —"
  const re =
    /([؀-ۿ][؀-ۿ\s]{2,60}?)\s+(?:(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%|غير\s*مقرر\s*\/\s*(\d+(?:\.\d+)?)\s+[—\-])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region)) !== null) {
    const name = m[1].trim().replace(/\s+/g, ' ');
    if (m[2] != null) {
      out.push({
        name,
        score: parseFloat(m[2]),
        max: parseFloat(m[3]),
        percent: parseFloat(m[4]),
        offered: true,
      });
    } else {
      out.push({
        name,
        score: null,
        max: parseFloat(m[5]),
        percent: null,
        offered: false,
      });
    }
  }
  return out;
}

function parseYoum7(html: string, seat: string): Parsed {
  const plain = toPlain(html);

  const status = extractLabel(plain, ['حالة الطالب']);
  const education = extractLabel(plain, ['نوعية التعليم']);
  const section = extractLabel(plain, ['الشعبة']);
  const name = extractLabel(plain, ['اسم الطالب', 'الاسم']);

  const subjects = extractSubjects(plain);

  // "مجموع الدرجات 290.00 / 320"
  const totalMatch = plain.match(/مجموع الدرجات\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  const total = totalMatch ? parseFloat(totalMatch[1]) : undefined;
  const totalMax = totalMatch ? parseFloat(totalMatch[2]) : undefined;

  // "النسبة المئوية الكلية 90.63 %"
  const pctMatch = plain.match(/النسبة المئوية الكلية\s+(\d+(?:\.\d+)?)\s*%/);
  const percentTotal = pctMatch ? parseFloat(pctMatch[1]) : undefined;

  return {
    seat,
    name,
    section,
    status,
    education,
    total,
    totalMax,
    percentTotal,
    subjects,
    source: 'natega.youm7.com',
    fetchedAt: new Date().toISOString(),
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
