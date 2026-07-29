import { AnimatePresence, motion } from 'framer-motion';
import type { DataIndex, StudentRecord } from '../lib/types';
import ResultCard from './ResultCard';
import { toArabicDigits } from '../lib/format';

export default function ResultsList({
  results,
  totalMatches,
  truncated,
  index,
  onOpen,
}: {
  results: StudentRecord[];
  totalMatches: number;
  truncated: boolean;
  index: DataIndex | null;
  onOpen: (r: StudentRecord) => void;
}) {
  if (results.length === 0) return null;
  const degreeMax = index?.degreeMax ?? 320;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 text-sm text-white/70">
        عُثر على{' '}
        <span className="font-bold text-white">
          {toArabicDigits(totalMatches.toLocaleString('en-US'))}
        </span>{' '}
        نتيجة
        {truncated && (
          <span className="ms-1 text-white/50">
            (عرض أول {toArabicDigits(results.length)} — يمكنك تدقيق البحث)
          </span>
        )}
      </div>
      <div className="grid gap-3">
        <AnimatePresence>
          {results.map((r, i) => (
            <motion.div
              key={r.seat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ResultCard
                record={r}
                index={i}
                degreeMax={degreeMax}
                tierName={index?.tiers[r.tier]?.name}
                onOpen={onOpen}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
