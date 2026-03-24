import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { execa } from "execa";
import { createClient } from "../src";

const TEST_DIR = path.join(process.cwd(), ".test-cli");
const CLI_BIN = path.join(process.cwd(), "dist/cli.js");

beforeAll(() => {
  process.setMaxListeners(30);
});

describe("CLI Edge Cases", () => {
  beforeEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("Path Handling", () => {
    it("should not create database directories in wrong path", async () => {
      const wrongDir = path.join(TEST_DIR, "wrong");
      await fs.mkdir(wrongDir, { recursive: true });

      await execa("node", [CLI_BIN, "list", "-p", wrongDir], { reject: false });

      const wrongDbPath = path.join(wrongDir, "somedb.tdb");
      const exists = await fs
        .access(wrongDbPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(false);
    });

    it("should handle non-existent database path gracefully", async () => {
      const nonExistent = path.join(TEST_DIR, "nonexistent");

      const result = await execa("node", [CLI_BIN, "query", "testdb", "users", "-p", nonExistent], {
        reject: false,
      });

      expect(result.exitCode).not.toBe(0);
      const dbPath = path.join(nonExistent, "testdb.tdb");
      const exists = await fs
        .access(dbPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(false);
    });

    it("should handle relative paths correctly", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertOne({ name: "Alice" });
      await client.close();

      const result = await execa(
        "node",
        [CLI_BIN, "list", "-p", path.relative(process.cwd(), dbPath)],
        { reject: false, cwd: process.cwd() }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("testdb");
    });
  });

  describe("Query Command Edge Cases", () => {
    it("should handle empty collection", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      await db.collection("empty");
      await client.close();

      const result = await execa("node", [CLI_BIN, "query", "testdb", "empty", "-p", dbPath], {
        reject: false,
      });

      expect(result.exitCode).toBe(0);
      const output = (result.stdout + result.stderr).toLowerCase();
      expect(output).toMatch(/no documents|0/i);
    });

    it("should handle invalid JSON filter", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertOne({ name: "Alice" });
      await client.close();

      const result = await execa(
        "node",
        [CLI_BIN, "query", "testdb", "users", "-p", dbPath, "-f", "invalid{json}"],
        { reject: false }
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toLowerCase()).toMatch(/json|parse|invalid/i);
    });

    it("should handle complex nested queries", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertMany([
        { name: "Alice", age: 30, role: "admin" },
        { name: "Bob", age: 25, role: "user" },
        { name: "Charlie", age: 35, role: "admin" },
      ]);
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "query",
        "testdb",
        "users",
        "-p",
        dbPath,
        "-f",
        JSON.stringify({ $and: [{ role: "admin" }, { age: { $gte: 30 } }] }),
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Alice");
      expect(result.stdout).toContain("Charlie");
      expect(result.stdout).not.toContain("Bob");
    });

    it("should respect limit and skip options", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("numbers");
      await coll.insertMany([{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }]);
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "query",
        "testdb",
        "numbers",
        "-p",
        dbPath,
        "-l",
        "2",
        "-k",
        "2",
        "-s",
        JSON.stringify({ n: 1 }),
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("3");
      expect(result.stdout).toContain("4");
      expect(result.stdout).not.toContain("│ 1");
      expect(result.stdout).not.toContain("│ 5");
    });

    it("should output valid JSON with --json flag", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertOne({ name: "Alice", age: 30 });
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "query",
        "testdb",
        "users",
        "-p",
        dbPath,
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe("Alice");
      expect(parsed[0].age).toBe(30);
    });

    it("should return count with --count flag", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertMany([{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]);
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "query",
        "testdb",
        "users",
        "-p",
        dbPath,
        "--count",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("3");
    });
  });

  describe("Insert Command Edge Cases", () => {
    it("should handle invalid JSON data", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const result = await execa(
        "node",
        [CLI_BIN, "insert", "testdb", "users", "-p", dbPath, "-d", "not-json"],
        { reject: false }
      );

      expect(result.exitCode).not.toBe(0);
    });

    it("should insert array of documents", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const data = [{ name: "Alice" }, { name: "Bob" }];
      const result = await execa("node", [
        CLI_BIN,
        "insert",
        "testdb",
        "users",
        JSON.stringify(data),
        "-p",
        dbPath,
      ]);

      expect(result.exitCode).toBe(0);

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const docs = await db.collection("users").find({}).toArray();
      expect(docs.length).toBe(2);
      await client.close();
    });
  });

  describe("Update Command Edge Cases", () => {
    it("should handle non-existent documents", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      await db.collection("users").insertOne({ name: "Alice" });
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "update",
        "testdb",
        "users",
        JSON.stringify({ name: "NonExistent" }),
        JSON.stringify({ $set: { updated: true } }),
        "-p",
        dbPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/0|no|none/i);
    });

    it("should validate update operators", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      await db.collection("users").insertOne({ name: "Alice", count: 5 });
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "update",
        "testdb",
        "users",
        JSON.stringify({ name: "Alice" }),
        JSON.stringify({ count: 10 }),
        "-p",
        dbPath,
      ]);

      expect(result.exitCode).toBe(0);
    });
  });

  describe("Delete Command Edge Cases", () => {
    it("should handle delete with no matches", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      await db.collection("users").insertOne({ name: "Alice" });
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "delete",
        "testdb",
        "users",
        JSON.stringify({ name: "NonExistent" }),
        "-p",
        dbPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/0|no|none/i);
    });

    it("should delete all documents matching filter", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertMany([{ role: "admin" }, { role: "admin" }, { role: "user" }]);
      await client.close();

      const result = await execa("node", [
        CLI_BIN,
        "delete",
        "testdb",
        "users",
        JSON.stringify({ role: "admin" }),
        "-p",
        dbPath,
        "--many",
      ]);

      expect(result.exitCode).toBe(0);

      const client2 = createClient({ path: dbPath });
      const remaining = await client2.db("testdb").collection("users").countDocuments({});
      expect(remaining).toBe(1);
      await client2.close();
    });
  });

  describe("Export/Import Edge Cases", () => {
    it("should handle export of empty collection", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      await client.db("testdb").collection("empty");
      await client.close();

      const outputFile = path.join(TEST_DIR, "export.json");
      const result = await execa("node", [
        CLI_BIN,
        "export",
        "testdb",
        "empty",
        "-p",
        dbPath,
        "-o",
        outputFile,
      ]);

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile(outputFile, "utf-8");
      const data = JSON.parse(content);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it("should handle import of invalid JSON file", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const inputFile = path.join(TEST_DIR, "invalid.json");
      await fs.writeFile(inputFile, "not valid json");

      const result = await execa(
        "node",
        [CLI_BIN, "import", "testdb", "users", "-p", dbPath, "-i", inputFile],
        { reject: false }
      );

      expect(result.exitCode).not.toBe(0);
    });

    it("should preserve data types on export/import", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      await db.collection("data").insertMany([
        { str: "text", num: 42, bool: true, arr: [1, 2, 3], obj: { nested: "value" } },
        { str: "more", num: 3.14, bool: false, arr: [], obj: {} },
      ]);
      await client.close();

      const exportFile = path.join(TEST_DIR, "export.json");
      await execa("node", [CLI_BIN, "export", "testdb", "data", "-p", dbPath, "-o", exportFile]);

      const dbPath2 = path.join(TEST_DIR, "data2");
      await fs.mkdir(dbPath2, { recursive: true });

      await execa("node", [CLI_BIN, "import", "testdb", "data", exportFile, "-p", dbPath2]);

      const client2 = createClient({ path: dbPath2 });
      const docs = await client2
        .db("testdb")
        .collection("data")
        .find({})
        .sort({ num: 1 })
        .toArray();

      expect(docs[0].str).toBe("more");
      expect(docs[0].num).toBe(3.14);
      expect(docs[0].bool).toBe(false);
      expect(docs[0].arr).toEqual([]);
      expect(docs[0].obj).toEqual({});

      expect(docs[1].str).toBe("text");
      expect(docs[1].num).toBe(42);
      expect(docs[1].bool).toBe(true);
      expect(docs[1].arr).toEqual([1, 2, 3]);
      expect(docs[1].obj).toEqual({ nested: "value" });

      await client2.close();
    });
  });

  describe("Stats Command", () => {
    it("should show stats for database with multiple collections", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      await db.collection("users").insertMany([{ a: 1 }, { b: 2 }]);
      await db.collection("posts").insertMany([{ c: 3 }, { d: 4 }, { e: 5 }]);
      await client.close();

      const result = await execa("node", [CLI_BIN, "stats", "testdb", "-p", dbPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("users");
      expect(result.stdout).toContain("posts");
      expect(result.stdout).toMatch(/2/);
      expect(result.stdout).toMatch(/3/);
    });
  });

  describe("Index Command", () => {
    it("should create and list indexes", async () => {
      const dbPath = path.join(TEST_DIR, "data");
      await fs.mkdir(dbPath, { recursive: true });

      const client = createClient({ path: dbPath });
      const db = client.db("testdb");
      const coll = db.collection("users");
      await coll.insertOne({ email: "test@example.com" });
      await client.close();

      const createResult = await execa("node", [
        CLI_BIN,
        "index",
        "create",
        "testdb",
        "users",
        JSON.stringify({ email: 1 }),
        "-p",
        dbPath,
      ]);

      expect(createResult.exitCode).toBe(0);

      const listResult = await execa("node", [
        CLI_BIN,
        "index",
        "list",
        "testdb",
        "users",
        "-p",
        dbPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain("email");
    });
  });
});
