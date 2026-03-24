import * as path from "node:path";
import { Database } from "./database";
import { FileLock } from "./storage/lock";

export interface ClientOptions {
  path: string;
}

const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

function validateName(name: string, type: string): void {
  if (!name || typeof name !== "string") {
    throw new Error(`${type} name must be a non-empty string`);
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error(`${type} name contains invalid characters`);
  }
  if (!NAME_PATTERN.test(name)) {
    throw new Error(
      `${type} name must start with a letter or underscore and contain only alphanumeric characters, underscores, or hyphens`
    );
  }
  if (name.length > 64) {
    throw new Error(`${type} name must be 64 characters or less`);
  }
}

export class Client {
  private readonly basePath: string;
  private databases: Map<string, Database> = new Map();
  private locks: Map<string, FileLock> = new Map();
  private closed = false;

  constructor(options: ClientOptions | string) {
    this.basePath = typeof options === "string" ? options : options.path;
  }

  db(name: string): Database {
    if (this.closed) {
      throw new Error("Client has been closed");
    }

    validateName(name, "Database");

    const existing = this.databases.get(name);
    if (existing !== undefined) {
      return existing;
    }

    const dbPath = path.join(this.basePath, `${name}.tdb`);

    const lock = new FileLock(dbPath);
    lock.acquire();
    this.locks.set(name, lock);

    const database = new Database(name, dbPath);
    this.databases.set(name, database);

    return database;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const lock of this.locks.values()) {
      lock.release();
    }

    this.locks.clear();
    this.databases.clear();
  }
}

export { validateName };

export function createClient(options: ClientOptions | string): Client {
  return new Client(options);
}
