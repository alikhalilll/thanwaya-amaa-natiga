import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { DataIndex, StudentRecord } from '../lib/types';
import { getTopOverall } from '../lib/dataClient';
import ResultCard from './ResultCard';

export default function TopScorers({
  index,
  onOpen,
}: {
  index: DataIndex | null;
  onOpen: (r: StudentRecord) => void;
}) {
  const [rows, setRows] = useState<StudentRecord[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTopOverall().then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const degreeMax = index?.degreeMax ?? 320;
  const shown = expanded ? rows : rows.slice(0, 10);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mx-auto max-w-3xl px-4 py-4"
    >
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-white/70">🏆 أعلى ١٠٠ طالب</h3>
          {rows.length > 10 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition"
            >
              {expanded ? 'إخفاء' : 'عرض الكل'}
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          {shown.map((r, i) => (
            <ResultCard
              key={r.seat}
              record={r}
              index={i}
              degreeMax={degreeMax}
              tierName={index?.tiers[r.tier]?.name}
              compact
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
