import { motion } from 'framer-motion';
import type { DataIndex } from '../lib/types';
import { statusStyle, toArabicDigits } from '../lib/format';

export default function Stats({ index }: { index: DataIndex | null }) {
  if (!index) return null;
  const total = index.totalRows;
  const passed = index.statusCounts[0] ?? 0;
  const rate = total ? ((passed / total) * 100).toFixed(1) : '0';
  const excellent = index.tiers[0]?.count ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mx-auto max-w-3xl px-4 py-3"
    >
      {/* Compact horizontal pills on mobile, full grid on md+ */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        <StatPill label="الإجمالي" value={toArabicDigits(total.toLocaleString('en-US'))} />
        <StatPill label="نجاح دور أول" value={`${toArabicDigits(rate)}٪`} />
        <StatPill label="ممتاز" value={toArabicDigits(excellent.toLocaleString('en-US'))} />
        <StatPill
          label={statusStyle(1).label}
          value={toArabicDigits((index.statusCounts[1] ?? 0).toLocaleString('en-US'))}
        />
      </div>
      <div className="hidden md:grid grid-cols-4 gap-3">
        <StatCard
          label="إجمالي الطلاب"
          value={toArabicDigits(total.toLocaleString('en-US'))}
        />
        <StatCard
          label="نسبة نجاح الدور الأول"
          value={`${toArabicDigits(rate)}٪`}
          accent="from-emerald-400 to-emerald-600"
        />
        <StatCard
          label={`تقدير ${index.tiers[0]?.name ?? 'ممتاز'} (٩٠٪+)`}
          value={toArabicDigits(excellent.toLocaleString('en-US'))}
          accent="from-brand-400 to-brand-700"
        />
        <StatCard
          label={statusStyle(1).label}
          value={toArabicDigits((index.statusCounts[1] ?? 0).toLocaleString('en-US'))}
          accent="from-amber-400 to-orange-600"
        />
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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass shrink-0 snap-start rounded-full px-3 py-1.5 flex items-center gap-1.5">
      <span className="text-[10px] text-white/60">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  );
}
