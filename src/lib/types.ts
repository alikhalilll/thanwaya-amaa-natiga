export type StudentRecord = {
  seat: number;
  name: string;
  degree: number;
  status: number;
};

export type DataIndex = {
  totalRows: number;
  seatingMin: number;
  seatingMax: number;
  degreeMax: number;
  bucketDigits: number;
  statuses: string[];
  statusCounts: number[];
  buckets: number[];
  nameShardCount: number;
  builtAt: string;
};
