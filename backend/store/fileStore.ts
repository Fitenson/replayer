import fs from "fs";
import path from "path";
import { Report } from "../types/report";

const DB_DIR = path.join(process.cwd(), "data/reports");

export function saveReport(report: Report) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const filePath = path.join(DB_DIR, `${report.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
}

export function getReport(id: string): Report | null {
  const filePath = path.join(DB_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}