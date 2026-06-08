export interface Report {
  id: string;
  projectName?: string;
  testName: string;
  status: "passed" | "failed";
  errorMessage?: string;

  videoUrl?: string;
  traceUrl?: string;

  consoleLogs: any[];
  networkLogs: any[];

  createdAt: string;
}