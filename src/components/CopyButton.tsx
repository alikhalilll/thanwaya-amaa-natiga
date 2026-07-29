import { motion } from 'framer-motion';
import { useState } from 'react';
import { toArabicDigits } from '../lib/format';

/**
 * Prominent "copy seating number" pill. Used from the detail header and the
 * result cards so a user can grab the seat with one tap before opening any
 * of the official portals for subject-level detail.
 */
export default function CopyButton({
  seat,
  variant = 'chip',
  onCopied,
}: {
  seat: number;
  variant?: 'chip' | 'block';
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(String(seat));
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked (older browsers / non-secure context) */
    }
  };

  if (variant === 'chip') {
    return (
      <motion.button
        onClick={handle}
        whileTap={{ scale: 0.94 }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] transition ${
          copied
            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
            : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
        }`}
        aria-label="نسخ رقم الجلوس"
      >
        {copied ? (
          <>
            <span aria-hidden>✓</span>
            <span>تم النسخ</span>
          </>
        ) : (
          <>
            <span aria-hidden>⧉</span>
            <span>{toArabicDigits(seat)}</span>
          </>
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handle}
      whileTap={{ scale: 0.98 }}
      className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition flex items-center justify-between gap-3 ${
        copied
          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
          : 'border-brand-400/40 bg-brand-500/20 text-brand-100 hover:bg-brand-500/30'
      }`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden>⧉</span>
        <span>{copied ? 'تم نسخ رقم الجلوس' : 'نسخ رقم الجلوس'}</span>
      </span>
      <span className={`rounded-lg px-2.5 py-1 text-sm font-black ${copied ? 'bg-emerald-500/30' : 'bg-white/10'}`}>
        {toArabicDigits(seat)}
      </span>
    </motion.button>
  );
}
