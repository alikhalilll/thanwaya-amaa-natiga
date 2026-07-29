import { AnimatePresence, motion } from 'framer-motion';
import type { StudentRecord } from '../lib/types';
import ResultCard from './ResultCard';
import { toArabicDigits } from '../lib/format';

export default function ResultsList({
  results,
  truncated,
  degreeMax,
}: {
  results: StudentRecord[];
  truncated: boolean;
  degreeMax: number;
}) {
  if (results.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between text-sm text-white/70">
        <span>
          عُثر على{' '}
          <span className="font-bold text-white">
            {toArabicDigits(results.length)}
          </span>{' '}
          نتيجة
          {truncated && ' (عرض مقتصر — حاول تدقيق البحث)'}
        </span>
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
              <ResultCard record={r} index={i} degreeMax={degreeMax} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
