import * as fs from "node:fs";
import * as path from "node:path";
import type { z } from "zod";
import { Collection, type CollectionOptions } from "./collection";
import type { DatabaseMeta } from "./types/index";
import { atomicWrite, deleteCollectionFile } from "./storage/ndjson";
import { validateName } from "./client";

const META_FILE_NAME = "_meta.json";

export class Database {
  readonly name: string;
  private readonly dbPath: string;
  private collections: Map<string, Collection<Record<string, unknown>>> = new Map();
  private meta: DatabaseMeta;

  constructor(name: string, dbPath: string) {
    this.name = name;
    this.dbPath = dbPath;
    this.meta = this.loadOrCreateMeta();
  }

  private loadOrCreateMeta(): DatabaseMeta {
    const metaPath = path.join(this.dbPath, META_FILE_NAME);

    if (fs.existsSync(metaPath)) {
      try {
        const content = fs.readFileSync(metaPath, "utf-8");
        return JSON.parse(content) as DatabaseMeta;
      } catch {
        // Fall through to create new meta
      }
    }

    const meta: DatabaseMeta = {
      name: this.name,
      version: 1,
      created: Date.now(),
      collections: [],
    };

    this.saveMeta(meta);
    return meta;
  }

  private saveMeta(meta: DatabaseMeta): void {
    const metaPath = path.join(this.dbPath, META_FILE_NAME);
    atomicWrite(metaPath, JSON.stringify(meta, null, 2));
  }

  collection<T extends Record<string, unknown> = Record<string, unknown>>(
    name: string
  ): Collection<T>;

  collection<S extends z.ZodType>(
    name: string,
    options: CollectionOptions<S>
  ): Collection<z.infer<S>>;

  collection<T extends Record<string, unknown>>(
    name: string,
    options?: CollectionOptions<z.ZodType>
  ): Collection<T> {
    validateName(name, "Collection");

    const existing = this.collections.get(name);
    if (existing !== undefined) {
      return existing as Collection<T>;
    }

    const coll = new Collection<T>(name, this.dbPath, options);
    this.collections.set(name, coll as Collection<Record<string, unknown>>);

    if (!this.meta.collections.includes(name)) {
      this.meta.collections.push(name);
      this.saveMeta(this.meta);
    }

    return coll;
  }

  async listCollections(): Promise<string[]> {
    return [...this.meta.collections];
  }

  async dropCollection(name: string): Promise<boolean> {
    validateName(name, "Collection");

    const coll = this.collections.get(name);
    if (coll !== undefined) {
      await coll.drop();
      this.collections.delete(name);
    } else {
      const collFilePath = path.join(this.dbPath, `${name}.tdb`);
      deleteCollectionFile(collFilePath);
    }

    const index = this.meta.collections.indexOf(name);
    if (index !== -1) {
      this.meta.collections.splice(index, 1);
      this.saveMeta(this.meta);
      return true;
    }

    return false;
  }
}
