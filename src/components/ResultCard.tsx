import { motion } from 'framer-motion';
import type { StudentRecord } from '../lib/types';
import { degreeColor, pct, statusStyle, toArabicDigits } from '../lib/format';
import CountUp from './CountUp';

export default function ResultCard({
  record,
  featured = false,
  index = 0,
  degreeMax = 320,
}: {
  record: StudentRecord;
  featured?: boolean;
  index?: number;
  degreeMax?: number;
}) {
  const status = statusStyle(record.status);
  const percent = pct(record.degree, degreeMax);
  const shareUrl = `${window.location.origin}${window.location.pathname}?seat=${record.seat}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.35 }}
      className={`glass rounded-2xl p-5 ring-1 ${status.ring} transition hover:-translate-y-0.5 hover:shadow-2xl ${
        featured ? 'shadow-2xl' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] ${status.chip}`}>
              {status.label}
            </span>
            <span className="text-[11px] sm:text-xs text-white/50">
              رقم الجلوس: {toArabicDigits(record.seat)}
            </span>
          </div>
          <h3
            className={`mt-2 font-bold text-white break-words ${
              featured ? 'text-xl sm:text-2xl md:text-3xl' : 'text-base sm:text-lg'
            }`}
            title={record.name}
          >
            {record.name}
          </h3>
        </div>

        <div className="flex-shrink-0 text-center">
          <div
            className={`bg-gradient-to-br ${degreeColor(
              record.degree,
              degreeMax,
            )} rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-white shadow-lg`}
          >
            <div
              className={`font-black leading-none ${
                featured ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
              }`}
            >
              {featured ? (
                <CountUp to={record.degree} />
              ) : (
                toArabicDigits(record.degree)
              )}
            </div>
            <div className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-wider opacity-90">
              من {toArabicDigits(degreeMax)}
            </div>
          </div>
          <div className="mt-1 text-[11px] sm:text-xs text-white/60">
            {toArabicDigits(percent.toFixed(1))}٪
          </div>
        </div>
      </div>

      {featured && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl);
            }}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 active:bg-white/15 transition"
          >
            نسخ رابط النتيجة
          </button>
          <a
            href={shareUrl}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 active:bg-white/15 transition"
            target="_blank"
            rel="noreferrer"
          >
            فتح في تبويب جديد
          </a>
        </div>
      )}
    </motion.article>
  );
}
