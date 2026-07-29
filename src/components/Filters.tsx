import { motion } from 'framer-motion';
import { useResultsStore } from '../store/useResultsStore';
import type { DataIndex } from '../lib/types';
import { statusStyle, toArabicDigits } from '../lib/format';

export default function Filters({ index }: { index: DataIndex | null }) {
  const activeStatuses = useResultsStore((s) => s.activeStatuses);
  const toggleStatus = useResultsStore((s) => s.toggleStatus);
  const minDegree = useResultsStore((s) => s.minDegree);
  const maxDegree = useResultsStore((s) => s.maxDegree);
  const setDegreeRange = useResultsStore((s) => s.setDegreeRange);
  const resetFilters = useResultsStore((s) => s.resetFilters);

  if (!index) return null;
  const degreeMax = index.degreeMax || 320;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="mx-auto max-w-3xl px-4 py-4"
    >
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm text-white/70">الفلترة</h3>
          <button
            onClick={resetFilters}
            className="rounded-lg bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition"
          >
            إعادة تعيين
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {index.statuses.map((_s, i) => {
            const style = statusStyle(i);
            const active = activeStatuses.has(i);
            const count = index.statusCounts[i] ?? 0;
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleStatus(i)}
                className={`rounded-full border px-3 py-2 text-xs sm:text-sm min-h-[36px] transition ${
                  active
                    ? `${style.chip} ring-2 ${style.ring}`
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {style.label}
                <span className="ms-2 text-[10px] opacity-70">
                  {toArabicDigits(count.toLocaleString('en-US'))}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <RangeControl
            label="من"
            value={minDegree}
            min={0}
            max={degreeMax}
            onChange={(v) => setDegreeRange(Math.min(v, maxDegree), maxDegree)}
          />
          <RangeControl
            label="إلى"
            value={maxDegree}
            min={0}
            max={degreeMax}
            onChange={(v) => setDegreeRange(minDegree, Math.max(v, minDegree))}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-white/60">
          <span>الدرجة</span>
          <span>
            {toArabicDigits(minDegree)} — {toArabicDigits(maxDegree)} / {toArabicDigits(degreeMax)}
          </span>
        </div>
      </div>
    </motion.section>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-[11px] text-white/50">
        <span>{label}</span>
        <span>{toArabicDigits(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-brand-400"
      />
    </label>
  );
}
