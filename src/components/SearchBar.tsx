import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useResultsStore } from '../store/useResultsStore';
import { fromArabicDigits } from '../lib/format';

const DIGITS_ONLY = /^[0-9]+$/;

export default function SearchBar() {
  const query = useResultsStore((s) => s.query);
  const setQuery = useResultsStore((s) => s.setQuery);
  const loading = useResultsStore((s) => s.loading);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className="mx-auto max-w-2xl px-4"
    >
      <div className="glass relative rounded-2xl p-2 shadow-2xl ring-1 ring-brand-400/10 focus-within:ring-brand-400/50 transition">
        <div className="flex items-center gap-2">
          <div className="ps-4 text-brand-200/70" aria-hidden>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            inputMode="search"
            placeholder="اكتب رقم الجلوس أو الاسم..."
            className="w-full min-w-0 bg-transparent px-2 py-3 sm:py-4 text-base sm:text-lg text-white placeholder:text-white/40 focus:outline-none"
            value={query}
            onChange={(e) => setQuery(fromArabicDigits(e.target.value))}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="me-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xl text-white/70 hover:bg-white/10 transition"
              aria-label="مسح"
            >
              ×
            </button>
          )}
        </div>
        {loading && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-x-2 bottom-1 h-0.5 origin-right rounded-full bg-gradient-to-r from-brand-400 via-white to-brand-400 animate-shine bg-[length:200%_100%]"
          />
        )}
      </div>
      <p className="mt-2 text-center text-xs text-white/50">
        {DIGITS_ONLY.test(query.trim())
          ? query.trim().length === 7
            ? 'جاري فتح النتيجة...'
            : `أكمل رقم الجلوس (٧ أرقام) — تم كتابة ${query.trim().length}`
          : query.trim().length > 0
          ? 'بحث بالاسم — يمكنك كتابة أكثر من كلمة'
          : 'اكتب اسمًا أو رقم جلوس (بين ٢٠٠١٩٧٠ و ٢٩٩٣٨٦٢)'}
      </p>
    </motion.div>
  );
}
