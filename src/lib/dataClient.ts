import type { DataIndex, StudentRecord } from './types';
import { normalizeArabic } from './format';

const BASE = import.meta.env.BASE_URL;

let indexPromise: Promise<DataIndex> | null = null;
const bucketCache = new Map<number, StudentRecord[]>();
const nameShardCache = new Map<number, StudentRecord[]>();

export function loadIndex(): Promise<DataIndex> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}data/index.json`).then((r) => {
      if (!r.ok) throw new Error(`index.json ${r.status}`);
      return r.json() as Promise<DataIndex>;
    });
  }
  return indexPromise;
}

async function loadBucket(bucket: number): Promise<StudentRecord[]> {
  const cached = bucketCache.get(bucket);
  if (cached) return cached;
  const idx = await loadIndex();
  const url = `${BASE}data/by-seat/${bucket}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      bucketCache.set(bucket, []);
      return [];
    }
    throw new Error(`bucket ${bucket} ${res.status}`);
  }
  const raw = (await res.json()) as { s: [number, string, number, number][] };
  const base = bucket * 10 ** (7 - idx.bucketDigits);
  const rows: StudentRecord[] = raw.s.map(([off, name, degree, status]) => ({
    seat: base + off,
    name,
    degree,
    status,
  }));
  bucketCache.set(bucket, rows);
  return rows;
}

export async function getBySeating(
  seat: number,
): Promise<StudentRecord | null> {
  const idx = await loadIndex();
  if (seat < idx.seatingMin || seat > idx.seatingMax) return null;
  const bucketSize = 10 ** (7 - idx.bucketDigits);
  const bucket = Math.floor(seat / bucketSize);
  const rows = await loadBucket(bucket);
  return rows.find((r) => r.seat === seat) ?? null;
}

async function loadNameShard(shard: number): Promise<StudentRecord[]> {
  const cached = nameShardCache.get(shard);
  if (cached) return cached;
  const url = `${BASE}data/by-name/${shard}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    nameShardCache.set(shard, []);
    return [];
  }
  const raw = (await res.json()) as { s: [number, string, number, number][] };
  const rows: StudentRecord[] = raw.s.map(([seat, name, degree, status]) => ({
    seat,
    name,
    degree,
    status,
  }));
  nameShardCache.set(shard, rows);
  return rows;
}

export type NameSearchProgress = {
  loaded: number;
  total: number;
};

export type NameSearchResult = {
  hits: StudentRecord[];
  scanned: number;
  truncated: boolean;
};

export async function searchByName(
  query: string,
  options: {
    limit?: number;
    signal?: AbortSignal;
    onProgress?: (p: NameSearchProgress) => void;
    statusFilter?: Set<number>;
    minDegree?: number;
    maxDegree?: number;
  } = {},
): Promise<NameSearchResult> {
  const { limit = 200, signal, onProgress, statusFilter, minDegree, maxDegree } =
    options;
  const idx = await loadIndex();
  const q = normalizeArabic(query);
  if (q.length < 2)
    return { hits: [], scanned: 0, truncated: false };

  const total = idx.nameShardCount;
  const hits: StudentRecord[] = [];
  let scanned = 0;
  let truncated = false;
  const concurrency = 6;
  let next = 0;

  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      if (hits.length >= limit) {
        truncated = true;
        return;
      }
      const shard = next++;
      if (shard >= total) return;
      const rows = await loadNameShard(shard);
      for (const row of rows) {
        if (statusFilter && !statusFilter.has(row.status)) continue;
        if (minDegree != null && row.degree < minDegree) continue;
        if (maxDegree != null && row.degree > maxDegree) continue;
        if (normalizeArabic(row.name).includes(q)) {
          hits.push(row);
          if (hits.length >= limit) {
            truncated = true;
            break;
          }
        }
      }
      scanned++;
      onProgress?.({ loaded: scanned, total });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  hits.sort((a, b) => b.degree - a.degree);
  return { hits, scanned, truncated };
}
