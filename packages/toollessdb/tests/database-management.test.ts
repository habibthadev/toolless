import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("Database management", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-dbmgmt-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("dropCollection — file cleanup", () => {
    it("removes .tdb file when collection was loaded in this session", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      const col = db.collection("users");
      await col.insertOne({ name: "Alice" });

      const dbPath = path.join(tempDir, "mydb.tdb");
      const collFile = path.join(dbPath, "users.tdb");
      expect(fs.existsSync(collFile)).toBe(true);

      await db.dropCollection("users");
      expect(fs.existsSync(collFile)).toBe(false);
      await client.close();
    });

    it("removes .tdb file when collection was NEVER loaded in this session", async () => {
      const client1 = createClient(tempDir);
      await client1
        .db("mydb")
        .collection("orphan")
        .insertMany([{ v: 1 }, { v: 2 }]);
      await client1.close();

      const client2 = createClient(tempDir);
      const db2 = client2.db("mydb");

      const dbPath = path.join(tempDir, "mydb.tdb");
      const collFile = path.join(dbPath, "orphan.tdb");
      expect(fs.existsSync(collFile)).toBe(true);

      await db2.dropCollection("orphan");
      expect(fs.existsSync(collFile)).toBe(false);
      await client2.close();
    });

    it("updates listCollections after drop of unloaded collection", async () => {
      const client1 = createClient(tempDir);
      await client1.db("mydb").collection("ghost").insertOne({ x: 1 });
      await client1.db("mydb").collection("keep").insertOne({ x: 2 });
      await client1.close();

      const client2 = createClient(tempDir);
      const db2 = client2.db("mydb");
      await db2.dropCollection("ghost");
      const collections = await db2.listCollections();
      expect(collections).not.toContain("ghost");
      expect(collections).toContain("keep");
      await client2.close();
    });

    it("returns true when dropping existing collection", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      await db.collection("c").insertOne({ v: 1 });
      const result = await db.dropCollection("c");
      expect(result).toBe(true);
      await client.close();
    });

    it("returns false when dropping nonexistent collection", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      const result = await db.dropCollection("nonexistent");
      expect(result).toBe(false);
      await client.close();
    });

    it("collection starts empty after drop and re-access", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      const col = db.collection("c");
      await col.insertOne({ v: 1 });
      await db.dropCollection("c");

      // After drop, accessing the same name creates a fresh empty collection
      const col2 = db.collection("c");
      const doc = await col2.findOne({} as never);
      expect(doc).toBeNull();
      const count = await col2.countDocuments();
      expect(count).toBe(0);
      await client.close();
    });
  });

  describe("listCollections", () => {
    it("returns empty array for new database", async () => {
      const client = createClient(tempDir);
      const db = client.db("fresh");
      const collections = await db.listCollections();
      expect(collections).toEqual([]);
      await client.close();
    });

    it("reflects all created collections", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      await db.collection("a").insertOne({ v: 1 });
      await db.collection("b").insertOne({ v: 2 });
      await db.collection("c").insertOne({ v: 3 });
      const collections = await db.listCollections();
      expect(collections.sort()).toEqual(["a", "b", "c"]);
      await client.close();
    });

    it("persists collection list across restart", async () => {
      const client1 = createClient(tempDir);
      await client1.db("mydb").collection("one").insertOne({ v: 1 });
      await client1.db("mydb").collection("two").insertOne({ v: 2 });
      await client1.close();

      const client2 = createClient(tempDir);
      const collections = await client2.db("mydb").listCollections();
      expect(collections.sort()).toEqual(["one", "two"]);
      await client2.close();
    });

    it("does not list dropped collections", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      await db.collection("live").insertOne({ v: 1 });
      await db.collection("dead").insertOne({ v: 2 });
      await db.dropCollection("dead");
      const collections = await db.listCollections();
      expect(collections).toContain("live");
      expect(collections).not.toContain("dead");
      await client.close();
    });
  });

  describe("multiple databases", () => {
    it("databases are isolated from each other", async () => {
      const client = createClient(tempDir);
      await client.db("db1").collection("c").insertOne({ _id: "shared-id", v: 1 });
      await client.db("db2").collection("c").insertOne({ _id: "shared-id", v: 2 });

      const doc1 = await client.db("db1").collection("c").findOne({ _id: "shared-id" });
      const doc2 = await client.db("db2").collection("c").findOne({ _id: "shared-id" });
      expect(doc1?.v).toBe(1);
      expect(doc2?.v).toBe(2);
      await client.close();
    });

    it("client.db() returns the same Database instance for the same name", async () => {
      const client = createClient(tempDir);
      const db1 = client.db("mydb");
      const db2 = client.db("mydb");
      expect(db1).toBe(db2);
      await client.close();
    });
  });

  describe("client lifecycle", () => {
    it("closed client throws on db()", async () => {
      const client = createClient(tempDir);
      await client.close();
      expect(() => client.db("test")).toThrow();
    });

    it("close() is idempotent", async () => {
      const client = createClient(tempDir);
      await client.close();
      await expect(client.close()).resolves.toBeUndefined();
    });
  });

  describe("collection validation", () => {
    it("rejects invalid collection names", async () => {
      const client = createClient(tempDir);
      const db = client.db("mydb");
      expect(() => db.collection("")).toThrow();
      expect(() => db.collection("invalid name")).toThrow();
      expect(() => db.collection("../escape")).toThrow();
      await client.close();
    });

    it("rejects invalid database names", async () => {
      const client = createClient(tempDir);
      expect(() => client.db("")).toThrow();
      expect(() => client.db("has spaces")).toThrow();
      expect(() => client.db("../escape")).toThrow();
      await client.close();
    });
  });
});
