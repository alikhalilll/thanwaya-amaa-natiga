import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Panel that is collapsed on mobile (open with a header button), always
 * expanded on md+ screens. Purely visual — children are always mounted so
 * their state is preserved when toggling.
 */
export default function CollapsiblePanel({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-start text-sm text-white/80 hover:bg-white/10 transition"
      >
        <span className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {hint && <span className="text-[11px] text-white/50">{hint}</span>}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {(open || typeof window === 'undefined') && (
          <motion.div
            className="md:hidden overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden md:block">{children}</div>
    </div>
  );
}
