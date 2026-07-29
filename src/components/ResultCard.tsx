import { motion } from 'framer-motion';
import type { StudentRecord } from '../lib/types';
import { pct, statusStyle, tierStyle, toArabicDigits } from '../lib/format';
import CountUp from './CountUp';
import CopyButton from './CopyButton';

export default function ResultCard({
  record,
  featured = false,
  index = 0,
  degreeMax = 320,
  tierName,
  compact = false,
  onOpen,
}: {
  record: StudentRecord;
  featured?: boolean;
  index?: number;
  degreeMax?: number;
  tierName?: string;
  compact?: boolean;
  onOpen?: (r: StudentRecord) => void;
}) {
  const status = statusStyle(record.status);
  const tier = tierStyle(record.tier);
  const percent = pct(record.degree, degreeMax);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.35), duration: 0.3 }}
      whileHover={onOpen ? { y: -2 } : undefined}
      className={`glass rounded-2xl p-4 sm:p-5 ring-1 ${tier.ring} transition ${
        featured ? 'shadow-2xl' : ''
      } ${onOpen ? 'cursor-pointer' : ''}`}
      onClick={() => onOpen?.(record)}
      role={onOpen ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] ${status.chip}`}>
              {status.label}
            </span>
            {tierName && (
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] ${tier.chip}`}>
                {tierName}
              </span>
            )}
            <CopyButton seat={record.seat} variant="chip" />
          </div>
          <h3
            className={`mt-2 font-bold text-white break-words ${
              featured ? 'text-xl sm:text-2xl md:text-3xl' : compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
            }`}
            title={record.name}
          >
            {record.name}
          </h3>
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/60">
              <span>
                الترتيب العام:{' '}
                <span className="font-bold text-white/90">
                  #{toArabicDigits(record.rank.toLocaleString('en-US'))}
                </span>
              </span>
              <span>
                داخل الحالة:{' '}
                <span className="font-bold text-white/90">
                  #{toArabicDigits(record.rankInStatus.toLocaleString('en-US'))}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-center">
          <div
            className={`bg-gradient-to-br ${tier.gradient} rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-white shadow-lg`}
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
    </motion.article>
  );
}
