import chalk from "chalk";
import * as fs from "node:fs";
import * as path from "node:path";

export const colors = {
  primary: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  dim: chalk.dim,
  bold: chalk.bold,
  muted: chalk.gray,
};

export function resolveDatabase(
  database: string,
  pathOption: string
): { basePath: string; dbName: string } | null {
  // First, check if database is a path (contains / or ends with .tdb)
  if (database.includes("/") || database.includes("\\") || database.endsWith(".tdb")) {
    let dbPath = database;
    // Normalize: remove trailing .tdb if present
    if (dbPath.endsWith(".tdb")) {
      dbPath = dbPath.slice(0, -4);
    }

    const fullPath = path.resolve(dbPath + ".tdb");
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return {
        basePath: path.dirname(fullPath),
        dbName: path.basename(dbPath),
      };
    }
  }

  // Second, check explicit path option
  const basePath = path.resolve(pathOption);
  const dbPath = path.join(basePath, `${database}.tdb`);
  if (fs.existsSync(dbPath) && fs.statSync(dbPath).isDirectory()) {
    return { basePath, dbName: database };
  }

  // Third, try ./data folder auto-discovery
  if (pathOption === ".") {
    const dataPath = path.resolve("data");
    const dataDbPath = path.join(dataPath, `${database}.tdb`);
    if (fs.existsSync(dataDbPath) && fs.statSync(dataDbPath).isDirectory()) {
      return { basePath: dataPath, dbName: database };
    }
  }

  return null;
}

export function getDefaultBasePath(): string {
  // Check if ./data exists and has .tdb databases
  const dataPath = path.resolve("data");
  if (fs.existsSync(dataPath) && fs.statSync(dataPath).isDirectory()) {
    const entries = fs.readdirSync(dataPath, { withFileTypes: true });
    const hasDatabases = entries.some((e) => e.isDirectory() && e.name.endsWith(".tdb"));
    if (hasDatabases) {
      return dataPath;
    }
  }
  return path.resolve(".");
}

export function databaseExists(basePath: string, dbName: string): boolean {
  const dbPath = path.join(basePath, `${dbName}.tdb`);
  return fs.existsSync(dbPath) && fs.statSync(dbPath).isDirectory();
}

export function collectionExists(
  basePath: string,
  dbName: string,
  collectionName: string
): boolean {
  const collPath = path.join(basePath, `${dbName}.tdb`, `${collectionName}.tdb`);
  return fs.existsSync(collPath);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}

export function formatJson(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}

export function printError(message: string): void {
  process.stderr.write(colors.error(`Error: ${message}\n`));
}

export function printSuccess(message: string): void {
  process.stdout.write(colors.success(`${message}\n`));
}

export function printWarning(message: string): void {
  process.stdout.write(colors.warning(`Warning: ${message}\n`));
}

export function printInfo(message: string): void {
  process.stdout.write(colors.muted(`${message}\n`));
}
