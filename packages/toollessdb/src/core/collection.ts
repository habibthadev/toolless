import * as path from "node:path";
import type { z } from "zod";
import type {
  Document,
  WithId,
  OptionalId,
  Filter,
  Update,
  InsertOneResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  ReplaceResult,
  FindOptions,
  UpdateOptions,
  IndexSpec,
  IndexOptions,
  IndexDefinition,
  CollectionHeader,
} from "./types/index";
import { CollectionDroppedError, ValidationError, DuplicateKeyError } from "./errors/index";
import { generateObjectId } from "./storage/objectid";
import { WriteQueue } from "./storage/queue";
import { IndexManager } from "./storage/index";
import {
  replayLog,
  appendToFile,
  appendBatchToFile,
  createInsertRecord,
  createUpdateRecord,
  createReplaceRecord,
  createDeleteRecord,
  ensureCollectionFile,
  compactCollection,
  deleteCollectionFile,
} from "./storage/ndjson";
import { matchFilter } from "./query/filter";
import { applyUpdate, applyReplacement } from "./query/update";
import { Cursor } from "./query/cursor";

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export interface CollectionOptions<S extends z.ZodType | undefined = undefined> {
  schema?: S;
}

export class Collection<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly name: string;
  private readonly filePath: string;
  private readonly dbPath: string;
  private documents: Map<string, Document> = new Map();
  private header: CollectionHeader | null = null;
  private totalOps = 0;
  private liveOps = 0;
  private loaded = false;
  private dropped = false;
  private readonly writeQueue: WriteQueue;
  private readonly indexManager: IndexManager;
  private readonly schema: z.ZodType | undefined;

  constructor(name: string, dbPath: string, options?: CollectionOptions<z.ZodType>) {
    this.name = name;
    this.dbPath = dbPath;
    this.filePath = path.join(dbPath, `${name}.tdb`);
    this.writeQueue = new WriteQueue();
    this.indexManager = new IndexManager(path.join(dbPath, `${name}.idx.tdb`));
    this.schema = options?.schema as z.ZodType | undefined;
  }

  private ensureNotDropped(): void {
    if (this.dropped) {
      throw new CollectionDroppedError(this.name);
    }
  }

  private ensureLoaded(): void {
    this.ensureNotDropped();

    if (this.loaded) {
      return;
    }

    this.header = ensureCollectionFile(this.filePath, this.name);
    const result = replayLog(this.filePath);

    this.documents = result.documents;
    this.header = result.header ?? this.header;
    this.totalOps = result.totalOps;
    this.liveOps = result.liveOps;

    this.indexManager.load();

    if (this.indexManager.listIndexes().length > 0) {
      try {
        this.indexManager.rebuild(this.documents);
      } catch (err) {
        if (err instanceof DuplicateKeyError) {
          throw err;
        }
        throw err;
      }
    }

    this.loaded = true;
  }

  private validate(doc: Record<string, unknown>): Record<string, unknown> {
    if (this.schema === undefined) {
      return doc;
    }

    const result = this.schema.safeParse(doc);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path,
      }));
      throw new ValidationError("Document validation failed", issues);
    }

    return result.data as Record<string, unknown>;
  }

  private excludeId(doc: Record<string, unknown>): Record<string, unknown> {
    const { _id, ...rest } = doc;
    return rest;
  }

  private async maybeCompact(): Promise<void> {
    const deadOps = this.totalOps - this.liveOps;
    if (this.totalOps > 0 && deadOps / this.totalOps >= 0.5) {
      await this.compact();
    }
  }

  async insertOne(doc: OptionalId<T>): Promise<InsertOneResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      const id = doc._id ?? generateObjectId();
      const baseDoc: Document = { ...doc, _id: id } as Document;

      const validated = this.validate(this.excludeId(baseDoc));
      const docWithId: Document = { ...validated, _id: id } as Document;

      if (this.documents.has(id)) {
        throw new DuplicateKeyError("_id", id);
      }

      this.indexManager.validateInsert(docWithId);

      const record = createInsertRecord(docWithId);
      appendToFile(this.filePath, record);

      this.documents.set(id, docWithId);
      this.indexManager.addDocument(docWithId);
      this.totalOps++;
      this.liveOps++;

      await this.maybeCompact();

      return { insertedId: id };
    });
  }

  async insertMany(docs: Array<OptionalId<T>>): Promise<InsertManyResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      const insertedIds: string[] = [];
      const records: ReturnType<typeof createInsertRecord>[] = [];
      const docsToInsert: Document[] = [];
      const seenIds = new Set<string>();

      for (const doc of docs) {
        const id = doc._id ?? generateObjectId();
        const baseDoc: Document = { ...doc, _id: id } as Document;

        const validated = this.validate(this.excludeId(baseDoc));
        const docWithId: Document = { ...validated, _id: id } as Document;

        if (this.documents.has(id) || seenIds.has(id)) {
          throw new DuplicateKeyError("_id", id);
        }
        seenIds.add(id);

        this.indexManager.validateInsert(docWithId);

        records.push(createInsertRecord(docWithId));
        docsToInsert.push(docWithId);
        insertedIds.push(id);
      }

      appendBatchToFile(this.filePath, records);

      for (const docWithId of docsToInsert) {
        this.documents.set(docWithId._id, docWithId);
        this.indexManager.addDocument(docWithId);
        this.totalOps++;
        this.liveOps++;
      }

      await this.maybeCompact();

      return { insertedIds, insertedCount: insertedIds.length };
    });
  }

  async findOne(filter: Filter<T>, _options?: FindOptions): Promise<WithId<T> | null> {
    this.ensureLoaded();

    // Fast path: direct _id lookup
    if (
      filter._id !== undefined &&
      typeof filter._id === "string" &&
      Object.keys(filter).length === 1
    ) {
      const doc = this.documents.get(filter._id);
      return doc !== undefined ? (doc as WithId<T>) : null;
    }

    for (const doc of this.documents.values()) {
      if (matchFilter(doc, filter)) {
        return doc as WithId<T>;
      }
    }

    return null;
  }

  find(filter: Filter<T>, options?: FindOptions): Cursor<T> {
    this.ensureLoaded();

    const cursor = new Cursor<T>(this.documents, filter);

    if (options?.sort !== undefined) {
      cursor.sort(options.sort);
    }
    if (options?.limit !== undefined) {
      cursor.limit(options.limit);
    }
    if (options?.skip !== undefined) {
      cursor.skip(options.skip);
    }
    if (options?.projection !== undefined) {
      cursor.project(options.projection);
    }

    return cursor;
  }

  async updateOne(
    filter: Filter<T>,
    update: Update<T>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      let doc: Document | undefined;

      for (const d of this.documents.values()) {
        if (matchFilter(d, filter)) {
          doc = d;
          break;
        }
      }

      if (doc === undefined) {
        if (options?.upsert === true) {
          const baseDoc: Document = { _id: generateObjectId() } as Document;

          if (update.$set !== undefined) {
            Object.assign(baseDoc, update.$set);
          }

          for (const [key, value] of Object.entries(filter)) {
            if (!key.startsWith("$") && typeof value !== "object") {
              (baseDoc as Record<string, unknown>)[key] = value;
            }
          }

          const validated = this.validate(this.excludeId(baseDoc));
          const newDoc: Document = { ...validated, _id: baseDoc._id } as Document;

          this.indexManager.validateInsert(newDoc);

          const record = createInsertRecord(newDoc);
          appendToFile(this.filePath, record);

          this.documents.set(newDoc._id, newDoc);
          this.indexManager.addDocument(newDoc);
          this.totalOps++;
          this.liveOps++;

          await this.maybeCompact();

          return { matchedCount: 0, modifiedCount: 0, upsertedId: newDoc._id };
        }

        return { matchedCount: 0, modifiedCount: 0 };
      }

      const { updated: baseUpdated, delta, deleted } = applyUpdate(doc, update);

      const validated = this.validate(this.excludeId(baseUpdated));
      const updated: Document = { ...validated, _id: doc._id } as Document;

      this.indexManager.validateUpdate(doc, updated);

      const record = createUpdateRecord(doc._id, delta, deleted);
      appendToFile(this.filePath, record);

      this.documents.set(doc._id, updated);
      this.indexManager.updateDocument(doc, updated);
      this.totalOps++;

      await this.maybeCompact();

      return { matchedCount: 1, modifiedCount: 1 };
    });
  }

  async updateMany(
    filter: Filter<T>,
    update: Update<T>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      const docs: Document[] = [];

      for (const doc of this.documents.values()) {
        if (matchFilter(doc, filter)) {
          docs.push(doc);
        }
      }

      if (docs.length === 0) {
        if (options?.upsert === true) {
          const baseDoc: Document = { _id: generateObjectId() } as Document;

          if (update.$set !== undefined) {
            Object.assign(baseDoc, update.$set);
          }

          for (const [key, value] of Object.entries(filter)) {
            if (!key.startsWith("$") && typeof value !== "object") {
              (baseDoc as Record<string, unknown>)[key] = value;
            }
          }

          const validated = this.validate(this.excludeId(baseDoc));
          const newDoc: Document = { ...validated, _id: baseDoc._id } as Document;

          this.indexManager.validateInsert(newDoc);

          const record = createInsertRecord(newDoc);
          appendToFile(this.filePath, record);

          this.documents.set(newDoc._id, newDoc);
          this.indexManager.addDocument(newDoc);
          this.totalOps++;
          this.liveOps++;

          await this.maybeCompact();

          return { matchedCount: 0, modifiedCount: 0, upsertedId: newDoc._id };
        }

        return { matchedCount: 0, modifiedCount: 0 };
      }

      let modifiedCount = 0;

      for (const doc of docs) {
        const { updated: baseUpdated, delta, deleted } = applyUpdate(doc, update);

        const validated = this.validate(this.excludeId(baseUpdated));
        const updated: Document = { ...validated, _id: doc._id } as Document;

        this.indexManager.validateUpdate(doc, updated);

        const record = createUpdateRecord(doc._id, delta, deleted);
        appendToFile(this.filePath, record);

        this.documents.set(doc._id, updated);
        this.indexManager.updateDocument(doc, updated);
        this.totalOps++;
        modifiedCount++;
      }

      await this.maybeCompact();

      return { matchedCount: docs.length, modifiedCount };
    });
  }

  async replaceOne(
    filter: Filter<T>,
    replacement: T,
    options?: UpdateOptions
  ): Promise<ReplaceResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      let doc: Document | undefined;

      for (const d of this.documents.values()) {
        if (matchFilter(d, filter)) {
          doc = d;
          break;
        }
      }

      if (doc === undefined) {
        if (options?.upsert === true) {
          const id = generateObjectId();
          const baseDoc: Document = { ...replacement, _id: id } as Document;

          const validated = this.validate(this.excludeId(baseDoc));
          const newDoc: Document = { ...validated, _id: id } as Document;

          this.indexManager.validateInsert(newDoc);

          const record = createInsertRecord(newDoc);
          appendToFile(this.filePath, record);

          this.documents.set(id, newDoc);
          this.indexManager.addDocument(newDoc);
          this.totalOps++;
          this.liveOps++;

          await this.maybeCompact();

          return { matchedCount: 0, modifiedCount: 0, upsertedId: id };
        }

        return { matchedCount: 0, modifiedCount: 0 };
      }

      const baseReplaced = applyReplacement(doc, replacement as Record<string, unknown>);

      const validated = this.validate(this.excludeId(baseReplaced));
      const replaced: Document = { ...validated, _id: doc._id } as Document;

      this.indexManager.validateUpdate(doc, replaced);

      const record = createReplaceRecord(replaced);
      appendToFile(this.filePath, record);

      this.documents.set(doc._id, replaced);
      this.indexManager.updateDocument(doc, replaced);
      this.totalOps++;

      await this.maybeCompact();

      return { matchedCount: 1, modifiedCount: 1 };
    });
  }

  async deleteOne(filter: Filter<T>): Promise<DeleteResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      let doc: Document | undefined;

      for (const d of this.documents.values()) {
        if (matchFilter(d, filter)) {
          doc = d;
          break;
        }
      }

      if (doc === undefined) {
        return { deletedCount: 0 };
      }

      const record = createDeleteRecord(doc._id);
      appendToFile(this.filePath, record);

      this.indexManager.removeDocument(doc);
      this.documents.delete(doc._id);
      this.totalOps++;
      this.liveOps--;

      await this.maybeCompact();

      return { deletedCount: 1 };
    });
  }

  async deleteMany(filter: Filter<T>): Promise<DeleteResult> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      const toDelete: Document[] = [];

      for (const doc of this.documents.values()) {
        if (matchFilter(doc, filter)) {
          toDelete.push(doc);
        }
      }

      for (const doc of toDelete) {
        const record = createDeleteRecord(doc._id);
        appendToFile(this.filePath, record);

        this.indexManager.removeDocument(doc);
        this.documents.delete(doc._id);
        this.totalOps++;
        this.liveOps--;
      }

      await this.maybeCompact();

      return { deletedCount: toDelete.length };
    });
  }

  async countDocuments(filter?: Filter<T>): Promise<number> {
    this.ensureLoaded();

    if (filter === undefined || Object.keys(filter).length === 0) {
      return this.documents.size;
    }

    let count = 0;
    for (const doc of this.documents.values()) {
      if (matchFilter(doc, filter)) {
        count++;
      }
    }

    return count;
  }

  async distinct<K extends keyof T>(field: K, filter?: Filter<T>): Promise<Array<T[K]>> {
    this.ensureLoaded();

    const values = new Set<unknown>();

    for (const doc of this.documents.values()) {
      if (filter !== undefined && !matchFilter(doc, filter)) {
        continue;
      }

      const value = getNestedValue(doc, field as string);
      if (value !== undefined) {
        values.add(value);
      }
    }

    return Array.from(values) as Array<T[K]>;
  }

  async createIndex(spec: IndexSpec, options?: IndexOptions): Promise<string> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      const name = this.indexManager.createIndex(spec, options);
      this.indexManager.rebuild(this.documents);
      this.indexManager.save();
      return name;
    });
  }

  async dropIndex(name: string): Promise<boolean> {
    this.ensureLoaded();

    return this.writeQueue.enqueue(async () => {
      return this.indexManager.dropIndex(name);
    });
  }

  async listIndexes(): Promise<IndexDefinition[]> {
    this.ensureLoaded();
    return this.indexManager.listIndexes();
  }

  async drop(): Promise<void> {
    this.ensureNotDropped();

    return this.writeQueue.enqueue(async () => {
      deleteCollectionFile(this.filePath);
      this.indexManager.clear();
      this.documents.clear();
      this.dropped = true;
    });
  }

  async compact(): Promise<void> {
    this.ensureLoaded();

    if (this.header === null) {
      return;
    }

    compactCollection(this.filePath, this.header, this.documents);
    this.totalOps = this.documents.size;
    this.liveOps = this.documents.size;
    this.indexManager.save();
  }
}
