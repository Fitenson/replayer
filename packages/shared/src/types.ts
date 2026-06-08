export interface Report {
  id: string;
  testName: string;
  status: "passed" | "failed";

  videoUrl?: string;
  traceUrl?: string;

  consoleLogs?: any[];
  networkLogs?: any[];
}