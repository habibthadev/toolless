import type {
  Document,
  SortSpec,
  ProjectionSpec,
  Filter,
  SortDirection,
  WithId,
} from "../types/index";
import { matchFilter } from "./filter";

function normalizeDirection(dir: SortDirection): 1 | -1 {
  if (dir === "asc" || dir === 1) return 1;
  return -1;
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b ? 0 : a ? 1 : -1;
  }

  return String(a).localeCompare(String(b));
}

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

function sortDocuments(docs: Document[], sortSpec: SortSpec): Document[] {
  const entries = Object.entries(sortSpec);

  return [...docs].sort((a, b) => {
    for (const [field, direction] of entries) {
      const normalizedDir = normalizeDirection(direction);
      const aVal = getNestedValue(a, field);
      const bVal = getNestedValue(b, field);
      const cmp = compareValues(aVal, bVal) * normalizedDir;
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

function applyProjection(doc: Document, projection: ProjectionSpec): Document {
  const entries = Object.entries(projection);
  const isInclusion = entries.some(([, value]) => value === 1 || value === true);
  const isExclusion = entries.some(([, value]) => value === 0 || value === false);

  if (isInclusion && isExclusion) {
    const idSpec = projection["_id"];
    const nonIdEntries = entries.filter(([key]) => key !== "_id");
    const nonIdInclusion = nonIdEntries.some(([, value]) => value === 1 || value === true);

    if (nonIdInclusion) {
      const result: Record<string, unknown> = {};

      if (idSpec !== 0 && idSpec !== false) {
        result._id = doc._id;
      }

      for (const [field, value] of nonIdEntries) {
        if (value === 1 || value === true) {
          const val = getNestedValue(doc, field);
          if (val !== undefined) {
            result[field] = val;
          }
        }
      }

      return result as Document;
    }
  }

  if (isInclusion) {
    const result: Record<string, unknown> = {};

    const idSpec = projection["_id"];
    if (idSpec !== 0 && idSpec !== false) {
      result._id = doc._id;
    }

    for (const [field, value] of entries) {
      if (field === "_id") continue;
      if (value === 1 || value === true) {
        const val = getNestedValue(doc, field);
        if (val !== undefined) {
          result[field] = val;
        }
      }
    }

    return result as Document;
  }

  const result = { ...doc };

  for (const [field, value] of entries) {
    if (value === 0 || value === false) {
      delete result[field as keyof typeof result];
    }
  }

  return result;
}

export class Cursor<T> {
  private readonly documents: Map<string, Document>;
  private readonly filter: Filter<T>;
  private sortSpec: SortSpec | undefined;
  private limitValue: number | undefined;
  private skipValue: number | undefined;
  private projectionSpec: ProjectionSpec | undefined;
  private cachedResults: Document[] | undefined;

  constructor(documents: Map<string, Document>, filter: Filter<T>) {
    this.documents = documents;
    this.filter = filter;
  }

  sort(spec: SortSpec): this {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  skip(n: number): this {
    this.skipValue = n;
    return this;
  }

  project(spec: ProjectionSpec): this {
    this.projectionSpec = spec;
    return this;
  }

  private execute(): Document[] {
    if (this.cachedResults !== undefined) {
      return this.cachedResults;
    }

    let results: Document[] = [];

    for (const doc of this.documents.values()) {
      if (matchFilter(doc, this.filter)) {
        results.push(doc);
      }
    }

    if (this.sortSpec !== undefined) {
      results = sortDocuments(results, this.sortSpec);
    }

    if (this.skipValue !== undefined && this.skipValue > 0) {
      results = results.slice(this.skipValue);
    }

    if (this.limitValue !== undefined && this.limitValue >= 0) {
      results = results.slice(0, this.limitValue);
    }

    if (this.projectionSpec !== undefined) {
      results = results.map((doc) => applyProjection(doc, this.projectionSpec as ProjectionSpec));
    }

    this.cachedResults = results;
    return results;
  }

  async toArray(): Promise<Array<WithId<T>>> {
    return this.execute() as Array<WithId<T>>;
  }

  async forEach(fn: (doc: WithId<T>) => void | Promise<void>): Promise<void> {
    const results = this.execute();
    for (const doc of results) {
      await fn(doc as WithId<T>);
    }
  }

  async count(): Promise<number> {
    let results: Document[] = [];

    for (const doc of this.documents.values()) {
      if (matchFilter(doc, this.filter)) {
        results.push(doc);
      }
    }

    if (this.skipValue !== undefined && this.skipValue > 0) {
      results = results.slice(this.skipValue);
    }

    if (this.limitValue !== undefined && this.limitValue >= 0) {
      results = results.slice(0, this.limitValue);
    }

    return results.length;
  }

  [Symbol.asyncIterator](): AsyncIterator<WithId<T>> {
    const results = this.execute();
    let index = 0;

    return {
      next: async (): Promise<IteratorResult<WithId<T>>> => {
        if (index < results.length) {
          const value = results[index] as WithId<T>;
          index++;
          return { value, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  }
}
