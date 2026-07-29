export type StudentRecord = {
  seat: number;
  name: string;
  degree: number;
  status: number;
  tier: number;
  rank: number;
  rankInStatus: number;
};

export type TierMeta = {
  key: number;
  name: string;
  minPct: number;
  minDegree: number;
  count: number;
};

export type LetterMeta = { count: number; chunks: number };

export type DataIndex = {
  totalRows: number;
  seatingMin: number;
  seatingMax: number;
  degreeMax: number;
  bucketDigits: number;
  statuses: string[];
  statusCounts: number[];
  tiers: TierMeta[];
  degreeHistogram: number[];
  degreeHistogramStep?: number;
  fractionalDegrees?: number;
  letters: Record<string, LetterMeta>;
  letterChunkSize: number;
  builtAt: string;
};
