import { useEffect, useRef, useState } from 'react';
import Hero from './components/Hero';
import SearchBar from './components/SearchBar';
import Filters from './components/Filters';
import ResultsList from './components/ResultsList';
import Stats from './components/Stats';
import EmptyState from './components/EmptyState';
import LoadingBar from './components/LoadingBar';
import StudentDetail from './components/StudentDetail';
import TopScorers from './components/TopScorers';
import { useResultsStore } from './store/useResultsStore';
import type { DataIndex, StudentRecord } from './lib/types';
import { loadIndex, searchByName } from './lib/dataClient';
import { toArabicDigits } from './lib/format';
import { goHome, goToStudent, useHashRoute } from './lib/useHashRoute';

const DIGITS_ONLY = /^[0-9]+$/;

export default function App() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const route = useHashRoute();

  const query = useResultsStore((s) => s.query);
  const setQuery = useResultsStore((s) => s.setQuery);
  const setLoading = useResultsStore((s) => s.setLoading);
  const setProgress = useResultsStore((s) => s.setProgress);
  const setResults = useResultsStore((s) => s.setResults);
  const setMode = useResultsStore((s) => s.setMode);
  const setError = useResultsStore((s) => s.setError);

  const mode = useResultsStore((s) => s.mode);
  const loading = useResultsStore((s) => s.loading);
  const progress = useResultsStore((s) => s.progress);
  const results = useResultsStore((s) => s.results);
  const totalMatches = useResultsStore((s) => s.totalMatches);
  const error = useResultsStore((s) => s.error);
  const activeStatuses = useResultsStore((s) => s.activeStatuses);
  const activeTiers = useResultsStore((s) => s.activeTiers);
  const minDegree = useResultsStore((s) => s.minDegree);
  const maxDegree = useResultsStore((s) => s.maxDegree);
  const sort = useResultsStore((s) => s.sort);

  useEffect(() => {
    loadIndex()
      .then((idx) => setIndex(idx))
      .catch((e: Error) => setIndexError(e.message));
  }, []);

  // Support the old `?seat=` URL form as a redirect into hash routing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seatParam = params.get('seat');
    if (seatParam && /^\d+$/.test(seatParam) && route.name === 'home') {
      goToStudent(parseInt(seatParam, 10));
    }
  }, [route.name]);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (route.name !== 'home') return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setError(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setMode('idle');
      setResults([], 0);
      setProgress(null);
      setLoading(false);
      return;
    }

    if (DIGITS_ONLY.test(trimmed)) {
      // Seating-number path — debounce so we don't navigate on every keystroke
      // (e.g. "2", "20", "200"...). Only jump into the detail page once the
      // user has typed the full 7-digit seat and paused briefly.
      setMode('seating');
      setResults([], 0);
      setProgress(null);
      const isFullSeat = trimmed.length === 7;
      if (!isFullSeat) {
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = window.setTimeout(() => {
        setLoading(false);
        goToStudent(parseInt(trimmed, 10));
      }, 400);
      return () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
      };
    }

    if (trimmed.length < 2) {
      setMode('idle');
      setResults([], 0);
      setLoading(false);
      return;
    }

    setMode('name');
    setResults([], 0);
    setLoading(true);
    const meta = index?.letters[trimmed.charAt(0)];
    setProgress({ loaded: 0, total: meta?.chunks ?? 1 });

    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = window.setTimeout(() => {
      searchByName(trimmed, {
        signal: controller.signal,
        onProgress: (loaded, total) => setProgress({ loaded, total }),
        sort,
        filters: {
          statuses: activeStatuses,
          tiers: activeTiers,
          minDegree,
          maxDegree,
        },
      })
        .then((r) => {
          if (controller.signal.aborted) return;
          setResults(r.hits, r.totalMatches);
          if (r.hits.length === 0)
            setError(`لم يتم العثور على أي طالب يطابق "${trimmed}"`);
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
            setProgress(null);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [
    query,
    activeStatuses,
    activeTiers,
    minDegree,
    maxDegree,
    sort,
    route.name,
    index,
    setError,
    setLoading,
    setMode,
    setProgress,
    setResults,
  ]);

  const handleOpen = (r: StudentRecord) => goToStudent(r.seat);
  const handleBack = () => {
    goHome();
    setQuery('');
  };

  return (
    <div className="min-h-screen">
      {route.name === 'student' ? (
        <StudentDetail seat={route.seat} index={index} onBack={handleBack} />
      ) : (
        <>
          <Hero index={index} />
          <SearchBar />
          <Filters index={index} />

          {indexError && (
            <EmptyState title="تعذّر تحميل بيانات النتائج" hint={indexError} />
          )}

          {mode === 'idle' && !indexError && (
            <>
              <Stats index={index} />
              <TopScorers index={index} onOpen={handleOpen} />
            </>
          )}

          {loading && mode === 'name' && progress && (
            <div className="py-2">
              <LoadingBar loaded={progress.loaded} total={progress.total} />
            </div>
          )}

          {mode === 'seating' && loading && (
            <div className="mx-auto max-w-3xl px-4 py-6 text-center text-white/60">
              جاري فتح بيانات رقم الجلوس {toArabicDigits(query)}...
            </div>
          )}

          {mode === 'name' && results.length > 0 && (
            <ResultsList
              results={results}
              totalMatches={totalMatches}
              index={index}
              onOpen={handleOpen}
            />
          )}

          {error && !loading && (
            <EmptyState title="لا توجد نتائج" hint={error} />
          )}

          <footer className="mx-auto max-w-3xl px-4 pb-10 pt-6 text-center text-xs text-white/40">
            البيانات معروضة من الملف الأصلي لأغراض البحث فقط. المصدر: نتيجة الثانوية العامة ٢٠٢٦ الدور الأول.
          </footer>
        </>
      )}
    </div>
  );
}
