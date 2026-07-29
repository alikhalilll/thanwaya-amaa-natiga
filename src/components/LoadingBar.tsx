import { motion } from 'framer-motion';
import { toArabicDigits } from '../lib/format';

export default function LoadingBar({
  loaded,
  total,
}: {
  loaded: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>جاري البحث في قاعدة البيانات...</span>
          <span>{toArabicDigits(pct)}٪</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-700"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}
