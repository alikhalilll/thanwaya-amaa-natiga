import { create } from 'zustand';
import type { StudentRecord } from '../lib/types';

export type Mode = 'idle' | 'seating' | 'name' | 'browse';

type State = {
  query: string;
  mode: Mode;
  loading: boolean;
  progress: { loaded: number; total: number } | null;
  results: StudentRecord[];
  singleResult: StudentRecord | null;
  truncated: boolean;
  error: string | null;

  activeStatuses: Set<number>;
  minDegree: number;
  maxDegree: number;

  setQuery: (q: string) => void;
  setMode: (m: Mode) => void;
  setLoading: (v: boolean) => void;
  setProgress: (p: { loaded: number; total: number } | null) => void;
  setResults: (r: StudentRecord[]) => void;
  setSingleResult: (r: StudentRecord | null) => void;
  setTruncated: (v: boolean) => void;
  setError: (e: string | null) => void;

  toggleStatus: (i: number) => void;
  setDegreeRange: (min: number, max: number) => void;
  resetFilters: () => void;
};

export const useResultsStore = create<State>((set) => ({
  query: '',
  mode: 'idle',
  loading: false,
  progress: null,
  results: [],
  singleResult: null,
  truncated: false,
  error: null,

  activeStatuses: new Set<number>(),
  minDegree: 0,
  maxDegree: 320,

  setQuery: (q) => set({ query: q }),
  setMode: (m) => set({ mode: m }),
  setLoading: (v) => set({ loading: v }),
  setProgress: (p) => set({ progress: p }),
  setResults: (r) => set({ results: r }),
  setSingleResult: (r) => set({ singleResult: r }),
  setTruncated: (v) => set({ truncated: v }),
  setError: (e) => set({ error: e }),

  toggleStatus: (i) =>
    set((s) => {
      const next = new Set(s.activeStatuses);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return { activeStatuses: next };
    }),
  setDegreeRange: (min, max) => set({ minDegree: min, maxDegree: max }),
  resetFilters: () =>
    set({
      activeStatuses: new Set<number>(),
      minDegree: 0,
      maxDegree: 320,
    }),
}));
