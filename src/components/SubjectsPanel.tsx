import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchStudentSubjects, isProxyConfigured, type StudentSubjects } from '../lib/subjectsClient';
import { toArabicDigits } from '../lib/format';

/**
 * Shown on the student detail page. Fetches subject / school / district for
 * the seat on demand via the configured proxy worker. If the proxy isn't
 * configured (VITE_PROXY_URL empty) the panel is silent — the ExternalPortals
 * component still handles the outbound flow.
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
          <span className="text-[10px] text-white/40">
            المصدر: {data.source}
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-3 text-center text-xs text-white/60">
          جاري تحميل درجات المواد...
        </div>
      )}

      {error && !loading && (
        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
          تعذّر تحميل درجات المواد الآن — استخدم روابط البوابات الرسمية أدناه.
          <div className="mt-1 text-[10px] opacity-70">{error}</div>
        </div>
      )}

      {data && !loading && !error && (
        <div className="mt-3 space-y-3">
          {(data.school || data.district || data.section) && (
            <div className="grid gap-2 sm:grid-cols-3">
              {data.school && <InfoTile label="المدرسة" value={data.school} />}
              {data.district && <InfoTile label="الإدارة" value={data.district} />}
              {data.section && <InfoTile label="الشعبة" value={data.section} />}
            </div>
          )}

          {data.subjects.length > 0 ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {data.subjects.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-xs sm:text-sm text-white/85 truncate">{s.name}</span>
                  <span className="text-sm font-bold text-white shrink-0">
                    {toArabicDigits(s.score)}
                    {s.max != null && (
                      <span className="text-[10px] text-white/50">
                        /{toArabicDigits(s.max)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
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
