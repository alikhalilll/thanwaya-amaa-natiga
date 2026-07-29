import type { DataIndex, StudentRecord } from './types';
import { normalizeArabic } from './format';

const BASE = import.meta.env.BASE_URL;

// Packed row tuples in the JSON shards:
//   seat shard: [offsetFromBucketBase, name, degree, status, tier, rank, rankInStatus]
//   letter shard + top-N shards: [seat, name, degree, status, tier, rank, rankInStatus]
type Packed = [number, string, number, number, number, number, number];

function unpackAsSeat(bucketBase: number, p: Packed): StudentRecord {
  return {
    seat: bucketBase + p[0],
    name: p[1],
    degree: p[2],
    status: p[3],
    tier: p[4],
    rank: p[5],
    rankInStatus: p[6],
  };
}

function unpackAbsolute(p: Packed): StudentRecord {
  return {
    seat: p[0],
    name: p[1],
    degree: p[2],
    status: p[3],
    tier: p[4],
    rank: p[5],
    rankInStatus: p[6],
  };
}

let indexPromise: Promise<DataIndex> | null = null;
const seatBucketCache = new Map<number, StudentRecord[]>();
const letterChunkCache = new Map<string, StudentRecord[]>();
const topCache = new Map<string, StudentRecord[]>();

export function loadIndex(): Promise<DataIndex> {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}data/index.json`).then((r) => {
      if (!r.ok) throw new Error(`index.json ${r.status}`);
      return r.json() as Promise<DataIndex>;
    });
  }
  return indexPromise;
}

async function loadSeatBucket(bucket: number): Promise<StudentRecord[]> {
  const cached = seatBucketCache.get(bucket);
  if (cached) return cached;
  const idx = await loadIndex();
  const bucketBase = bucket * 10 ** (7 - idx.bucketDigits);
  const res = await fetch(`${BASE}data/by-seat/${bucket}.json`);
  if (!res.ok) {
    if (res.status === 404) {
      seatBucketCache.set(bucket, []);
      return [];
    }
    throw new Error(`bucket ${bucket} ${res.status}`);
  }
  const raw = (await res.json()) as { s: Packed[] };
  const rows = raw.s.map((p) => unpackAsSeat(bucketBase, p));
  seatBucketCache.set(bucket, rows);
  return rows;
}

export async function getBySeating(
  seat: number,
): Promise<StudentRecord | null> {
  const idx = await loadIndex();
  if (seat < idx.seatingMin || seat > idx.seatingMax) return null;
  const bucketSize = 10 ** (7 - idx.bucketDigits);
  const bucket = Math.floor(seat / bucketSize);
  const rows = await loadSeatBucket(bucket);
  return rows.find((r) => r.seat === seat) ?? null;
}

function letterSlug(letter: string): string {
  return 'u' + letter.charCodeAt(0).toString(16).padStart(4, '0');
}

async function loadLetterChunk(letter: string, chunk: number): Promise<StudentRecord[]> {
  const key = `${letter}:${chunk}`;
  const cached = letterChunkCache.get(key);
  if (cached) return cached;
  const url = `${BASE}data/by-letter/${letterSlug(letter)}/${chunk}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    letterChunkCache.set(key, []);
    return [];
  }
  const raw = (await res.json()) as { s: Packed[] };
  const rows = raw.s.map(unpackAbsolute);
  letterChunkCache.set(key, rows);
  return rows;
}

export type Filters = {
  statuses?: Set<number>;
  tiers?: Set<number>;
  minDegree?: number;
  maxDegree?: number;
};

export type SortOrder = 'degree_desc' | 'degree_asc' | 'seat_asc';

export type NameSearchResult = {
  hits: StudentRecord[];
  totalMatches: number;
};

