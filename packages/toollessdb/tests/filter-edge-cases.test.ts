import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("Filter edge cases", () => {
  let tempDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-filter-"));
    client = createClient({ path: tempDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("empty filter matches all", () => {
    it("find({}) returns all documents", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      const docs = await col.find({}).toArray();
      expect(docs).toHaveLength(3);
    });

    it("findOne({}) returns first document", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }]);
      const doc = await col.findOne({});
      expect(doc).not.toBeNull();
    });
  });

  describe("$eq", () => {
    it("matches exact boolean value", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ active: true }, { active: false }]);
      const results = await col.find({ active: { $eq: true } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.active).toBe(true);
    });

    it("matches null value", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: null }, { v: 1 }]);
      const results = await col.find({ v: { $eq: null } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBeNull();
    });
  });

  describe("$ne", () => {
    it("excludes exact match", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      const results = await col.find({ v: { $ne: 2 } } as never).toArray();
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.v).sort()).toEqual([1, 3]);
    });
  });

  describe("comparison operators", () => {
    it("$gt selects strictly greater", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ n: 1 }, { n: 5 }, { n: 10 }]);
      const results = await col.find({ n: { $gt: 5 } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.n).toBe(10);
    });

    it("$gte selects greater or equal", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ n: 1 }, { n: 5 }, { n: 10 }]);
      const results = await col.find({ n: { $gte: 5 } } as never).toArray();
      expect(results).toHaveLength(2);
    });

    it("$lt selects strictly less", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ n: 1 }, { n: 5 }, { n: 10 }]);
      const results = await col.find({ n: { $lt: 5 } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.n).toBe(1);
    });

    it("$lte selects less or equal", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ n: 1 }, { n: 5 }, { n: 10 }]);
      const results = await col.find({ n: { $lte: 5 } } as never).toArray();
      expect(results).toHaveLength(2);
    });

    it("comparison operators on strings use lexicographic order", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]);
      const results = await col.find({ name: { $gt: "Bob" } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("Charlie");
    });
  });

  describe("$in and $nin", () => {
    it("$in matches any value in array", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }]);
      const results = await col.find({ v: { $in: [1, 3] } } as never).toArray();
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.v).sort()).toEqual([1, 3]);
    });

    it("$nin excludes all values in array", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      const results = await col.find({ v: { $nin: [1, 3] } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBe(2);
    });

    it("$in with string values", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ status: "active" }, { status: "inactive" }, { status: "pending" }]);
      const results = await col.find({ status: { $in: ["active", "pending"] } } as never).toArray();
      expect(results).toHaveLength(2);
    });
  });

  describe("logical operators", () => {
    it("$and requires all conditions", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { a: 1, b: 2 },
        { a: 1, b: 5 },
        { a: 2, b: 2 },
      ]);
      const results = await col.find({ $and: [{ a: 1 }, { b: 2 }] } as never).toArray();
      expect(results).toHaveLength(1);
    });

    it("$or matches any condition", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      const results = await col.find({ $or: [{ v: 1 }, { v: 3 }] } as never).toArray();
      expect(results).toHaveLength(2);
    });

    it("$nor matches none", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      const results = await col.find({ $nor: [{ v: 1 }, { v: 3 }] } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBe(2);
    });

    it("$not negates a field expression", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ n: 5 }, { n: 15 }, { n: 25 }]);
      const results = await col.find({ n: { $not: { $gt: 10 } } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.n).toBe(5);
    });

    it("nested $and inside $or", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { type: "A", val: 10 },
        { type: "B", val: 20 },
        { type: "A", val: 30 },
      ]);
      const results = await col
        .find({
          $or: [{ $and: [{ type: "A" }, { val: { $gt: 20 } }] }, { type: "B" }],
        } as never)
        .toArray();
      expect(results).toHaveLength(2);
    });
  });

  describe("$exists", () => {
    it("$exists:true finds docs that have the field", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ a: 1, b: 2 }, { a: 3 }]);
      const results = await col.find({ b: { $exists: true } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.b).toBe(2);
    });

    it("$exists:false finds docs that lack the field", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ a: 1, b: 2 }, { a: 3 }]);
      const results = await col.find({ b: { $exists: false } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.a).toBe(3);
    });
  });

  describe("$type", () => {
    it("matches string type", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: "hello" }, { v: 42 }, { v: true }]);
      const results = await col.find({ v: { $type: "string" } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBe("hello");
    });

    it("matches number type", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: "hello" }, { v: 42 }, { v: true }]);
      const results = await col.find({ v: { $type: "number" } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBe(42);
    });

    it("matches boolean type", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: "hello" }, { v: 42 }, { v: true }]);
      const results = await col.find({ v: { $type: "boolean" } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBe(true);
    });

    it("matches null type", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: null }, { v: 0 }]);
      const results = await col.find({ v: { $type: "null" } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.v).toBeNull();
    });

    it("matches array type", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: [1, 2] }, { v: "not-array" }]);
      const results = await col.find({ v: { $type: "array" } } as never).toArray();
      expect(results).toHaveLength(1);
    });
  });

  describe("$regex", () => {
    it("matches string with pattern", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ email: "alice@example.com" }, { email: "bob@other.org" }]);
      const results = await col.find({ email: { $regex: "@example" } } as never).toArray();
      expect(results).toHaveLength(1);
    });

    it("matches with RegExp object (supports flags)", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ name: "Alice" }, { name: "alice" }, { name: "BOB" }]);
      const results = await col.find({ name: { $regex: /alice/i } } as never).toArray();
      expect(results).toHaveLength(2);
    });

    it("does not match non-string fields", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 123 }, { v: "abc" }]);
      const results = await col.find({ v: { $regex: "abc" } } as never).toArray();
      expect(results).toHaveLength(1);
    });
  });

  describe("$elemMatch", () => {
    it("matches array containing element satisfying sub-filter", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ scores: [{ v: 10 }, { v: 90 }] }, { scores: [{ v: 5 }, { v: 20 }] }]);
      const results = await col
        .find({ scores: { $elemMatch: { v: { $gt: 50 } } } } as never)
        .toArray();
      expect(results).toHaveLength(1);
    });

    it("does not match when no element satisfies sub-filter", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ nums: [1, 2, 3] }]);
      const results = await col.find({ nums: { $elemMatch: { $gt: 10 } } } as never).toArray();
      expect(results).toHaveLength(0);
    });

    it("does not match non-arrays", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: "not-array" }]);
      const results = await col.find({ v: { $elemMatch: { $gt: 1 } } } as never).toArray();
      expect(results).toHaveLength(0);
    });
  });

  describe("$all", () => {
    it("requires all elements to be present", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ tags: ["a", "b", "c"] }, { tags: ["a", "b"] }, { tags: ["x", "y"] }]);
      const results = await col.find({ tags: { $all: ["a", "b"] } } as never).toArray();
      expect(results).toHaveLength(2);
    });

    it("requires exact superset — extra elements are fine", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ tags: ["a", "b", "c", "d"] }]);
      const results = await col.find({ tags: { $all: ["a", "d"] } } as never).toArray();
      expect(results).toHaveLength(1);
    });
  });

  describe("$size", () => {
    it("matches exact array length", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ arr: [1, 2] }, { arr: [1, 2, 3] }, { arr: [] }]);
      const results = await col.find({ arr: { $size: 2 } } as never).toArray();
      expect(results).toHaveLength(1);
      expect(results[0]?.arr).toHaveLength(2);
    });

    it("$size 0 matches empty array", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ arr: [] }, { arr: [1] }]);
      const results = await col.find({ arr: { $size: 0 } } as never).toArray();
      expect(results).toHaveLength(1);
    });
  });

  describe("dot-notation in filters", () => {
    it("filters on nested field", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ user: { age: 30 } }, { user: { age: 25 } }]);
      const results = await col.find({ "user.age": { $gte: 30 } } as never).toArray();
      expect(results).toHaveLength(1);
    });

    it("exact match on nested field", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ meta: { status: "active" } }, { meta: { status: "inactive" } }]);
      const results = await col.find({ "meta.status": "active" } as never).toArray();
      expect(results).toHaveLength(1);
    });
  });
});
