import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchStudentSubjects, isProxyConfigured, type StudentSubjects } from '../lib/subjectsClient';
import { toArabicDigits } from '../lib/format';

/**
 * On-demand panel that fetches subjects/section/status for the currently
 * viewed student from the configured proxy (VITE_PROXY_URL). Silent if the
 * proxy isn't configured — the outbound-portals panel still works.
 */
export default function SubjectsPanel({ seat }: { seat: number }) {
  const [data, setData] = useState<StudentSubjects | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isProxyConfigured()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetchStudentSubjects(seat)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seat]);

  if (!isProxyConfigured()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="glass rounded-2xl p-3 sm:p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm text-white/70">📚 درجات المواد التفصيلية</h3>
        {data?.source && (
          <span className="text-[10px] text-white/40">المصدر: {data.source}</span>
        )}
      </div>

      {loading && (
        <div className="mt-3 text-center text-xs text-white/60">
          جاري تحميل درجات المواد...
        </div>
      )}

      {error && !loading && (
        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
          تعذّر تحميل درجات المواد الآن — جرّب البوابات الرسمية بالأسفل.
          <div className="mt-1 text-[10px] opacity-70">{error}</div>
        </div>
      )}

      {data && !loading && !error && (
        <div className="mt-3 space-y-3">
          {(data.section || data.status || data.education) && (
            <div className="grid gap-2 sm:grid-cols-3">
              {data.section && <InfoTile label="الشعبة" value={data.section} />}
              {data.status && <InfoTile label="الحالة" value={data.status} />}
              {data.education && <InfoTile label="نوعية التعليم" value={data.education} />}
            </div>
          )}

          {data.subjects.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-[1fr,auto,auto] gap-3 border-b border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/50">
                <span>المادة</span>
                <span>الدرجة</span>
                <span>النسبة</span>
              </div>
              <div className="divide-y divide-white/5">
                {data.subjects.map((s, i) => (
                  <SubjectRow key={i} s={s} />
                ))}
              </div>
              {(data.total != null || data.percentTotal != null) && (
                <div className="grid grid-cols-[1fr,auto,auto] gap-3 border-t border-white/10 bg-white/10 px-3 py-2.5 text-xs">
                  <span className="text-white/70 font-semibold">المجموع الكلي</span>
                  <span className="font-bold text-white">
                    {data.total != null ? toArabicDigits(data.total) : '—'}
                    {data.totalMax != null && (
                      <span className="text-[10px] text-white/50">
                        /{toArabicDigits(data.totalMax)}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-brand-100">
                    {data.percentTotal != null ? `${toArabicDigits(data.percentTotal)}٪` : '—'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              لم يتم استخراج درجات المواد من البوابة. جرّب البوابات الرسمية بالأسفل.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SubjectRow({ s }: { s: { name: string; score: number | null; max: number | null; percent: number | null; offered: boolean } }) {
  return (
    <div className="grid grid-cols-[1fr,auto,auto] items-center gap-3 px-3 py-2 text-xs sm:text-sm">
      <span className={`truncate ${s.offered ? 'text-white/90' : 'text-white/40'}`}>
        {s.name}
      </span>
      <span className="font-bold text-white shrink-0">
        {s.offered && s.score != null ? toArabicDigits(s.score) : (
          <span className="text-[10px] text-white/40">غير مقرر</span>
        )}
        {s.max != null && (
          <span className="ms-0.5 text-[10px] text-white/50">
            /{toArabicDigits(s.max)}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 text-[11px] font-semibold ${
          s.percent == null
            ? 'text-white/30'
            : s.percent >= 85
            ? 'text-emerald-300'
            : s.percent >= 65
            ? 'text-sky-300'
            : s.percent >= 50
            ? 'text-amber-300'
            : 'text-rose-300'
        }`}
      >
        {s.percent != null ? `${toArabicDigits(s.percent)}٪` : '—'}
      </span>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] text-white/50">{label}</div>
      <div
        className="mt-0.5 text-xs sm:text-sm font-semibold text-white truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
