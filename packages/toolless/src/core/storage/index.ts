import * as fs from "node:fs";
import type { Document, IndexSpec, IndexOptions, IndexDefinition } from "../types/index";
import { DuplicateKeyError } from "../errors/index";
import { atomicWrite } from "./ndjson";

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function createIndexKey(doc: Document, spec: IndexSpec): string {
  const parts: string[] = [];
  for (const field of Object.keys(spec)) {
    const value = getNestedValue(doc, field);
    parts.push(JSON.stringify(value));
  }
  return parts.join("|");
}

function generateIndexName(spec: IndexSpec): string {
  const parts: string[] = [];
  for (const [field, direction] of Object.entries(spec)) {
    parts.push(`${field}_${direction}`);
  }
  return parts.join("_");
}

interface IndexData {
  definitions: IndexDefinition[];
  entries: Record<string, Record<string, string[]>>;
}

export class IndexManager {
  private readonly indexPath: string;
  private definitions: IndexDefinition[] = [];
  private indexes: Map<string, Map<string, Set<string>>> = new Map();

  constructor(indexPath: string) {
    this.indexPath = indexPath;
  }

  load(): void {
    if (!fs.existsSync(this.indexPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(this.indexPath, "utf-8");
      const data = JSON.parse(content) as IndexData;

      this.definitions = data.definitions;

      for (const [indexName, entries] of Object.entries(data.entries)) {
        const indexMap = new Map<string, Set<string>>();
        for (const [key, ids] of Object.entries(entries)) {
          indexMap.set(key, new Set(ids));
        }
        this.indexes.set(indexName, indexMap);
      }
    } catch {
      this.definitions = [];
      this.indexes = new Map();
    }
  }

  save(): void {
    const entries: Record<string, Record<string, string[]>> = {};

    for (const [indexName, indexMap] of this.indexes) {
      entries[indexName] = {};
      for (const [key, ids] of indexMap) {
        entries[indexName][key] = Array.from(ids);
      }
    }

    const data: IndexData = {
      definitions: this.definitions,
      entries,
    };

    atomicWrite(this.indexPath, JSON.stringify(data, null, 2));
  }

  rebuild(documents: Map<string, Document>): void {
    this.indexes = new Map();

    for (const definition of this.definitions) {
      const indexMap = new Map<string, Set<string>>();

      for (const doc of documents.values()) {
        const key = createIndexKey(doc, definition.spec);
        const existing = indexMap.get(key);

        if (existing !== undefined) {
          if (definition.unique) {
            const fields = Object.keys(definition.spec);
            const value = fields.length === 1 ? getNestedValue(doc, fields[0] as string) : key;
            throw new DuplicateKeyError(fields.join(","), value);
          }
          existing.add(doc._id);
        } else {
          indexMap.set(key, new Set([doc._id]));
        }
      }

      this.indexes.set(definition.name, indexMap);
    }

    this.save();
  }

  createIndex(spec: IndexSpec, options?: IndexOptions): string {
    const name = options?.name ?? generateIndexName(spec);
    const unique = options?.unique ?? false;

    const existing = this.definitions.find((d) => d.name === name);
    if (existing !== undefined) {
      return name;
    }

    this.definitions.push({ name, spec, unique });
    this.indexes.set(name, new Map());

    return name;
  }

  dropIndex(name: string): boolean {
    const index = this.definitions.findIndex((d) => d.name === name);
    if (index === -1) {
      return false;
    }

    this.definitions.splice(index, 1);
    this.indexes.delete(name);
    this.save();

    return true;
  }

  listIndexes(): IndexDefinition[] {
    return [...this.definitions];
  }

  validateInsert(doc: Document): void {
    for (const definition of this.definitions) {
      if (!definition.unique) continue;

      const key = createIndexKey(doc, definition.spec);
      const indexMap = this.indexes.get(definition.name);

      if (indexMap !== undefined) {
        const existing = indexMap.get(key);
        if (existing !== undefined && existing.size > 0) {
          const fields = Object.keys(definition.spec);
          const value = fields.length === 1 ? getNestedValue(doc, fields[0] as string) : key;
          throw new DuplicateKeyError(fields.join(","), value);
        }
      }
    }
  }

  validateUpdate(oldDoc: Document, newDoc: Document): void {
    for (const definition of this.definitions) {
      if (!definition.unique) continue;

      const oldKey = createIndexKey(oldDoc, definition.spec);
      const newKey = createIndexKey(newDoc, definition.spec);

      if (oldKey === newKey) continue;

      const indexMap = this.indexes.get(definition.name);
      if (indexMap !== undefined) {
        const existing = indexMap.get(newKey);
        if (existing !== undefined && existing.size > 0) {
          const fields = Object.keys(definition.spec);
          const value = fields.length === 1 ? getNestedValue(newDoc, fields[0] as string) : newKey;
          throw new DuplicateKeyError(fields.join(","), value);
        }
      }
    }
  }

  addDocument(doc: Document): void {
    for (const definition of this.definitions) {
      const key = createIndexKey(doc, definition.spec);
      let indexMap = this.indexes.get(definition.name);

      if (indexMap === undefined) {
        indexMap = new Map();
        this.indexes.set(definition.name, indexMap);
      }

      const existing = indexMap.get(key);
      if (existing !== undefined) {
        existing.add(doc._id);
      } else {
        indexMap.set(key, new Set([doc._id]));
      }
    }
  }

  removeDocument(doc: Document): void {
    for (const definition of this.definitions) {
      const key = createIndexKey(doc, definition.spec);
      const indexMap = this.indexes.get(definition.name);

      if (indexMap !== undefined) {
        const existing = indexMap.get(key);
        if (existing !== undefined) {
          existing.delete(doc._id);
          if (existing.size === 0) {
            indexMap.delete(key);
          }
        }
      }
    }
  }

  updateDocument(oldDoc: Document, newDoc: Document): void {
    this.removeDocument(oldDoc);
    this.addDocument(newDoc);
  }

  clear(): void {
    this.definitions = [];
    this.indexes = new Map();
    if (fs.existsSync(this.indexPath)) {
      fs.unlinkSync(this.indexPath);
    }
  }
}
