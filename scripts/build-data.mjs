#!/usr/bin/env node
/**
 * Preprocess the Thanaweya Amma Excel into a search-friendly static database
 * under `public/data/`.
 *
 * The raw file has only 4 columns (seating_no, arabic_name, total_degree,
 * student_case_desc) — this script derives a richer per-student record and
 * shards it into small JSON files so the site can look up any student, filter,
 * or search by name without loading the full 900K-row set.
 *
 *   node scripts/build-data.mjs [path/to/results.xlsx]
 *
 * Default input: ~/Downloads/يرو500.xlsx
 */
import xlsxPkg from 'xlsx';
const XLSX = xlsxPkg;
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const HOME = os.homedir();
const DEFAULT_XLSX = path.join(HOME, 'Downloads', 'يرو500.xlsx');
const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_XLSX;

const OUT_ROOT = path.resolve('public', 'data');
const OUT_SEAT = path.join(OUT_ROOT, 'by-seat');
const OUT_LETTER = path.join(OUT_ROOT, 'by-letter');
const OUT_TOP = path.join(OUT_ROOT, 'top');
const OUT_INDEX = path.join(OUT_ROOT, 'index.json');

const BUCKET_DIGITS = 4; // 4 leading digits of seating_no → one seat shard
const LETTER_CHUNK_SIZE = 4000; // rows per name-shard chunk

// Egyptian Thanaweya Amma performance tiers (percent of 320 max).
const TIERS = [
  { key: 0, name: 'ممتاز', minPct: 90 }, // 288+
  { key: 1, name: 'جيد جدًا', minPct: 80 }, // 256+
  { key: 2, name: 'جيد', minPct: 65 }, // 208+
  { key: 3, name: 'مقبول', minPct: 50 }, // 160+
  { key: 4, name: 'ضعيف', minPct: 0 }, // <160
];

const PREFERRED_STATUS_ORDER = [
  'ناجح دور أول',
  'دور ثان',
  'راسب دور أول',
  'غياب كلى دور أول',
];

// -----------------------------------------------------------------------------
// Arabic normalization (matches src/lib/format.ts::normalizeArabic)
// -----------------------------------------------------------------------------

const AR_TATWEEL = /ـ/g;
const AR_DIACRITICS = /[ً-ٰٟ]/g;

