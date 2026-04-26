import * as fs from "node:fs";
import * as path from "node:path";
import type { Document, OperationRecord, CollectionHeader } from "../types/index";
import { CorruptFileError } from "../errors/index";

export function parseNdjsonLine(line: string): OperationRecord | CollectionHeader | null {
  const trimmed = line.trim();
  if (trimmed === "") {
    return null;
  }
  try {
    return JSON.parse(trimmed) as OperationRecord | CollectionHeader;
  } catch {
    return null;
  }
}

export function replayLog(filePath: string): {
  documents: Map<string, Document>;
  header: CollectionHeader | null;
  totalOps: number;
  liveOps: number;
} {
  const documents = new Map<string, Document>();
  let header: CollectionHeader | null = null;
  let totalOps = 0;
  let liveOps = 0;

  if (!fs.existsSync(filePath)) {
    return { documents, header, totalOps, liveOps };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  let start = 0;
  const len = content.length;

  while (start < len) {
    let end = content.indexOf("\n", start);
    if (end === -1) end = len;

    const line = content.slice(start, end);
    start = end + 1;

    if (line === "" || line.charCodeAt(0) <= 32) continue;

    let record: OperationRecord | CollectionHeader;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    if ("type" in record && record.type === "header") {
      header = record;
      continue;
    }

    const opRecord = record as OperationRecord;
    totalOps++;

    switch (opRecord.op) {
      case "insert":
        if (opRecord.doc !== undefined) {
          documents.set(opRecord._id, opRecord.doc);
          liveOps++;
        }
        break;

      case "update":
        if (opRecord.delta !== undefined) {
          const existing = documents.get(opRecord._id);
          if (existing !== undefined) {
            const merged = { ...existing, ...opRecord.delta, _id: opRecord._id };
            if (opRecord.deleted !== undefined) {
              for (const field of opRecord.deleted) {
                delete (merged as Record<string, unknown>)[field];
              }
            }
            documents.set(opRecord._id, merged);
          }
        }
        break;

      case "replace":
        if (opRecord.doc !== undefined) {
          if (documents.has(opRecord._id)) {
            documents.set(opRecord._id, opRecord.doc);
          }
        }
        break;

      case "delete":
        if (documents.has(opRecord._id)) {
          documents.delete(opRecord._id);
          liveOps--;
        }
        break;
    }
  }

  return { documents, header, totalOps, liveOps };
}

export function createHeader(collectionName: string): CollectionHeader {
  return {
    type: "header",
    collection: collectionName,
    created: Date.now(),
    version: 1,
  };
}

export function createInsertRecord(doc: Document): OperationRecord {
  return {
    op: "insert",
    _id: doc._id,
    ts: Date.now(),
    doc,
  };
}

export function createUpdateRecord(
  id: string,
  delta: Record<string, unknown>,
  deleted?: string[]
): OperationRecord {
  const record: OperationRecord = {
    op: "update",
    _id: id,
    ts: Date.now(),
    delta,
  };
  if (deleted !== undefined && deleted.length > 0) {
    record.deleted = deleted;
  }
  return record;
}

export function createReplaceRecord(doc: Document): OperationRecord {
  return {
    op: "replace",
    _id: doc._id,
    ts: Date.now(),
    doc,
  };
}

export function createDeleteRecord(id: string): OperationRecord {
  return {
    op: "delete",
    _id: id,
    ts: Date.now(),
  };
}

export function appendToFile(filePath: string, record: OperationRecord | CollectionHeader): void {
  const line = JSON.stringify(record) + "\n";
  const fd = fs.openSync(filePath, "a");
  try {
    fs.writeSync(fd, line);
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function appendBatchToFile(
  filePath: string,
  records: Array<OperationRecord | CollectionHeader>
): void {
  if (records.length === 0) return;

  const lines = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  const fd = fs.openSync(filePath, "a");
  try {
    fs.writeSync(fd, lines);
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function atomicWrite(filePath: string, content: string): void {
  const tempPath = filePath + ".tmp";
  const fd = fs.openSync(tempPath, "w");
  try {
    fs.writeSync(fd, content);
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempPath, filePath);
}

export function compactCollection(
  filePath: string,
  header: CollectionHeader,
  documents: Map<string, Document>
): void {
  const lines: string[] = [];
  lines.push(JSON.stringify(header));

  for (const doc of documents.values()) {
    const record = createInsertRecord(doc);
    lines.push(JSON.stringify(record));
  }

  const content = lines.join("\n") + "\n";
  atomicWrite(filePath, content);
}

export function ensureCollectionFile(filePath: string, collectionName: string): CollectionHeader {
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const header = createHeader(collectionName);
    const fd = fs.openSync(filePath, "w");
    try {
      fs.writeSync(fd, JSON.stringify(header) + "\n");
      fs.fdatasyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    return header;
  }

  const { header } = replayLog(filePath);
  if (header === null) {
    throw new CorruptFileError("Collection file missing header", filePath);
  }
  return header;
}

export function deleteCollectionFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  const tempPath = filePath + ".tmp";
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
}
