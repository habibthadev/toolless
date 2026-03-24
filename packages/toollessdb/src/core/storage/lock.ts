import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { LockError } from "../errors/index";
import type { LockInfo } from "../types/index";

const LOCK_FILE_NAME = "_lock";

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockInfo(lockPath: string): LockInfo | null {
  try {
    const content = fs.readFileSync(lockPath, "utf-8");
    const info = JSON.parse(content) as LockInfo;
    if (typeof info.pid === "number" && typeof info.created === "number") {
      return info;
    }
    return null;
  } catch {
    return null;
  }
}

function writeLockInfo(lockPath: string, info: LockInfo): void {
  const tempPath = lockPath + ".tmp";
  fs.writeFileSync(tempPath, JSON.stringify(info), "utf-8");
  fs.renameSync(tempPath, lockPath);
}

export class FileLock {
  private readonly lockPath: string;
  private readonly dbPath: string;
  private released = false;
  private cleanupHandlers: Array<() => void> = [];

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.lockPath = path.join(dbPath, LOCK_FILE_NAME);
  }

  acquire(): void {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }

    const existingLock = readLockInfo(this.lockPath);

    if (existingLock !== null) {
      if (isProcessRunning(existingLock.pid)) {
        throw new LockError(
          `Database is locked by another process (PID: ${existingLock.pid})`,
          this.lockPath,
          existingLock.pid
        );
      }
      fs.unlinkSync(this.lockPath);
    }

    const lockInfo: LockInfo = {
      pid: process.pid,
      created: Date.now(),
      hostname: os.hostname(),
    };

    writeLockInfo(this.lockPath, lockInfo);

    this.setupCleanupHandlers();
  }

  private setupCleanupHandlers(): void {
    const cleanup = (): void => {
      this.release();
    };

    const exitHandler = (): void => {
      cleanup();
    };

    const signalHandler = (signal: NodeJS.Signals): void => {
      cleanup();
      process.exit(signal === "SIGINT" ? 130 : 143);
    };

    process.on("exit", exitHandler);
    process.on("SIGINT", signalHandler);
    process.on("SIGTERM", signalHandler);
    process.on("uncaughtException", (err: Error) => {
      cleanup();
      throw err;
    });

    this.cleanupHandlers.push(() => {
      process.removeListener("exit", exitHandler);
      process.removeListener("SIGINT", signalHandler as NodeJS.SignalsListener);
      process.removeListener("SIGTERM", signalHandler as NodeJS.SignalsListener);
    });
  }

  release(): void {
    if (this.released) {
      return;
    }

    this.released = true;

    for (const handler of this.cleanupHandlers) {
      try {
        handler();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.cleanupHandlers = [];

    try {
      const existingLock = readLockInfo(this.lockPath);
      if (existingLock !== null && existingLock.pid === process.pid) {
        fs.unlinkSync(this.lockPath);
      }
    } catch {
      // Ignore errors during release
    }
  }

  isLocked(): boolean {
    return !this.released && fs.existsSync(this.lockPath);
  }
}
