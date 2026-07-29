import { motion } from 'framer-motion';

export default function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="glass mx-auto my-6 max-w-lg rounded-2xl p-8 text-center"
    >
      <div className="text-4xl">🔎</div>
      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
      {hint && <p className="mt-1 text-sm text-white/60">{hint}</p>}
    </motion.div>
  );
}
