import { useEffect, useMemo, useRef, useState } from 'react';
import Hero from './components/Hero';
import SearchBar from './components/SearchBar';
import Filters from './components/Filters';
import ResultCard from './components/ResultCard';
import ResultsList from './components/ResultsList';
import Stats from './components/Stats';
import EmptyState from './components/EmptyState';
import LoadingBar from './components/LoadingBar';
import { useResultsStore } from './store/useResultsStore';
import type { DataIndex, StudentRecord } from './lib/types';
import { getBySeating, loadIndex, searchByName } from './lib/dataClient';
import { toArabicDigits } from './lib/format';

const DIGITS_ONLY = /^[0-9]+$/;

export default function App() {
  const [index, setIndex] = useState<DataIndex | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const query = useResultsStore((s) => s.query);
  const setLoading = useResultsStore((s) => s.setLoading);
  const setProgress = useResultsStore((s) => s.setProgress);
  const setResults = useResultsStore((s) => s.setResults);
  const setSingleResult = useResultsStore((s) => s.setSingleResult);
  const setMode = useResultsStore((s) => s.setMode);
  const setTruncated = useResultsStore((s) => s.setTruncated);
  const setError = useResultsStore((s) => s.setError);

  const mode = useResultsStore((s) => s.mode);
  const loading = useResultsStore((s) => s.loading);
  const progress = useResultsStore((s) => s.progress);
  const results = useResultsStore((s) => s.results);
  const singleResult = useResultsStore((s) => s.singleResult);
  const truncated = useResultsStore((s) => s.truncated);
  const error = useResultsStore((s) => s.error);
  const activeStatuses = useResultsStore((s) => s.activeStatuses);
  const minDegree = useResultsStore((s) => s.minDegree);
  const maxDegree = useResultsStore((s) => s.maxDegree);

  useEffect(() => {
    loadIndex()
      .then((idx) => setIndex(idx))
      .catch((e: Error) => setIndexError(e.message));
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setError(null);

    const trimmed = query.trim();
    if (!trimmed) {
      setMode('idle');
      setResults([]);
      setSingleResult(null);
      setProgress(null);
      setLoading(false);
      return;
    }

    if (DIGITS_ONLY.test(trimmed)) {
      setMode('seating');
      setResults([]);
      setLoading(true);
      const seat = parseInt(trimmed, 10);
      getBySeating(seat)
        .then((rec) => {
          setSingleResult(rec);
          if (!rec) setError(`لم يتم العثور على نتيجة برقم الجلوس ${toArabicDigits(seat)}`);
          const url = new URL(window.location.href);
          if (rec) url.searchParams.set('seat', String(seat));
          else url.searchParams.delete('seat');
          window.history.replaceState({}, '', url.toString());
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }

    if (trimmed.length < 2) {
      setMode('idle');
      setResults([]);
      setSingleResult(null);
      setLoading(false);
      return;
    }

    setMode('name');
    setSingleResult(null);
    setResults([]);
    setLoading(true);
    setProgress({ loaded: 0, total: index?.nameShardCount ?? 1 });

    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = window.setTimeout(() => {
      searchByName(trimmed, {
        signal: controller.signal,
        onProgress: (p) => setProgress(p),
        limit: 200,
        statusFilter: activeStatuses.size ? activeStatuses : undefined,
        minDegree,
        maxDegree,
      })
        .then((r) => {
          if (controller.signal.aborted) return;
          setResults(r.hits);
          setTruncated(r.truncated);
          if (r.hits.length === 0)
            setError(`لم يتم العثور على أي طالب باسم "${trimmed}"`);
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
    minDegree,
    maxDegree,
    setError,
    setLoading,
    setMode,
    setProgress,
    setResults,
    setSingleResult,
    setTruncated,
    index?.nameShardCount,
  ]);

  const filteredResults = useMemo<StudentRecord[]>(() => {
    return results.filter((r) => {
      if (activeStatuses.size && !activeStatuses.has(r.status)) return false;
      if (r.degree < minDegree || r.degree > maxDegree) return false;
      return true;
    });
  }, [results, activeStatuses, minDegree, maxDegree]);

  const degreeMax = index?.degreeMax ?? 320;

  return (
    <div className="min-h-screen">
      <Hero index={index} />
      <SearchBar />
      <Filters index={index} />

      {indexError && (
        <EmptyState
          title="تعذّر تحميل بيانات النتائج"
          hint={indexError}
        />
      )}

      {mode === 'idle' && !indexError && <Stats index={index} />}

      {loading && mode === 'name' && progress && (
        <div className="py-4">
          <LoadingBar loaded={progress.loaded} total={progress.total} />
        </div>
      )}

      {mode === 'seating' && singleResult && (
        <section className="mx-auto max-w-3xl px-4 py-6">
          <ResultCard record={singleResult} featured degreeMax={degreeMax} />
        </section>
      )}

      {mode === 'name' && filteredResults.length > 0 && (
        <ResultsList
          results={filteredResults}
          truncated={truncated}
          degreeMax={degreeMax}
        />
      )}

      {error && !loading && (
        <EmptyState
          title="لا توجد نتائج"
          hint={error}
        />
      )}

      <footer className="mx-auto max-w-3xl px-4 pb-10 pt-6 text-center text-xs text-white/40">
        البيانات معروضة من الملف الأصلي لأغراض البحث فقط. المصدر: نتيجة الثانوية العامة ٢٠٢٦ الدور الأول.
      </footer>
    </div>
  );
}
