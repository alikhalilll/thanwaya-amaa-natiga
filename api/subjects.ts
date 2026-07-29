/**
 * Vercel Serverless Function — headless-Chromium proxy for natega.youm7.com.
 *
 * Plain fetch() gets fingerprinted by Youm7's WAF and returns the empty
 * Home form. A real browser (chromium via puppeteer-core) sends legit TLS
 * and can pass any JS challenge. Same Vercel egress IP as fetch, so this
 * is best-effort — if Youm7 still rejects on IP, we surface a clear error.
 *
 * Endpoint:  GET /api/subjects?seat=2001970[&system=1|2][&debug=1]
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const UPSTREAM = 'https://natega.youm7.com';
const NAV_TIMEOUT = 20_000;

const ALLOWED_ORIGINS = new Set([
  'https://alikhalilll.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

export const config = {
  memory: 1024,
  maxDuration: 45,
};

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

  if (!/^\d{7}$/.test(seat)) return res.status(400).json({ error: 'seat must be 7 digits' });
  if (!/^[12]$/.test(system)) return res.status(400).json({ error: 'system must be 1 or 2' });

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8' });

    await page.goto(`${UPSTREAM}/Home`, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT,
    });

    // Fill the seating number input (id="seat-number", name="seating_no").
    await page.waitForSelector('#seat-number', { timeout: NAV_TIMEOUT });
    await page.type('#seat-number', seat, { delay: 20 });
    // Pick the right system radio.
    await page.$eval(
      `input[name="system"][value="${system}"]`,
      (el: HTMLInputElement) => (el.checked = true),
    );

    // Submit the form and wait for the result page.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }),
      page.click('.inquiry-form__submit'),
    ]);

    const html = await page.content();

    if (debug) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    const parsed = parseYoum7(html, seat);
    if (parsed.subjects.length === 0 && parsed.total == null) {
      return res.status(502).json({
        error: 'upstream returned no result data — Youm7 may have rejected this request',
        seat,
      });
    }
    res.setHeader('Cache-Control', 's-maxage=3600, max-age=60');
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(502).json({
      error: 'upstream fetch failed',
      detail: err instanceof Error ? err.message : String(err),
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── HTML parser (unchanged from fetch version) ─────────────────────────────

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

function extractSubjects(plain: string): Subject[] {
  const out: Subject[] = [];
  const headerIdx = plain.indexOf('المادة الدرجة النسبة المئوية');
  const totalIdx = plain.indexOf('النسبة المئوية الكلية');
  if (headerIdx < 0) return out;
  const region = plain.slice(
    headerIdx + 'المادة الدرجة النسبة المئوية'.length,
    totalIdx > headerIdx ? totalIdx : plain.length,
  );

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

  const totalMatch = plain.match(/مجموع الدرجات\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  const total = totalMatch ? parseFloat(totalMatch[1]) : undefined;
  const totalMax = totalMatch ? parseFloat(totalMatch[2]) : undefined;

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
