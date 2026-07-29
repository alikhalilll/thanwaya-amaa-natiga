/**
 * Cloudflare Worker: proxy natega.youm7.com so the static Thanaweya site can
 * fetch per-student subject scores from the browser without hitting CORS.
 *
 * Endpoint:  GET  /?seat=2001970[&system=2]
 * Response:  {
 *   seat, name?, school?, district?, section?, total?,
 *   subjects: [{ name, score, max? }],
 *   source, fetchedAt
 * }
 *
 * Notes:
 * - `system=2` is the "new" secondary-school scoring track (default);
 *   `system=1` is the old track.
 * - The upstream is a server-rendered HTML form (no JSON API). This worker
 *   does the two-step dance (GET home to establish a session, POST the
 *   seat) and parses the response HTML defensively.
 * - Parsing is intentionally *tolerant*: if a field can't be located we omit
 *   it rather than fail — the site will still show whatever we did find.
 * - Aggressive per-IP rate-limiting is enforced via Cloudflare's ratelimit
 *   binding declared in wrangler.toml.
 */

type Env = {
  ALLOWED_ORIGINS: string;
  UPSTREAM_BASE: string;
  RATE_LIMITER?: {
    limit: (opts: { key: string }) => Promise<{ success: boolean }>;
  };
};

type Subject = { name: string; score: number; max?: number };

type StudentSubjects = {
  seat: string;
  name?: string;
  school?: string;
  district?: string;
  section?: string;
  total?: string;
  subjects: Subject[];
  source: string;
  fetchedAt: string;
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('origin') || '';
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);

    const seat = url.searchParams.get('seat')?.trim() ?? '';
    const system = url.searchParams.get('system')?.trim() || '2';
    if (!/^\d{7}$/.test(seat)) {
      return json({ error: 'seat must be 7 digits' }, 400, cors);
    }
    if (!/^[12]$/.test(system)) {
      return json({ error: 'system must be 1 or 2' }, 400, cors);
    }

    // Rate limit per client IP.
    if (env.RATE_LIMITER) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const rl = await env.RATE_LIMITER.limit({ key: ip });
      if (!rl.success) return json({ error: 'rate limited' }, 429, cors);
    }

    try {
      const result = await fetchSubjects(env.UPSTREAM_BASE, seat, system);
      // Cache successful lookups for an hour at the edge; the underlying result
      // never changes for a given seat once published.
      return json(result, 200, {
        ...cors,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      });
    } catch (err) {
      return json(
        {
          error: 'upstream fetch failed',
          detail: err instanceof Error ? err.message : String(err),
        },
        502,
        cors,
      );
    }
  },
};

// ─── helpers ────────────────────────────────────────────────────────────────

function corsHeaders(env: Env, origin: string): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extra,
    },
  });
}

async function fetchSubjects(base: string, seat: string, system: string): Promise<StudentSubjects> {
  // Step 1: GET /Home to establish a session cookie.
  const home = await fetch(`${base}/Home`, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ar,en;q=0.5',
    },
    redirect: 'follow',
  });
  const setCookie = home.headers.get('set-cookie') || '';
  const cookieHeader = setCookie
    .split(/,(?=[^;]+=[^;]+)/)
    .map((p) => p.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  // Step 2: POST the seat and system to /Result/1
  const body = new URLSearchParams({ seatNo: seat, system }).toString();
  const res = await fetch(`${base}/Result/1`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ar,en;q=0.5',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': `${base}/Home`,
      'Origin': base,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body,
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const html = await res.text();
  return parseYoum7(html, seat);
}

/**
 * Best-effort HTML → structured extractor. Deliberately tolerant so a small
 * markup change on the upstream won't wipe out every field.
 */
function parseYoum7(html: string, seat: string): StudentSubjects {
  const strip = (s: string) =>
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

  // A label → next-value extractor. We look for the label text and grab the
  // first plausibly-scored value after it (a span, an li, or plain text).
  const findLabelValue = (labels: string[]): string | undefined => {
    for (const label of labels) {
      const re = new RegExp(
        `${escapeRegex(label)}[\\s\\S]{0,300}?<(?:span|div|li|h[1-6])[^>]*>([\\s\\S]{1,200}?)</(?:span|div|li|h[1-6])>`,
        'i',
      );
      const m = html.match(re);
      if (m) {
        const v = strip(m[1]);
        if (v) return v;
      }
    }
    return undefined;
  };

  const name = findLabelValue(['اسم الطالب', 'الاسم']);
  const school = findLabelValue(['اسم المدرسة', 'المدرسة']);
  const district = findLabelValue(['الإدارة التعليمية', 'الادارة التعليمية', 'الإدارة', 'الادارة']);
  const section = findLabelValue(['الشعبة', 'شعبة الطالب', 'التخصص']);
  const total = findLabelValue(['المجموع الكلي', 'المجموع', 'الدرجة الكلية']);

  const subjects: Subject[] = [];
  // Known Egyptian Thanaweya Amma subjects (any of the common streams).
  const subjectNames = [
    'اللغة العربية',
    'اللغة الإنجليزية',
    'اللغة الفرنسية',
    'اللغة الألمانية',
    'اللغة الإيطالية',
    'اللغة الإسبانية',
    'اللغة الصينية',
    'الرياضيات البحتة',
    'الرياضيات التطبيقية',
    'الرياضيات',
    'الفيزياء',
    'الكيمياء',
    'الأحياء',
    'الجيولوجيا',
    'التاريخ',
    'الجغرافيا',
    'الفلسفة والمنطق',
    'الفلسفة',
    'المنطق',
    'علم النفس والاجتماع',
    'علم النفس',
    'علم الاجتماع',
    'الاقتصاد والإحصاء',
    'الاقتصاد',
    'الإحصاء',
    'التربية الدينية',
    'التربية الوطنية',
  ];

  for (const subj of subjectNames) {
    const re = new RegExp(
      `${escapeRegex(subj)}[\\s\\S]{0,220}?(\\d{1,3}(?:\\.\\d+)?)\\s*(?:من\\s*(\\d{1,3}(?:\\.\\d+)?))?`,
      'i',
    );
    const m = html.match(re);
    if (m) {
      const score = parseFloat(m[1]);
      const max = m[2] ? parseFloat(m[2]) : undefined;
      if (!Number.isNaN(score) && score >= 0 && score <= 200) {
        // Guard against duplicate subject matches by name.
        if (!subjects.some((s) => s.name === subj)) {
          subjects.push({ name: subj, score, ...(max ? { max } : {}) });
        }
      }
    }
  }

  return {
    seat,
    name,
    school,
    district,
    section,
    total,
    subjects,
    source: 'natega.youm7.com',
    fetchedAt: new Date().toISOString(),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
