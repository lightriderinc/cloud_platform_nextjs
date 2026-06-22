export type JobStatus = "WAITING" | "PROCESSING" | "COMPLETED" | "FAILED" | "ABORTED";

// Shape returned by GET /jobs (list)
export interface Job {
  uuid: string;
  gate?: string;
  shots?: number;
  status: JobStatus;
  created_at?: string;
  finished_at?: string;
}

// Shape returned by GET /jobs/{id} (detail)
export interface JobDetail {
  id: string;
  kind?: string;
  status: JobStatus;
  createdAt?: string;
  finishedAt?: string;
  isInTerminalState?: boolean;
  quantumComputer?: {
    alias: string;
    displayName: string;
  };
}

export type MeasurementCounts = Record<string, number>;
