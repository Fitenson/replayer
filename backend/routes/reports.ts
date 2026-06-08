import { v4 as uuid } from "uuid";
import { saveReport, getReport } from "../store/fileStore";
import { Report } from "../types/report";

export async function reportsRoutes(fastify: any) {

  // CREATE REPORT
  fastify.post("/reports", async (req: any) => {
    const id = uuid();

    const body = req.body;

    const report: Report = {
      id,
      testName: body.testName,
      projectName: body.projectName,
      status: body.status,
      errorMessage: body.errorMessage,

      videoUrl: body.videoUrl,
      traceUrl: body.traceUrl,

      consoleLogs: body.consoleLogs || [],
      networkLogs: body.networkLogs || [],

      createdAt: new Date().toISOString()
    };

    saveReport(report);

    return {
      id,
      url: `http://localhost:3000/reports/${id}`
    };
  });

  // GET REPORT
  fastify.get("/reports/:id", async (req: any) => {
    const { id } = req.params;

    const report = getReport(id);

    if (!report) {
      return { error: "Not found" };
    }

    return report;
  });
}