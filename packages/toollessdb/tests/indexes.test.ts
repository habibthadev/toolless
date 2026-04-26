import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient, DuplicateKeyError } from "../src/index";

describe("Index management", () => {
  let tempDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-idx-"));
    client = createClient({ path: tempDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("createIndex()", () => {
    it("returns the index name", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ email: 1 });
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });

    it("generated name encodes field and direction", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ score: -1 });
      expect(name).toContain("score");
    });

    it("accepts a custom name", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ email: 1 }, { name: "email_idx" });
      expect(name).toBe("email_idx");
    });

    it("creating the same spec twice returns the same name (idempotent)", async () => {
      const col = client.db("db").collection("c");
      const name1 = await col.createIndex({ email: 1 });
      const name2 = await col.createIndex({ email: 1 });
      expect(name1).toBe(name2);
    });

    it("unique index prevents duplicate values", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ email: 1 }, { unique: true });
      await col.insertOne({ email: "alice@example.com", name: "Alice" });
      await expect(
        col.insertOne({ email: "alice@example.com", name: "Alice2" })
      ).rejects.toBeInstanceOf(DuplicateKeyError);
    });

    it("unique index allows different values", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ email: 1 }, { unique: true });
      await col.insertOne({ email: "alice@example.com" });
      await expect(col.insertOne({ email: "bob@example.com" })).resolves.toBeDefined();
    });

    it("non-unique index allows duplicate values", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ tag: 1 });
      await col.insertOne({ tag: "red" });
      await expect(col.insertOne({ tag: "red" })).resolves.toBeDefined();
    });

    it("creates compound index across multiple fields", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ firstName: 1, lastName: 1 });
      expect(name).toContain("firstName");
      expect(name).toContain("lastName");
    });

    it("compound unique index enforces uniqueness on combined fields", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ first: 1, last: 1 }, { unique: true });
      await col.insertOne({ first: "Alice", last: "Smith" });
      // same combination → reject
      await expect(col.insertOne({ first: "Alice", last: "Smith" })).rejects.toBeInstanceOf(
        DuplicateKeyError
      );
      // different combination → allow
      await expect(col.insertOne({ first: "Alice", last: "Jones" })).resolves.toBeDefined();
    });
  });

  describe("listIndexes()", () => {
    it("returns empty array when no indexes are defined", async () => {
      const col = client.db("db").collection("c");
      const indexes = await col.listIndexes();
      expect(indexes).toEqual([]);
    });

    it("lists all created indexes", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ email: 1 }, { unique: true });
      await col.createIndex({ score: -1 });

      const indexes = await col.listIndexes();
      expect(indexes).toHaveLength(2);
    });

    it("each index definition has name, spec, and unique fields", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ email: 1 }, { unique: true });
      const indexes = await col.listIndexes();
      expect(indexes[0]).toHaveProperty("name");
      expect(indexes[0]).toHaveProperty("spec");
      expect(indexes[0]).toHaveProperty("unique");
      expect(indexes[0]?.unique).toBe(true);
    });

    it("unique:false is set for non-unique indexes", async () => {
      const col = client.db("db").collection("c");
      await col.createIndex({ tag: 1 });
      const indexes = await col.listIndexes();
      expect(indexes[0]?.unique).toBe(false);
    });
  });

  describe("dropIndex()", () => {
    it("returns true when index exists and is dropped", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ email: 1 });
      const result = await col.dropIndex(name);
      expect(result).toBe(true);
    });

    it("returns false when index does not exist", async () => {
      const col = client.db("db").collection("c");
      const result = await col.dropIndex("nonexistent_idx");
      expect(result).toBe(false);
    });

    it("after drop, the index is no longer listed", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ email: 1 });
      await col.dropIndex(name);
      const indexes = await col.listIndexes();
      expect(indexes).toHaveLength(0);
    });

    it("after dropping unique index, duplicates are allowed again", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ email: 1 }, { unique: true });
      await col.insertOne({ email: "a@test.com" });
      await col.dropIndex(name);
      // Should now allow duplicate
      await expect(col.insertOne({ email: "a@test.com" })).resolves.toBeDefined();
    });
  });

  describe("index with dot-notation fields", () => {
    it("can index a nested field", async () => {
      const col = client.db("db").collection("c");
      const name = await col.createIndex({ "user.email": 1 }, { unique: true });
      expect(name).toContain("user");
      await col.insertOne({ user: { email: "a@test.com" } });
      await expect(col.insertOne({ user: { email: "a@test.com" } })).rejects.toBeInstanceOf(
        DuplicateKeyError
      );
    });
  });
});
