export type Subject = {
  name: string;
  score: number | null;
  max: number | null;
  percent: number | null;
  offered: boolean;
};

export type StudentSubjects = {
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

const PROXY = import.meta.env.VITE_PROXY_URL as string | undefined;

export function isProxyConfigured(): boolean {
  return !!PROXY;
}

const cache = new Map<number, Promise<StudentSubjects>>();

export function fetchStudentSubjects(seat: number): Promise<StudentSubjects> {
  if (!PROXY) return Promise.reject(new Error('proxy not configured'));
  const cached = cache.get(seat);
  if (cached) return cached;

  const p = (async () => {
    // PROXY may be the plain root of a Vercel deploy (…vercel.app) or the
    // root of a legacy Cloudflare Worker (…workers.dev). We probe both.
    const base = PROXY!.replace(/\/+$/, '');
    const url = base.includes('/api/')
      ? `${base}?seat=${seat}`
      : `${base}/api/subjects?seat=${seat}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    return (await res.json()) as StudentSubjects;
  })();

  p.catch(() => cache.delete(seat));
  cache.set(seat, p);
  return p;
}
