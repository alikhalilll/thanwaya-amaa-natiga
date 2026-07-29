import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { DataIndex, StudentRecord } from '../lib/types';
import ResultCard from './ResultCard';
import { toArabicDigits } from '../lib/format';

const PAGE_SIZE = 50;

export default function ResultsList({
  results,
  totalMatches,
  index,
  onOpen,
}: {
  results: StudentRecord[];
  totalMatches: number;
  index: DataIndex | null;
  onOpen: (r: StudentRecord) => void;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the visible window whenever the underlying result set changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [results]);

  // Auto-load more as the user scrolls near the bottom.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible((v) => Math.min(v + PAGE_SIZE, results.length));
          }
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [results.length]);

  if (results.length === 0) return null;
  const degreeMax = index?.degreeMax ?? 320;
  const shown = results.slice(0, visible);
  const remaining = results.length - shown.length;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 text-sm text-white/70">
        عُثر على{' '}
        <span className="font-bold text-white">
          {toArabicDigits(totalMatches.toLocaleString('en-US'))}
        </span>{' '}
        نتيجة
        {remaining > 0 && (
          <span className="ms-1 text-white/50">
            (عارض {toArabicDigits(shown.length.toLocaleString('en-US'))})
          </span>
        )}
      </div>
      <div className="grid gap-3">
        <AnimatePresence>
          {shown.map((r, i) => (
            <motion.div
              key={r.seat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '120px' }}
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
      {remaining > 0 && (
        <div ref={sentinelRef} className="mt-4 flex justify-center">
          <button
            onClick={() =>
              setVisible((v) => Math.min(v + PAGE_SIZE, results.length))
            }
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
          >
            عرض المزيد ({toArabicDigits(remaining.toLocaleString('en-US'))} متبقي)
          </button>
        </div>
      )}
    </section>
  );
}
