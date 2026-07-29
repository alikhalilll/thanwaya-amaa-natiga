import { motion } from 'framer-motion';
import { toArabicDigits } from '../lib/format';
import type { DataIndex } from '../lib/types';

export default function Hero({ index }: { index: DataIndex | null }) {
  const total = index ? toArabicDigits(index.totalRows.toLocaleString('en-US')) : '...';

  return (
    <header className="relative overflow-hidden pt-10 sm:pt-16 pb-6 sm:pb-10 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <div className="absolute top-10 right-1/4 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl animate-float" />
        <div className="absolute -bottom-16 left-1/3 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mx-auto max-w-3xl px-4"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-brand-100">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          نتيجة الدور الأول - ٢٠٢٦
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl font-black leading-tight shine-text animate-shine">
          نتيجة الثانوية العامة
        </h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-brand-100/80">
          ابحث برقم الجلوس أو الاسم من بين{' '}
          <span className="font-bold text-white">{total}</span> نتيجة، مع فلترة سريعة حسب
          الحالة والدرجة.
        </p>
      </motion.div>
    </header>
  );
}
