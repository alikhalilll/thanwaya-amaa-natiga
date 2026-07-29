#!/usr/bin/env node
/**
 * Reads the Thanaweya Amma Excel file and emits sharded static JSON under
 * `public/data/` for the site to consume.
 *
 * Usage:
 *   node scripts/build-data.mjs [pathToXlsx]
 * Default input: ~/Downloads/يرو500.xlsx
 */
import xlsxPkg from 'xlsx';
const XLSX = xlsxPkg;
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const DEFAULT_XLSX = path.join(HOME, 'Downloads', 'يرو500.xlsx');
const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_XLSX;

const OUT_ROOT = path.resolve('public', 'data');
const OUT_SEAT = path.join(OUT_ROOT, 'by-seat');
const OUT_NAME = path.join(OUT_ROOT, 'by-name');
const OUT_INDEX = path.join(OUT_ROOT, 'index.json');

const BUCKET_DIGITS = 4;
const NAME_SHARD_SIZE = 5000;

if (!fs.existsSync(inputPath)) {
  console.error(`Excel not found at: ${inputPath}`);
  process.exit(1);
}

console.log(`Reading ${inputPath} ...`);
const wb = XLSX.readFile(inputPath, { cellDates: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

console.log(`Total rows (incl. header): ${rows.length}`);
const header = rows[0];
console.log(`Header: ${JSON.stringify(header)}`);

const idxSeat = header.indexOf('seating_no');
const idxName = header.indexOf('arabic_name');
const idxDeg = header.indexOf('total_degree');
const idxStatus = header.indexOf('student_case_desc');
if (idxSeat < 0 || idxName < 0 || idxDeg < 0 || idxStatus < 0) {
  console.error('Expected columns not found. Got:', header);
  process.exit(1);
}

// Pass 1: gather statuses + ranges.
const statusList = [];
const statusIdx = new Map();
let seatingMin = Infinity;
let seatingMax = -Infinity;
let degreeMax = 0;
const statusCounts = [];

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const seat = Number(r[idxSeat]);
  const name = String(r[idxName] ?? '').trim();
  const deg = Number(r[idxDeg]);
  const status = String(r[idxStatus] ?? '').trim();
  if (!Number.isFinite(seat) || !name) continue;

  if (seat < seatingMin) seatingMin = seat;
  if (seat > seatingMax) seatingMax = seat;
  if (deg > degreeMax) degreeMax = deg;

  if (!statusIdx.has(status)) {
    statusIdx.set(status, statusList.length);
    statusList.push(status);
    statusCounts.push(0);
  }
  statusCounts[statusIdx.get(status)]++;
}

console.log(`Seating range: ${seatingMin} - ${seatingMax}`);
console.log(`Degree max: ${degreeMax}`);
console.log('Statuses:');
statusList.forEach((s, i) => console.log(`  ${i}: ${s} (${statusCounts[i]})`));

// Ordering: put "ناجح دور أول" first if present.
const preferredOrder = [
  'ناجح دور أول',
  'دور ثان',
  'راسب دور أول',
  'غياب كلى دور أول',
];
const trimStatus = (s) => s.trim();
const orderMap = new Map();
for (const key of preferredOrder) {
  const found = statusList.find((s) => trimStatus(s) === trimStatus(key));
  if (found) orderMap.set(found, orderMap.size);
}
for (const s of statusList) if (!orderMap.has(s)) orderMap.set(s, orderMap.size);

const finalStatuses = [...orderMap.keys()];
const finalStatusIdx = new Map(finalStatuses.map((s, i) => [s, i]));
const finalStatusCounts = finalStatuses.map((s) => statusCounts[statusIdx.get(s)]);

// Reset output dirs.
console.log('Preparing output dirs ...');
fs.rmSync(OUT_SEAT, { recursive: true, force: true });
fs.rmSync(OUT_NAME, { recursive: true, force: true });
fs.mkdirSync(OUT_SEAT, { recursive: true });
fs.mkdirSync(OUT_NAME, { recursive: true });

// Pass 2: group into buckets by seat prefix and emit shards.
const bucketDivisor = 10 ** (7 - BUCKET_DIGITS);
const buckets = new Map(); // bucket -> Array<[offset, name, deg, statusIdx]>
const flat = []; // for by-name shards: [seat, name, deg, statusIdx]
let ok = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const seat = Number(r[idxSeat]);
  const name = String(r[idxName] ?? '').trim();
  const deg = Number(r[idxDeg]);
  const status = String(r[idxStatus] ?? '').trim();
  if (!Number.isFinite(seat) || !name) continue;

  const sIdx = finalStatusIdx.get(status);
  const bucket = Math.floor(seat / bucketDivisor);
  const offset = seat - bucket * bucketDivisor;

  if (!buckets.has(bucket)) buckets.set(bucket, []);
  buckets.get(bucket).push([offset, name, deg, sIdx]);

  flat.push([seat, name, deg, sIdx]);
  ok++;
}

console.log(`Ingested ${ok} rows into ${buckets.size} seat buckets.`);

const bucketIds = [...buckets.keys()].sort((a, b) => a - b);
let totalSeatBytes = 0;
for (const bId of bucketIds) {
  const arr = buckets.get(bId).sort((a, b) => a[0] - b[0]);
  const payload = JSON.stringify({ s: arr });
  const dest = path.join(OUT_SEAT, `${bId}.json`);
  fs.writeFileSync(dest, payload);
  totalSeatBytes += payload.length;
}
console.log(
  `Wrote ${bucketIds.length} seat shards, ~${(totalSeatBytes / 1024 / 1024).toFixed(1)} MB total.`,
);

// Emit name shards (fixed-size chunks of the flat list).
let totalNameBytes = 0;
let nameShardCount = 0;
for (let i = 0; i < flat.length; i += NAME_SHARD_SIZE) {
  const slice = flat.slice(i, i + NAME_SHARD_SIZE);
  const payload = JSON.stringify({ s: slice });
  const dest = path.join(OUT_NAME, `${nameShardCount}.json`);
  fs.writeFileSync(dest, payload);
  totalNameBytes += payload.length;
  nameShardCount++;
}
console.log(
  `Wrote ${nameShardCount} name shards, ~${(totalNameBytes / 1024 / 1024).toFixed(1)} MB total.`,
);

const index = {
  totalRows: ok,
  seatingMin,
  seatingMax,
  degreeMax,
  bucketDigits: BUCKET_DIGITS,
  statuses: finalStatuses,
  statusCounts: finalStatusCounts,
  buckets: bucketIds,
  nameShardCount,
  nameShardSize: NAME_SHARD_SIZE,
  builtAt: new Date().toISOString(),
};

fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2));
console.log(`Wrote index.json (${finalStatuses.length} statuses).`);
console.log('Done.');
