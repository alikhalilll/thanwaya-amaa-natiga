export type Subject = {
  name: string;
  score: number;
  max?: number;
};

export type StudentSubjects = {
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
    const url = new URL(PROXY);
    url.searchParams.set('seat', String(seat));
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`proxy ${res.status}`);
    }
    return (await res.json()) as StudentSubjects;
  })();

  // Only cache successful responses so failures can be retried.
  p.catch(() => cache.delete(seat));
  cache.set(seat, p);
  return p;
}
