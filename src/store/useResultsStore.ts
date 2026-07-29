import { create } from 'zustand';
import type { StudentRecord } from '../lib/types';
import type { SortOrder } from '../lib/dataClient';

export type Mode = 'idle' | 'seating' | 'name' | 'detail';

type State = {
  query: string;
  mode: Mode;
  loading: boolean;
  progress: { loaded: number; total: number } | null;
  results: StudentRecord[];
  totalMatches: number;
  singleResult: StudentRecord | null;
  error: string | null;

  activeStatuses: Set<number>;
  activeTiers: Set<number>;
  minDegree: number;
  maxDegree: number;
  sort: SortOrder;

  setQuery: (q: string) => void;
  setMode: (m: Mode) => void;
  setLoading: (v: boolean) => void;
  setProgress: (p: { loaded: number; total: number } | null) => void;
  setResults: (r: StudentRecord[], total: number) => void;
  setSingleResult: (r: StudentRecord | null) => void;
  setError: (e: string | null) => void;

  toggleStatus: (i: number) => void;
  toggleTier: (i: number) => void;
  setDegreeRange: (min: number, max: number) => void;
  setSort: (s: SortOrder) => void;
  resetFilters: () => void;
};

const DEFAULT_DEGREE_MAX = 320;

export const useResultsStore = create<State>((set) => ({
  query: '',
  mode: 'idle',
  loading: false,
  progress: null,
  results: [],
  totalMatches: 0,
  singleResult: null,
  error: null,

  activeStatuses: new Set<number>(),
  activeTiers: new Set<number>(),
  minDegree: 0,
  maxDegree: DEFAULT_DEGREE_MAX,
  sort: 'degree_desc',

  setQuery: (q) => set({ query: q }),
  setMode: (m) => set({ mode: m }),
  setLoading: (v) => set({ loading: v }),
  setProgress: (p) => set({ progress: p }),
  setResults: (r, total) => set({ results: r, totalMatches: total }),
  setSingleResult: (r) => set({ singleResult: r }),
  setError: (e) => set({ error: e }),

  toggleStatus: (i) =>
    set((s) => {
      const next = new Set(s.activeStatuses);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return { activeStatuses: next };
    }),
  toggleTier: (i) =>
    set((s) => {
      const next = new Set(s.activeTiers);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return { activeTiers: next };
    }),
  setDegreeRange: (min, max) => set({ minDegree: min, maxDegree: max }),
  setSort: (s) => set({ sort: s }),
  resetFilters: () =>
    set({
      activeStatuses: new Set<number>(),
      activeTiers: new Set<number>(),
      minDegree: 0,
      maxDegree: DEFAULT_DEGREE_MAX,
      sort: 'degree_desc',
    }),
}));
