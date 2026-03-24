import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

interface TestDoc {
  name: string;
  age: number;
  city?: string;
  score?: number;
  nested?: { value: number };
  tags?: string[];
  active?: boolean;
  createdAt?: Date;
}

describe("Cursor", () => {
  let tmpDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-test-"));
    client = createClient({ path: tmpDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("sort()", () => {
    describe("single field sorting", () => {
      it("should sort by a single field ascending with 1", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Charlie", age: 30 },
          { name: "Alice", age: 25 },
          { name: "Bob", age: 35 },
        ]);

        const results = await collection.find({}).sort({ name: 1 }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
      });

      it('should sort by a single field ascending with "asc"', async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Charlie", age: 30 },
          { name: "Alice", age: 25 },
          { name: "Bob", age: 35 },
        ]);

        const results = await collection.find({}).sort({ name: "asc" }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
      });

      it("should sort by a single field descending with -1", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Charlie", age: 30 },
          { name: "Alice", age: 25 },
          { name: "Bob", age: 35 },
        ]);

        const results = await collection.find({}).sort({ name: -1 }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Charlie", "Bob", "Alice"]);
      });

      it('should sort by a single field descending with "desc"', async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Charlie", age: 30 },
          { name: "Alice", age: 25 },
          { name: "Bob", age: 35 },
        ]);

        const results = await collection.find({}).sort({ name: "desc" }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Charlie", "Bob", "Alice"]);
      });

      it("should sort numeric fields correctly", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 100 },
          { name: "Bob", age: 25 },
          { name: "Charlie", age: 5 },
        ]);

        const ascending = await collection.find({}).sort({ age: 1 }).toArray();
        expect(ascending.map((r) => r.age)).toEqual([5, 25, 100]);

        const descending = await collection.find({}).sort({ age: -1 }).toArray();
        expect(descending.map((r) => r.age)).toEqual([100, 25, 5]);
      });

      it("should handle null and undefined values in sorting", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25, city: "NYC" },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35, city: "LA" },
        ]);

        const results = await collection.find({}).sort({ city: 1 }).toArray();
        // Undefined values should come first in ascending order
        expect(results[0].name).toBe("Bob");
      });

      it("should sort boolean values correctly", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25, active: true },
          { name: "Bob", age: 30, active: false },
          { name: "Charlie", age: 35, active: true },
        ]);

        const results = await collection.find({}).sort({ active: 1 }).toArray();
        expect(results[0].active).toBe(false);
        expect(results[1].active).toBe(true);
        expect(results[2].active).toBe(true);
      });
    });

    describe("multi-field sorting", () => {
      it("should sort by multiple fields", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 30, city: "NYC" },
          { name: "Bob", age: 25, city: "NYC" },
          { name: "Charlie", age: 30, city: "LA" },
          { name: "Diana", age: 25, city: "LA" },
        ]);

        const results = await collection.find({}).sort({ age: 1, name: 1 }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Bob", "Diana", "Alice", "Charlie"]);
      });

      it("should sort by multiple fields with mixed directions", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 30, score: 85 },
          { name: "Bob", age: 30, score: 90 },
          { name: "Charlie", age: 25, score: 75 },
          { name: "Diana", age: 25, score: 95 },
        ]);

        const results = await collection.find({}).sort({ age: 1, score: -1 }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
      });

      it("should respect field order in multi-field sort", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 30, city: "NYC" },
          { name: "Bob", age: 30, city: "LA" },
          { name: "Charlie", age: 25, city: "NYC" },
        ]);

        const byAgeThenCity = await collection.find({}).sort({ age: 1, city: 1 }).toArray();
        expect(byAgeThenCity.map((r) => r.name)).toEqual(["Charlie", "Bob", "Alice"]);

        const byCityThenAge = await collection.find({}).sort({ city: 1, age: 1 }).toArray();
        expect(byCityThenAge.map((r) => r.name)).toEqual(["Bob", "Charlie", "Alice"]);
      });
    });

    describe("nested field sorting", () => {
      it("should sort by nested field values", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25, nested: { value: 30 } },
          { name: "Bob", age: 30, nested: { value: 10 } },
          { name: "Charlie", age: 35, nested: { value: 20 } },
        ]);

        const results = await collection.find({}).sort({ "nested.value": 1 }).toArray();

        expect(results.map((r) => r.name)).toEqual(["Bob", "Charlie", "Alice"]);
      });
    });
  });

  describe("limit()", () => {
    it("should limit results to specified count", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
        { name: "Diana", age: 40 },
        { name: "Eve", age: 45 },
      ]);

      const results = await collection.find({}).sort({ name: 1 }).limit(3).toArray();

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should return all documents if limit exceeds total", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const results = await collection.find({}).limit(10).toArray();

      expect(results).toHaveLength(2);
    });

    it("should return empty array when limit is 0", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const results = await collection.find({}).limit(0).toArray();

      expect(results).toHaveLength(0);
    });

    it("should limit to 1 document", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const results = await collection.find({}).sort({ age: -1 }).limit(1).toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Charlie");
    });
  });

  describe("skip()", () => {
    it("should skip specified number of documents", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
        { name: "Diana", age: 40 },
        { name: "Eve", age: 45 },
      ]);

      const results = await collection.find({}).sort({ name: 1 }).skip(2).toArray();

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.name)).toEqual(["Charlie", "Diana", "Eve"]);
    });

    it("should return empty array if skip exceeds total", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const results = await collection.find({}).skip(10).toArray();

      expect(results).toHaveLength(0);
    });

    it("should return all documents when skip is 0", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const results = await collection.find({}).skip(0).toArray();

      expect(results).toHaveLength(2);
    });

    it("should skip exactly to the last document", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const results = await collection.find({}).sort({ name: 1 }).skip(2).toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Charlie");
    });
  });

  describe("project()", () => {
    describe("include fields", () => {
      it("should include only specified fields with 1", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC", score: 85 }]);

        const results = await collection.find({}).project({ name: 1, age: 1 }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).toHaveProperty("age", 25);
        expect(results[0]).not.toHaveProperty("city");
        expect(results[0]).not.toHaveProperty("score");
      });

      it("should include only specified fields with true", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC" }]);

        const results = await collection.find({}).project({ name: true, city: true }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).toHaveProperty("city", "NYC");
        expect(results[0]).not.toHaveProperty("age");
      });

      it("should include _id by default in inclusion projection", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25 }]);

        const results = await collection.find({}).project({ name: 1 }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name");
      });
    });

    describe("exclude fields", () => {
      it("should exclude specified fields with 0", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC", score: 85 }]);

        const results = await collection.find({}).project({ city: 0, score: 0 }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).toHaveProperty("age", 25);
        expect(results[0]).not.toHaveProperty("city");
        expect(results[0]).not.toHaveProperty("score");
      });

      it("should exclude specified fields with false", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC" }]);

        const results = await collection.find({}).project({ age: false }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).toHaveProperty("city", "NYC");
        expect(results[0]).not.toHaveProperty("age");
      });
    });

    describe("_id special handling", () => {
      it("should exclude _id when explicitly set to 0", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25 }]);

        const results = await collection.find({}).project({ _id: 0, name: 1 }).toArray();

        expect(results[0]).not.toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
      });

      it("should exclude _id when explicitly set to false", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25 }]);

        const results = await collection.find({}).project({ _id: false, name: 1 }).toArray();

        expect(results[0]).not.toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
      });

      it("should allow _id: 0 with exclusion projection", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC" }]);

        const results = await collection.find({}).project({ _id: 0, city: 0 }).toArray();

        expect(results[0]).not.toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).toHaveProperty("age", 25);
        expect(results[0]).not.toHaveProperty("city");
      });

      it("should include _id when projection is exclusion only", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC" }]);

        const results = await collection.find({}).project({ city: 0 }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name");
        expect(results[0]).toHaveProperty("age");
        expect(results[0]).not.toHaveProperty("city");
      });
    });

    describe("mixed projection (special _id handling)", () => {
      it("should allow _id: 0 with inclusion projection", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25, city: "NYC" }]);

        const results = await collection.find({}).project({ _id: 0, name: 1, age: 1 }).toArray();

        expect(results[0]).not.toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).toHaveProperty("age", 25);
        expect(results[0]).not.toHaveProperty("city");
      });
    });

    describe("projection with missing fields", () => {
      it("should not include fields that do not exist on document", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([{ name: "Alice", age: 25 }]);

        const results = await collection.find({}).project({ name: 1, city: 1 }).toArray();

        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Alice");
        expect(results[0]).not.toHaveProperty("city");
      });
    });
  });

  describe("toArray()", () => {
    it("should return an empty array for no matches", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const results = await collection.find({ age: { $gt: 100 } }).toArray();

      expect(results).toEqual([]);
    });

    it("should return all matching documents", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const results = await collection.find({ age: { $gte: 30 } }).toArray();

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name).sort()).toEqual(["Bob", "Charlie"]);
    });

    it("should return documents with _id", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ name: "Alice", age: 25 });

      const results = await collection.find({}).toArray();

      expect(results[0]).toHaveProperty("_id");
      expect(typeof results[0]._id).toBe("string");
    });

    it("should be a terminal method that executes the query", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const cursor = collection.find({}).sort({ name: 1 }).limit(1);
      const results = await cursor.toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alice");
    });

    it("should cache results on repeated calls", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const cursor = collection.find({});
      const results1 = await cursor.toArray();
      const results2 = await cursor.toArray();

      expect(results1).toEqual(results2);
    });
  });

  describe("forEach()", () => {
    it("should iterate over all matching documents", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      await collection
        .find({})
        .sort({ name: 1 })
        .forEach((doc) => {
          names.push(doc.name);
        });

      expect(names).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should iterate over empty result set without errors", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      const count = { value: 0 };
      await collection.find({ name: "NonExistent" }).forEach(() => {
        count.value++;
      });

      expect(count.value).toBe(0);
    });

    it("should support async callback", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const names: string[] = [];
      await collection
        .find({})
        .sort({ name: 1 })
        .forEach(async (doc) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          names.push(doc.name);
        });

      expect(names).toEqual(["Alice", "Bob"]);
    });

    it("should respect limit when iterating", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      await collection
        .find({})
        .sort({ name: 1 })
        .limit(2)
        .forEach((doc) => {
          names.push(doc.name);
        });

      expect(names).toEqual(["Alice", "Bob"]);
    });

    it("should respect skip when iterating", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      await collection
        .find({})
        .sort({ name: 1 })
        .skip(1)
        .forEach((doc) => {
          names.push(doc.name);
        });

      expect(names).toEqual(["Bob", "Charlie"]);
    });
  });

  describe("count()", () => {
    it("should return the count of matching documents", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const count = await collection.find({}).count();

      expect(count).toBe(3);
    });

    it("should return 0 for no matches", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const count = await collection.find({ age: { $gt: 100 } }).count();

      expect(count).toBe(0);
    });

    it("should return count with filter applied", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const count = await collection.find({ age: { $gte: 30 } }).count();

      expect(count).toBe(2);
    });

    it("should respect skip in count", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const count = await collection.find({}).skip(1).count();

      expect(count).toBe(2);
    });

    it("should respect limit in count", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const count = await collection.find({}).limit(2).count();

      expect(count).toBe(2);
    });

    it("should count correctly on empty collection", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      const count = await collection.find({}).count();

      expect(count).toBe(0);
    });
  });

  describe("Async iteration (for await...of)", () => {
    it("should iterate over all documents with for await...of", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      for await (const doc of collection.find({}).sort({ name: 1 })) {
        names.push(doc.name);
      }

      expect(names).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should iterate over empty result set without errors", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      const results: TestDoc[] = [];
      for await (const doc of collection.find({ name: "NonExistent" })) {
        results.push(doc);
      }

      expect(results).toEqual([]);
    });

    it("should respect limit during async iteration", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      for await (const doc of collection.find({}).sort({ name: 1 }).limit(2)) {
        names.push(doc.name);
      }

      expect(names).toEqual(["Alice", "Bob"]);
    });

    it("should respect skip during async iteration", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      for await (const doc of collection.find({}).sort({ name: 1 }).skip(1)) {
        names.push(doc.name);
      }

      expect(names).toEqual(["Bob", "Charlie"]);
    });

    it("should respect projection during async iteration", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([{ name: "Alice", age: 25, city: "NYC" }]);

      for await (const doc of collection.find({}).project({ name: 1 })) {
        expect(doc).toHaveProperty("_id");
        expect(doc).toHaveProperty("name");
        expect(doc).not.toHaveProperty("age");
        expect(doc).not.toHaveProperty("city");
      }
    });

    it("should support breaking out of async iteration early", async () => {
      const db = client.db("testdb");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
        { name: "Charlie", age: 35 },
      ]);

      const names: string[] = [];
      for await (const doc of collection.find({}).sort({ name: 1 })) {
        names.push(doc.name);
        if (names.length >= 2) break;
      }

      expect(names).toEqual(["Alice", "Bob"]);
    });
  });

  describe("Chaining combinations", () => {
    describe("sort + limit", () => {
      it("should apply sort before limit", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Charlie", age: 35 },
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Diana", age: 40 },
        ]);

        const results = await collection.find({}).sort({ age: -1 }).limit(2).toArray();

        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name)).toEqual(["Diana", "Charlie"]);
      });

      it("should work with chaining in different order", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Charlie", age: 35 },
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
        ]);

        const results = await collection.find({}).limit(2).sort({ name: 1 }).toArray();

        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name)).toEqual(["Alice", "Bob"]);
      });
    });

    describe("skip + limit", () => {
      it("should skip first then limit", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
          { name: "Diana", age: 40 },
          { name: "Eve", age: 45 },
        ]);

        const results = await collection.find({}).sort({ name: 1 }).skip(1).limit(2).toArray();

        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name)).toEqual(["Bob", "Charlie"]);
      });

      it("should implement pagination correctly", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "A", age: 1 },
          { name: "B", age: 2 },
          { name: "C", age: 3 },
          { name: "D", age: 4 },
          { name: "E", age: 5 },
        ]);

        const pageSize = 2;

        const page1 = await collection.find({}).sort({ name: 1 }).skip(0).limit(pageSize).toArray();
        expect(page1.map((r) => r.name)).toEqual(["A", "B"]);

        const page2 = await collection.find({}).sort({ name: 1 }).skip(2).limit(pageSize).toArray();
        expect(page2.map((r) => r.name)).toEqual(["C", "D"]);

        const page3 = await collection.find({}).sort({ name: 1 }).skip(4).limit(pageSize).toArray();
        expect(page3.map((r) => r.name)).toEqual(["E"]);
      });
    });

    describe("sort + skip + limit", () => {
      it("should apply operations in correct order: filter -> sort -> skip -> limit", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
          { name: "Diana", age: 40 },
          { name: "Eve", age: 45 },
        ]);

        const results = await collection
          .find({ age: { $gte: 30 } })
          .sort({ age: 1 })
          .skip(1)
          .limit(2)
          .toArray();

        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name)).toEqual(["Charlie", "Diana"]);
      });
    });

    describe("sort + skip + limit + project", () => {
      it("should apply all cursor operations correctly", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25, city: "NYC" },
          { name: "Bob", age: 30, city: "LA" },
          { name: "Charlie", age: 35, city: "Chicago" },
          { name: "Diana", age: 40, city: "Miami" },
          { name: "Eve", age: 45, city: "Seattle" },
        ]);

        const results = await collection
          .find({})
          .sort({ age: 1 })
          .skip(1)
          .limit(3)
          .project({ name: 1, city: 1 })
          .toArray();

        expect(results).toHaveLength(3);
        expect(results[0]).toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Bob");
        expect(results[0]).toHaveProperty("city", "LA");
        expect(results[0]).not.toHaveProperty("age");

        expect(results[1].name).toBe("Charlie");
        expect(results[2].name).toBe("Diana");
      });

      it("should work with complex filter and all cursor operations", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25, city: "NYC", score: 85 },
          { name: "Bob", age: 30, city: "LA", score: 90 },
          { name: "Charlie", age: 35, city: "NYC", score: 75 },
          { name: "Diana", age: 40, city: "LA", score: 95 },
          { name: "Eve", age: 45, city: "NYC", score: 80 },
        ]);

        const results = await collection
          .find({ city: "NYC" })
          .sort({ score: -1 })
          .skip(1)
          .limit(1)
          .project({ _id: 0, name: 1, score: 1 })
          .toArray();

        expect(results).toHaveLength(1);
        expect(results[0]).not.toHaveProperty("_id");
        expect(results[0]).toHaveProperty("name", "Eve");
        expect(results[0]).toHaveProperty("score", 80);
        expect(results[0]).not.toHaveProperty("city");
        expect(results[0]).not.toHaveProperty("age");
      });

      it("should handle chaining methods in any order", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
          { name: "Diana", age: 40 },
        ]);

        const results1 = await collection
          .find({})
          .project({ name: 1 })
          .limit(2)
          .skip(1)
          .sort({ age: 1 })
          .toArray();

        const results2 = await collection
          .find({})
          .sort({ age: 1 })
          .skip(1)
          .limit(2)
          .project({ name: 1 })
          .toArray();

        expect(results1.map((r) => r.name)).toEqual(results2.map((r) => r.name));
      });
    });

    describe("multiple terminal methods on same cursor", () => {
      it("should allow calling multiple terminal methods on same cursor", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        await collection.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const cursor = collection.find({}).sort({ name: 1 });

        const count = await cursor.count();
        const array = await cursor.toArray();

        expect(count).toBe(3);
        expect(array).toHaveLength(3);
      });
    });

    describe("empty collection handling", () => {
      it("should handle all operations on empty collection", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        const results = await collection
          .find({})
          .sort({ name: 1 })
          .skip(10)
          .limit(5)
          .project({ name: 1 })
          .toArray();

        expect(results).toEqual([]);
      });
    });

    describe("large dataset handling", () => {
      it("should handle larger datasets with all cursor operations", async () => {
        const db = client.db("testdb");
        const collection = db.collection<TestDoc>("users");

        const docs = Array.from({ length: 100 }, (_, i) => ({
          name: `User${String(i).padStart(3, "0")}`,
          age: 20 + (i % 50),
        }));

        await collection.insertMany(docs);

        const results = await collection
          .find({ age: { $gte: 40 } })
          .sort({ name: -1 })
          .skip(5)
          .limit(10)
          .toArray();

        expect(results).toHaveLength(10);
        // Verify sorted descending
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].name > results[i].name).toBe(true);
        }
      });
    });
  });
});
