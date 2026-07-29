import { motion } from 'framer-motion';
import { useState } from 'react';
import { toArabicDigits } from '../lib/format';

/**
 * The public Thanaweya Amma results portals in Egypt only expose per-subject
 * scores through a server-rendered form (no clean query-string API). To make
 * the hop feel one-click, we copy the seat to the clipboard, then open the
 * portal in a new tab; the user pastes and hits "استعلم".
 */
type Portal = {
  name: string;
  url: string;
};

const PORTALS: Portal[] = [
  { name: 'اليوم السابع', url: 'https://natega.youm7.com/' },
  { name: 'صدى البلد', url: 'https://natega.elbalad.news/Registration' },
  { name: 'الوطن', url: 'https://natega.elwatannews.com/' },
  { name: 'الجمهورية', url: 'https://natega.gomhuriaonline.com/' },
];

export default function ExternalPortals({ seat }: { seat: number }) {
  const [justCopied, setJustCopied] = useState<string | null>(null);

  const openPortal = async (p: Portal) => {
    try {
      await navigator.clipboard?.writeText(String(seat));
      setJustCopied(p.name);
      setTimeout(() => setJustCopied((n) => (n === p.name ? null : n)), 3000);
    } catch {
      /* clipboard may fail in some browsers, still open the tab */
    }
    window.open(p.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35 }}
      className="glass rounded-2xl p-3 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs sm:text-sm text-white/70">
            📖 درجات المواد التفصيلية
          </h3>
          <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
            بيانات المواد (كيمياء، فيزياء، رياضة...) والمدرسة والإدارة التعليمية تُعرض على البوابات الرسمية.
            اضغط أي بوابة أدناه — سيُنسخ رقم الجلوس تلقائيًا ثم يُفتح الموقع، الصق الرقم واضغط "استعلم".
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {PORTALS.map((p) => (
          <button
            key={p.name}
            onClick={() => openPortal(p)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-start hover:bg-white/10 active:bg-white/15 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">{p.name}</span>
              <span className="text-[10px] text-white/40" aria-hidden>
                ↗
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-white/50">
              {justCopied === p.name ? '✓ تم نسخ رقم الجلوس' : 'اضغط لفتح البوابة'}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
        <span>رقم الجلوس المُعتمد للنسخ:</span>
        <code className="rounded bg-white/5 px-2 py-0.5 text-white/70">
          {toArabicDigits(seat)}
        </code>
      </div>
    </motion.div>
  );
}