function normalizeArabic(s) {
  return s
    .replace(AR_TATWEEL, '')
    .replace(AR_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function tierFor(degree, max) {
  const p = (degree / max) * 100;
  for (let i = 0; i < TIERS.length; i++) {
    if (p >= TIERS[i].minPct) return TIERS[i].key;
  }
  return TIERS.length - 1;
}

// -----------------------------------------------------------------------------
// Read Excel
// -----------------------------------------------------------------------------

if (!fs.existsSync(inputPath)) {
  console.error(`Excel not found at: ${inputPath}`);
  process.exit(1);
}

console.log(`Reading ${inputPath} ...`);
const wb = XLSX.readFile(inputPath, { cellDates: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
const header = raw[0];
console.log(`Rows read (incl. header): ${raw.length}`);
console.log(`Header: ${JSON.stringify(header)}`);

const cSeat = header.indexOf('seating_no');
const cName = header.indexOf('arabic_name');
const cDeg = header.indexOf('total_degree');
const cStat = header.indexOf('student_case_desc');
if (cSeat < 0 || cName < 0 || cDeg < 0 || cStat < 0) {
  console.error('Expected columns not found. Got:', header);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Pass 1: build the flat records, discover statuses and ranges
// -----------------------------------------------------------------------------

const statuses = new Map(); // status label -> tmp index
let seatingMin = Infinity;
let seatingMax = -Infinity;
let degreeMax = 0;

const records = [];
for (let i = 1; i < raw.length; i++) {
  const r = raw[i];
  const seat = Number(r[cSeat]);
  const name = String(r[cName] ?? '').trim();
  const deg = Number(r[cDeg]);
  const statusStr = String(r[cStat] ?? '').trim();
  if (!Number.isFinite(seat) || !name) continue;

  if (seat < seatingMin) seatingMin = seat;
  if (seat > seatingMax) seatingMax = seat;
  if (deg > degreeMax) degreeMax = deg;

  if (!statuses.has(statusStr)) statuses.set(statusStr, statuses.size);
  records.push({
    seat,
    name,
    deg,
    _status: statusStr,
  });
}

// Order statuses so the "success first round" is #0, then second round, etc.
const orderedStatuses = [];
for (const preferred of PREFERRED_STATUS_ORDER) {
  const found = [...statuses.keys()].find((s) => s === preferred);
  if (found) orderedStatuses.push(found);
}
for (const s of statuses.keys())
  if (!orderedStatuses.includes(s)) orderedStatuses.push(s);
const statusIdx = new Map(orderedStatuses.map((s, i) => [s, i]));
const statusCounts = orderedStatuses.map(() => 0);

console.log(`Seating: ${seatingMin} → ${seatingMax}`);
console.log(`Degree max: ${degreeMax}`);
console.log('Statuses:');
orderedStatuses.forEach((s, i) => console.log(`  ${i}: ${s}`));

// -----------------------------------------------------------------------------
// Pass 2: compute per-record derived fields
// -----------------------------------------------------------------------------

const tierCounts = TIERS.map(() => 0);
const degreeHistogram = new Array(degreeMax + 1).fill(0);

for (const rec of records) {
  rec.status = statusIdx.get(rec._status);
  statusCounts[rec.status]++;
  rec.tier = tierFor(rec.deg, degreeMax);
  tierCounts[rec.tier]++;
  degreeHistogram[rec.deg]++;

  const normFull = normalizeArabic(rec.name);
  rec.nameNorm = normFull;
  const parts = normFull.split(' ').filter(Boolean);
  rec.firstName = parts[0] ?? '';
  rec.familyName = parts[parts.length - 1] ?? '';
  rec.letter = rec.firstName.charAt(0) || '?';
  delete rec._status;
}

console.log('Tier counts:');
TIERS.forEach((t, i) => console.log(`  ${t.name}: ${tierCounts[i]}`));

// -----------------------------------------------------------------------------
// Pass 3: assign ranks
// -----------------------------------------------------------------------------

// Overall rank (1 = highest); ties broken by seating number (stable, deterministic).
const byDegreeDesc = [...records].sort((a, b) => b.deg - a.deg || a.seat - b.seat);
byDegreeDesc.forEach((r, i) => (r.rank = i + 1));

// Rank inside each status.
const perStatus = orderedStatuses.map(() => []);
for (const r of byDegreeDesc) perStatus[r.status].push(r);
for (const list of perStatus) list.forEach((r, i) => (r.rankInStatus = i + 1));

console.log('Ranks assigned.');

// -----------------------------------------------------------------------------
// Emit output
// -----------------------------------------------------------------------------

for (const dir of [OUT_SEAT, OUT_LETTER, OUT_TOP]) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
// Remove any legacy by-name dir from the earlier build.
fs.rmSync(path.join(OUT_ROOT, 'by-name'), { recursive: true, force: true });

// Per-student compact tuple (used inside every shard):
//   [seatOrOffset, name, degree, status, tier, rank, rankInStatus]
function pack(r, useOffset, base) {
  return [
    useOffset ? r.seat - base : r.seat,
    r.name,
    r.deg,
    r.status,
    r.tier,
    r.rank,
    r.rankInStatus,
  ];
}

// Seat shards (bucket = leading `BUCKET_DIGITS` digits).
const bucketDivisor = 10 ** (7 - BUCKET_DIGITS);
const seatBuckets = new Map();
for (const r of records) {
  const b = Math.floor(r.seat / bucketDivisor);
  if (!seatBuckets.has(b)) seatBuckets.set(b, []);
  seatBuckets.get(b).push(r);
}
const bucketIds = [...seatBuckets.keys()].sort((a, b) => a - b);
let seatBytes = 0;
for (const b of bucketIds) {
  const arr = seatBuckets.get(b).sort((a, x) => a.seat - x.seat);
  const base = b * bucketDivisor;
  const payload = JSON.stringify({ s: arr.map((r) => pack(r, true, base)) });
  fs.writeFileSync(path.join(OUT_SEAT, `${b}.json`), payload);
  seatBytes += payload.length;
}
console.log(`Seat shards: ${bucketIds.length} files, ~${(seatBytes / 1024 / 1024).toFixed(1)} MB.`);

// Letter shards (grouped by first Arabic letter of the *normalized* first name,
// each further chunked into pieces of LETTER_CHUNK_SIZE rows, sorted by
// degree desc so client-side filtering can early-exit on top-degree matches).
const byLetter = new Map();
for (const r of records) {
  const L = r.letter;
  if (!byLetter.has(L)) byLetter.set(L, []);
  byLetter.get(L).push(r);
}

const letterMeta = {}; // letter -> { count, chunks }
let letterBytes = 0;

// Sort keys deterministically so files are stable across builds.
const letterKeys = [...byLetter.keys()].sort();

for (const L of letterKeys) {
  const arr = byLetter.get(L).sort((a, b) => b.deg - a.deg || a.seat - b.seat);
  const chunks = Math.ceil(arr.length / LETTER_CHUNK_SIZE);
  fs.mkdirSync(path.join(OUT_LETTER, encodeURIComponent(L)), { recursive: true });
  for (let i = 0; i < chunks; i++) {
    const slice = arr.slice(i * LETTER_CHUNK_SIZE, (i + 1) * LETTER_CHUNK_SIZE);
    const payload = JSON.stringify({ s: slice.map((r) => pack(r, false, 0)) });
    fs.writeFileSync(
      path.join(OUT_LETTER, encodeURIComponent(L), `${i}.json`),
      payload,
    );
    letterBytes += payload.length;
  }
  letterMeta[L] = { count: arr.length, chunks };
}
console.log(
  `Letter shards: ${letterKeys.length} letters, ${Object.values(letterMeta).reduce(
    (a, m) => a + m.chunks,
    0,
  )} files, ~${(letterBytes / 1024 / 1024).toFixed(1)} MB.`,
);

// Top-N showcases.
const top100 = byDegreeDesc.slice(0, 100).map((r) => pack(r, false, 0));
fs.writeFileSync(path.join(OUT_TOP, 'overall-100.json'), JSON.stringify({ s: top100 }));
for (let i = 0; i < orderedStatuses.length; i++) {
  const list = perStatus[i].slice(0, 100).map((r) => pack(r, false, 0));
  fs.writeFileSync(path.join(OUT_TOP, `status-${i}-100.json`), JSON.stringify({ s: list }));
}
console.log('Top-N files written.');

// Index metadata.
const index = {
  totalRows: records.length,
  seatingMin,
  seatingMax,
  degreeMax,
  bucketDigits: BUCKET_DIGITS,
  statuses: orderedStatuses,
  statusCounts,
  tiers: TIERS.map((t, i) => ({
    key: i,
    name: t.name,
    minPct: t.minPct,
    minDegree: Math.ceil((t.minPct / 100) * degreeMax),
    count: tierCounts[i],
  })),
  degreeHistogram, // length = degreeMax + 1
  letters: letterMeta, // { letter: { count, chunks } }
  letterChunkSize: LETTER_CHUNK_SIZE,
  packed: {
    seat: ['seatOffset', 'name', 'degree', 'status', 'tier', 'rank', 'rankInStatus'],
    other: ['seat', 'name', 'degree', 'status', 'tier', 'rank', 'rankInStatus'],
  },
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2));
console.log(`Wrote ${OUT_INDEX}`);
console.log('Done.');