function matches(r: StudentRecord, f: Filters): boolean {
  if (f.statuses && f.statuses.size > 0 && !f.statuses.has(r.status)) return false;
  if (f.tiers && f.tiers.size > 0 && !f.tiers.has(r.tier)) return false;
  if (f.minDegree != null && r.degree < f.minDegree) return false;
  if (f.maxDegree != null && r.degree > f.maxDegree) return false;
  return true;
}

/**
 * A name matches if every whitespace-separated token in the query appears
 * somewhere in the normalized name. This lets users search "احمد سيد" and get
 * "احمد محمود السيد عبدالجواد السيد" — much more forgiving than a strict
 * substring match on the whole query.
 */
function nameMatches(nameNorm: string, tokens: string[]): boolean {
  for (const t of tokens) if (!nameNorm.includes(t)) return false;
  return true;
}

function applySort(rows: StudentRecord[], sort: SortOrder): StudentRecord[] {
  const copy = [...rows];
  switch (sort) {
    case 'degree_desc':
      copy.sort((a, b) => b.degree - a.degree || a.seat - b.seat);
      break;
    case 'degree_asc':
      copy.sort((a, b) => a.degree - b.degree || a.seat - b.seat);
      break;
    case 'seat_asc':
      copy.sort((a, b) => a.seat - b.seat);
      break;
  }
  return copy;
}

export async function searchByName(
  query: string,
  options: {
    signal?: AbortSignal;
    filters?: Filters;
    sort?: SortOrder;
    onProgress?: (loaded: number, total: number) => void;
  } = {},
): Promise<NameSearchResult> {
  const { signal, filters = {}, sort = 'degree_desc', onProgress } = options;
  const q = normalizeArabic(query);
  const tokens = q.split(' ').filter((t) => t.length >= 2);
  if (tokens.length === 0) return { hits: [], totalMatches: 0 };

  const idx = await loadIndex();
  // Shard by the first letter of the first token — letter buckets group
  // students by the first character of their first name.
  const primary = tokens[0].charAt(0);
  const meta = idx.letters[primary];
  if (!meta) return { hits: [], totalMatches: 0 };

  const matched: StudentRecord[] = [];
  for (let c = 0; c < meta.chunks; c++) {
    if (signal?.aborted) break;
    const rows = await loadLetterChunk(primary, c);
    for (const r of rows) {
      if (!matches(r, filters)) continue;
      if (nameMatches(normalizeArabic(r.name), tokens)) matched.push(r);
    }
    onProgress?.(c + 1, meta.chunks);
  }

  const sorted = applySort(matched, sort);
  return { hits: sorted, totalMatches: sorted.length };
}

async function loadTop(name: string): Promise<StudentRecord[]> {
  const cached = topCache.get(name);
  if (cached) return cached;
  const res = await fetch(`${BASE}data/top/${name}.json`);
  if (!res.ok) {
    topCache.set(name, []);
    return [];
  }
  const raw = (await res.json()) as { s: Packed[] };
  const rows = raw.s.map(unpackAbsolute);
  topCache.set(name, rows);
  return rows;
}

export function getTopOverall(): Promise<StudentRecord[]> {
  return loadTop('overall-100');
}

export function getTopByStatus(statusIdx: number): Promise<StudentRecord[]> {
  return loadTop(`status-${statusIdx}-100`);
}

export async function getSimilarInTier(
  record: StudentRecord,
  count = 6,
): Promise<StudentRecord[]> {
  // Fetch enough of the top-100 to find neighbours in the same rank neighborhood.
  const top = await getTopOverall();
  // If the student is inside top 100 we can grab neighbours from there directly.
  const idxInTop = top.findIndex((r) => r.seat === record.seat);
  if (idxInTop !== -1) {
    const start = Math.max(0, idxInTop - Math.floor(count / 2));
    return top.slice(start, start + count).filter((r) => r.seat !== record.seat);
  }
  // Otherwise, we return top-N from the same status as a lightweight "peer" set.
  const peers = await getTopByStatus(record.status);
  return peers.slice(0, count).filter((r) => r.seat !== record.seat);
}
