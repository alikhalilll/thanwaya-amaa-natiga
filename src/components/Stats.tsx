import { motion } from 'framer-motion';
import type { DataIndex } from '../lib/types';
import { statusStyle, toArabicDigits } from '../lib/format';

export default function Stats({ index }: { index: DataIndex | null }) {
  if (!index) return null;
  const total = index.totalRows;
  const passed = index.statusCounts[0] ?? 0;
  const rate = total ? ((passed / total) * 100).toFixed(1) : '0';

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="mx-auto max-w-3xl px-4 py-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          label="إجمالي الطلاب"
          value={toArabicDigits(total.toLocaleString('en-US'))}
        />
        <StatCard
          label="نسبة نجاح الدور الأول"
          value={`${toArabicDigits(rate)}٪`}
          accent="from-emerald-400 to-emerald-600"
        />
        {index.statusCounts.slice(1, 3).map((c, i) => {
          const status = statusStyle(i + 1);
          return (
            <StatCard
              key={i}
              label={status.label}
              value={toArabicDigits(c.toLocaleString('en-US'))}
              accent="from-brand-400 to-brand-700"
            />
          );
        })}
      </div>
    </motion.section>
  );
}

function StatCard({
  label,
  value,
  accent = 'from-brand-400 to-brand-700',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-3 sm:p-4">
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-6 -end-6 h-16 w-16 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-xl`}
      />
      <div className="text-[11px] sm:text-xs text-white/60 leading-snug">{label}</div>
      <div className="mt-1 text-lg sm:text-2xl font-black text-white">{value}</div>
    </div>
  );
}
