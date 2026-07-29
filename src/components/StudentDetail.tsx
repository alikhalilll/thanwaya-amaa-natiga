import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { DataIndex, StudentRecord } from '../lib/types';
import {
  degreeColor,
  pct,
  statusStyle,
  tierStyle,
  toArabicDigits,
} from '../lib/format';
import CountUp from './CountUp';
import { getBySeating, getSimilarInTier } from '../lib/dataClient';

export default function StudentDetail({
  seat,
  index,
  onBack,
}: {
  seat: number;
  index: DataIndex | null;
  onBack: () => void;
}) {
  const [record, setRecord] = useState<StudentRecord | null>(null);
  const [similar, setSimilar] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRecord(null);
    setSimilar([]);
    getBySeating(seat)
      .then(async (r) => {
        if (cancelled) return;
        if (!r) {
          setError(`لم يتم العثور على طالب برقم الجلوس ${toArabicDigits(seat)}`);
          return;
        }
        setRecord(r);
        try {
          const peers = await getSimilarInTier(r, 6);
          if (!cancelled) setSimilar(peers);
        } catch {
          /* peers are decorative */
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seat]);

  const degreeMax = index?.degreeMax ?? 320;
  const totalRows = index?.totalRows ?? 0;
  const tierName = record ? index?.tiers[record.tier]?.name : undefined;

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
      <button
        onClick={onBack}
        className="mb-3 sm:mb-4 inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
      >
        <span aria-hidden>›</span> رجوع للبحث
      </button>

      {loading && (
        <div className="glass rounded-2xl p-6 text-center text-white/60">
          جاري تحميل بيانات الطالب...
        </div>
      )}

      {error && !loading && (
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-4xl">🔎</div>
          <h2 className="mt-2 font-bold text-white">لا توجد نتيجة</h2>
          <p className="mt-1 text-sm text-white/60">{error}</p>
        </div>
      )}

      <AnimatePresence>
        {record && !loading && (
          <StudentBody
            record={record}
            degreeMax={degreeMax}
            totalRows={totalRows}
            tierName={tierName}
            statusLabel={index?.statuses[record.status] ?? ''}
            similar={similar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StudentBody({
  record,
  degreeMax,
  totalRows,
  tierName,
  statusLabel,
  similar,
}: {
  record: StudentRecord;
  degreeMax: number;
  totalRows: number;
  tierName?: string;
  statusLabel: string;
  similar: StudentRecord[];
}) {
  const percent = pct(record.degree, degreeMax);
  const status = statusStyle(record.status);
  const tier = tierStyle(record.tier);
  const percentile =
    totalRows > 0
      ? ((totalRows - record.rank) / totalRows) * 100
      : 0;
  const shareUrl = `${window.location.origin}${window.location.pathname}#/s/${record.seat}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      <div className={`glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 ring-1 ${tier.ring}`}>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] ${status.chip}`}>
            {statusLabel || status.label}
          </span>
          {tierName && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] ${tier.chip}`}>
              التقدير: {tierName}
            </span>
          )}
          <span className="text-[11px] sm:text-xs text-white/50">
            رقم الجلوس: {toArabicDigits(record.seat)}
          </span>
        </div>

        <h1 className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-4xl font-black text-white break-words leading-tight">
          {record.name}
        </h1>

        <div className="mt-4 sm:mt-5 flex flex-col items-stretch gap-4 sm:gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={`w-full sm:w-auto rounded-2xl bg-gradient-to-br ${degreeColor(
              record.degree,
              degreeMax,
            )} px-5 py-4 sm:px-6 sm:py-5 text-white shadow-2xl text-center`}
          >
            <div className="text-4xl sm:text-6xl font-black leading-none">
              <CountUp to={record.degree} />
            </div>
            <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-wider opacity-90">
              من {toArabicDigits(degreeMax)}
            </div>
            <div className="mt-1 text-xs sm:text-sm font-bold">
              {toArabicDigits(percent.toFixed(1))}٪
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
            <MetricCard
              label="الترتيب العام"
              value={`#${toArabicDigits(record.rank.toLocaleString('en-US'))}`}
            />
            <MetricCard
              label="داخل الحالة"
              value={`#${toArabicDigits(record.rankInStatus.toLocaleString('en-US'))}`}
            />
            <MetricCard
              label="أعلى من"
              value={`${toArabicDigits(percentile.toFixed(1))}٪`}
            />
          </div>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `نتيجة الطالب ${record.name}`,
                  text: `${record.name} — ${toArabicDigits(record.degree)}/${toArabicDigits(degreeMax)} (${toArabicDigits(percent.toFixed(1))}٪)`,
                  url: shareUrl,
                });
              } else {
                navigator.clipboard?.writeText(shareUrl);
              }
            }}
            className="rounded-lg bg-brand-500/20 border border-brand-400/40 px-2.5 py-2 text-[11px] sm:text-xs text-brand-100 hover:bg-brand-500/30 transition"
          >
            مشاركة
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="rounded-lg bg-white/5 px-2.5 py-2 text-[11px] sm:text-xs text-white/80 hover:bg-white/10 transition"
          >
            نسخ الرابط
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-white/5 px-2.5 py-2 text-[11px] sm:text-xs text-white/80 hover:bg-white/10 transition"
          >
            طباعة
          </button>
        </div>
      </div>

      {similar.length > 0 && (
        <div className="glass rounded-2xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm text-white/70">طلاب بأداء قريب</h3>
          <div className="mt-2 grid gap-2">
            {similar.map((s) => (
              <a
                key={s.seat}
                href={`#/s/${s.seat}`}
                className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5 sm:p-3 hover:bg-white/10 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs sm:text-sm text-white">{s.name}</div>
                  <div className="text-[10px] sm:text-[11px] text-white/50">
                    {toArabicDigits(s.seat)} · #{toArabicDigits(s.rank.toLocaleString('en-US'))}
                  </div>
                </div>
                <div className="rounded-lg bg-white/10 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white">
                  {toArabicDigits(s.degree)}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-2 sm:px-3 py-2 text-center min-w-0">
      <div className="text-[9px] sm:text-[10px] text-white/50 leading-tight truncate">{label}</div>
      <div className="mt-0.5 text-xs sm:text-base font-bold text-white truncate">{value}</div>
    </div>
  );
}
