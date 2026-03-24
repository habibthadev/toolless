import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("Operators", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-operators-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Filter Operators", () => {
    describe("$eq - Equality comparison", () => {
      it("should match exact string value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 25 },
        ]);

        const results = await col.find({ name: { $eq: "Alice" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should match exact numeric value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 25 },
        ]);

        const results = await col.find({ age: { $eq: 25 } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Charlie"]);
      });

      it("should match null value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: null },
          { name: "Bob", status: "active" },
        ]);

        const results = await col.find({ status: { $eq: null } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should match array value exactly", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", tags: ["a", "b"] },
          { name: "Bob", tags: ["a", "b", "c"] },
        ]);

        const results = await col.find({ tags: { $eq: ["a", "b"] } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should match nested object value exactly", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", address: { city: "NYC", zip: "10001" } },
          { name: "Bob", address: { city: "LA" } },
        ]);

        const results = await col
          .find({ address: { $eq: { city: "NYC", zip: "10001" } } })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });
    });

    describe("$ne - Not equal comparison", () => {
      it("should match documents where field is not equal", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $ne: 25 } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Bob", "Charlie"]);
      });

      it("should match documents where field is not null", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: null },
          { name: "Bob", status: "active" },
          { name: "Charlie", status: "inactive" },
        ]);

        const results = await col.find({ status: { $ne: null } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Bob", "Charlie"]);
      });
    });

    describe("$gt - Greater than", () => {
      it("should match documents with greater numeric value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $gt: 28 } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Bob", "Charlie"]);
      });

      it("should not match equal values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 30 },
          { name: "Bob", age: 30 },
        ]);

        const results = await col.find({ age: { $gt: 30 } }).toArray();
        expect(results).toHaveLength(0);
      });

      it("should handle string comparison", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]);

        const results = await col.find({ name: { $gt: "Bob" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Charlie");
      });
    });

    describe("$gte - Greater than or equal", () => {
      it("should match documents with greater or equal numeric value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $gte: 30 } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Bob", "Charlie"]);
      });

      it("should match exactly equal values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([{ name: "Alice", age: 30 }]);

        const results = await col.find({ age: { $gte: 30 } }).toArray();
        expect(results).toHaveLength(1);
      });
    });

    describe("$lt - Less than", () => {
      it("should match documents with lesser numeric value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $lt: 30 } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should not match equal values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([{ name: "Alice", age: 30 }]);

        const results = await col.find({ age: { $lt: 30 } }).toArray();
        expect(results).toHaveLength(0);
      });
    });

    describe("$lte - Less than or equal", () => {
      it("should match documents with lesser or equal numeric value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $lte: 30 } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Bob"]);
      });

      it("should match exactly equal values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([{ name: "Alice", age: 30 }]);

        const results = await col.find({ age: { $lte: 30 } }).toArray();
        expect(results).toHaveLength(1);
      });
    });

    describe("$in - Array membership", () => {
      it("should match documents where field is in array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: "active" },
          { name: "Bob", status: "inactive" },
          { name: "Charlie", status: "pending" },
        ]);

        const results = await col.find({ status: { $in: ["active", "pending"] } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Charlie"]);
      });

      it("should match numeric values in array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $in: [25, 35] } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Charlie"]);
      });

      it("should match null in array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: null },
          { name: "Bob", status: "active" },
        ]);

        const results = await col.find({ status: { $in: [null, "pending"] } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });
    });

    describe("$nin - Not in array", () => {
      it("should match documents where field is not in array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: "active" },
          { name: "Bob", status: "inactive" },
          { name: "Charlie", status: "pending" },
        ]);

        const results = await col.find({ status: { $nin: ["inactive", "pending"] } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should match documents where field is not in numeric array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $nin: [25, 35] } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Bob");
      });
    });

    describe("$and - Logical AND", () => {
      it("should match documents satisfying all conditions", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25, status: "active" },
          { name: "Bob", age: 30, status: "active" },
          { name: "Charlie", age: 25, status: "inactive" },
        ]);

        const results = await col
          .find({
            $and: [{ age: 25 }, { status: "active" }],
          })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should work with nested operators", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25, score: 85 },
          { name: "Bob", age: 30, score: 90 },
          { name: "Charlie", age: 35, score: 75 },
        ]);

        const results = await col
          .find({
            $and: [{ age: { $gte: 25 } }, { score: { $gt: 80 } }],
          })
          .toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Bob"]);
      });

      it("should handle multiple conditions on same field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col
          .find({
            $and: [{ age: { $gte: 25 } }, { age: { $lt: 35 } }],
          })
          .toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Bob"]);
      });
    });

    describe("$or - Logical OR", () => {
      it("should match documents satisfying any condition", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25, status: "active" },
          { name: "Bob", age: 30, status: "inactive" },
          { name: "Charlie", age: 35, status: "pending" },
        ]);

        const results = await col
          .find({
            $or: [{ age: 25 }, { status: "pending" }],
          })
          .toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Charlie"]);
      });

      it("should work with complex nested conditions", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25, role: "admin" },
          { name: "Bob", age: 30, role: "user" },
          { name: "Charlie", age: 18, role: "user" },
        ]);

        const results = await col
          .find({
            $or: [{ role: "admin" }, { $and: [{ age: { $gte: 21 } }, { role: "user" }] }],
          })
          .toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Bob"]);
      });
    });

    describe("$nor - Logical NOR", () => {
      it("should match documents not satisfying any condition", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25, status: "active" },
          { name: "Bob", age: 30, status: "inactive" },
          { name: "Charlie", age: 35, status: "pending" },
        ]);

        const results = await col
          .find({
            $nor: [{ age: 25 }, { status: "pending" }],
          })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Bob");
      });

      it("should match documents failing all conditions", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", score: 50 },
          { name: "Bob", score: 75 },
          { name: "Charlie", score: 90 },
        ]);

        const results = await col
          .find({
            $nor: [{ score: { $lt: 60 } }, { score: { $gte: 80 } }],
          })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Bob");
      });
    });

    describe("$not - Negation", () => {
      it("should negate equality condition", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $not: { $eq: 30 } } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Charlie"]);
      });

      it("should negate comparison operators", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25 },
          { name: "Bob", age: 30 },
          { name: "Charlie", age: 35 },
        ]);

        const results = await col.find({ age: { $not: { $gte: 30 } } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should negate $in operator", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: "active" },
          { name: "Bob", status: "inactive" },
          { name: "Charlie", status: "pending" },
        ]);

        const results = await col
          .find({ status: { $not: { $in: ["active", "inactive"] } } })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Charlie");
      });
    });

    describe("$exists - Field existence", () => {
      it("should match documents where field exists", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", email: "alice@test.com" },
          { name: "Bob" },
          { name: "Charlie", email: null },
        ]);

        const results = await col.find({ email: { $exists: true } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["Alice", "Charlie"]);
      });

      it("should match documents where field does not exist", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", email: "alice@test.com" },
          { name: "Bob" },
          { name: "Charlie", email: null },
        ]);

        const results = await col.find({ email: { $exists: false } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Bob");
      });

      it("should work with nested fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", address: { city: "NYC" } },
          { name: "Bob", address: {} },
          { name: "Charlie" },
        ]);

        const results = await col.find({ "address.city": { $exists: true } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });
    });

    describe("$type - Type checking", () => {
      it("should match string type", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "hello" }, { value: 123 }, { value: true }]);

        const results = await col.find({ value: { $type: "string" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.value).toBe("hello");
      });

      it("should match number type", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "hello" }, { value: 123 }, { value: 45.67 }]);

        const results = await col.find({ value: { $type: "number" } }).toArray();
        expect(results).toHaveLength(2);
      });

      it("should match boolean type", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "true" }, { value: true }, { value: false }]);

        const results = await col.find({ value: { $type: "boolean" } }).toArray();
        expect(results).toHaveLength(2);
      });

      it("should match array type", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([
          { value: [1, 2, 3] },
          { value: "array" },
          { value: { 0: "a", 1: "b" } },
        ]);

        const results = await col.find({ value: { $type: "array" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.value).toEqual([1, 2, 3]);
      });

      it("should match object type", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: { nested: true } }, { value: [1, 2] }, { value: "object" }]);

        const results = await col.find({ value: { $type: "object" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.value).toEqual({ nested: true });
      });

      it("should match null type", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: null }, { value: "null" }, { value: 0 }]);

        const results = await col.find({ value: { $type: "null" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.value).toBeNull();
      });
    });

    describe("$regex - Regular expression matching", () => {
      it("should match string with regex pattern", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice Smith" },
          { name: "Bob Johnson" },
          { name: "Alice Johnson" },
        ]);

        const results = await col.find({ name: { $regex: "^Alice" } }).toArray();
        expect(results).toHaveLength(2);
        expect(results.every((r) => (r.name as string).startsWith("Alice"))).toBe(true);
      });

      it("should match with RegExp object", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { email: "alice@test.com" },
          { email: "bob@example.org" },
          { email: "charlie@test.io" },
        ]);

        const results = await col.find({ email: { $regex: /\.com$/ } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.email).toBe("alice@test.com");
      });

      it("should match case-insensitive with regex flag", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([{ name: "ALICE" }, { name: "alice" }, { name: "Bob" }]);

        const results = await col.find({ name: { $regex: /alice/i } }).toArray();
        expect(results).toHaveLength(2);
      });

      it("should match middle of string", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { description: "Hello world!" },
          { description: "Goodbye world!" },
          { description: "Hello there!" },
        ]);

        const results = await col.find({ description: { $regex: "world" } }).toArray();
        expect(results).toHaveLength(2);
      });

      it("should not match non-string values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "test123" }, { value: 123 }, { value: null }]);

        const results = await col.find({ value: { $regex: "123" } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.value).toBe("test123");
      });
    });

    describe("$elemMatch - Array element matching", () => {
      it("should match array with element satisfying condition", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", scores: [{ subject: "math", score: 95 }] },
          { name: "Bob", scores: [{ subject: "math", score: 75 }] },
          { name: "Charlie", scores: [{ subject: "english", score: 95 }] },
        ]);

        const results = await col
          .find({
            scores: { $elemMatch: { subject: "math", score: { $gte: 90 } } },
          })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });

      it("should match nested objects in array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("orders");

        await col.insertMany([
          {
            orderId: 1,
            items: [
              { product: "A", qty: 5, price: 10 },
              { product: "B", qty: 2, price: 20 },
            ],
          },
          {
            orderId: 2,
            items: [
              { product: "A", qty: 1, price: 10 },
              { product: "C", qty: 10, price: 5 },
            ],
          },
        ]);

        const results = await col
          .find({
            items: { $elemMatch: { product: "A", qty: { $gt: 3 } } },
          })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.orderId).toBe(1);
      });

      it("should not match if no element satisfies all conditions", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          {
            name: "Alice",
            scores: [
              { subject: "math", score: 75 },
              { subject: "english", score: 95 },
            ],
          },
        ]);

        const results = await col
          .find({
            scores: { $elemMatch: { subject: "math", score: { $gte: 90 } } },
          })
          .toArray();
        expect(results).toHaveLength(0);
      });

      it("should not match non-array fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "not an array" }, { value: { nested: true } }]);

        const results = await col.find({ value: { $elemMatch: { nested: true } } }).toArray();
        expect(results).toHaveLength(0);
      });
    });

    describe("$all - All elements in array", () => {
      it("should match array containing all specified elements", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([
          { tags: ["a", "b", "c"] },
          { tags: ["a", "b"] },
          { tags: ["a", "c", "d"] },
        ]);

        const results = await col.find({ tags: { $all: ["a", "c"] } }).toArray();
        expect(results).toHaveLength(2);
      });

      it("should match with single element", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ tags: ["a", "b"] }, { tags: ["c", "d"] }]);

        const results = await col.find({ tags: { $all: ["a"] } }).toArray();
        expect(results).toHaveLength(1);
      });

      it("should match array with objects", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([
          { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
          { items: [{ id: 1 }, { id: 4 }] },
        ]);

        const results = await col.find({ items: { $all: [{ id: 1 }, { id: 2 }] } }).toArray();
        expect(results).toHaveLength(1);
      });

      it("should not match non-array fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "abc" }]);

        const results = await col.find({ value: { $all: ["a"] } }).toArray();
        expect(results).toHaveLength(0);
      });
    });

    describe("$size - Array size", () => {
      it("should match array with exact size", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ tags: ["a", "b", "c"] }, { tags: ["a", "b"] }, { tags: ["a"] }]);

        const results = await col.find({ tags: { $size: 2 } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.tags).toEqual(["a", "b"]);
      });

      it("should match empty array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ tags: [] }, { tags: ["a"] }]);

        const results = await col.find({ tags: { $size: 0 } }).toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.tags).toEqual([]);
      });

      it("should not match non-array fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("items");

        await col.insertMany([{ value: "abc" }, { value: 123 }]);

        const results = await col.find({ value: { $size: 3 } }).toArray();
        expect(results).toHaveLength(0);
      });
    });

    describe("Combined filter operators", () => {
      it("should combine multiple comparison operators", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("products");

        await col.insertMany([
          { name: "A", price: 10, stock: 100 },
          { name: "B", price: 25, stock: 50 },
          { name: "C", price: 50, stock: 25 },
          { name: "D", price: 100, stock: 10 },
        ]);

        const results = await col
          .find({
            price: { $gte: 20, $lte: 60 },
            stock: { $gt: 20 },
          })
          .toArray();
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.name).sort()).toEqual(["B", "C"]);
      });

      it("should combine $or with comparison operators", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", age: 25, premium: true },
          { name: "Bob", age: 35, premium: false },
          { name: "Charlie", age: 18, premium: true },
        ]);

        const results = await col
          .find({
            $or: [{ age: { $gte: 30 } }, { premium: true }],
          })
          .toArray();
        expect(results).toHaveLength(3);
      });

      it("should use nested path queries", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", address: { city: "NYC", country: "USA" } },
          { name: "Bob", address: { city: "LA", country: "USA" } },
          { name: "Charlie", address: { city: "London", country: "UK" } },
        ]);

        const results = await col
          .find({
            "address.country": "USA",
            "address.city": { $in: ["NYC", "SF"] },
          })
          .toArray();
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Alice");
      });
    });
  });

  describe("Update Operators", () => {
    describe("$set - Set field value", () => {
      it("should set a new field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $set: { age: 25 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.age).toBe(25);
      });

      it("should update an existing field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", age: 25 });
        await col.updateOne({ name: "Alice" }, { $set: { age: 26 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.age).toBe(26);
      });

      it("should set multiple fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne(
          { name: "Alice" },
          { $set: { age: 25, email: "alice@test.com", active: true } }
        );

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.age).toBe(25);
        expect(doc?.email).toBe("alice@test.com");
        expect(doc?.active).toBe(true);
      });

      it("should set nested field using dot notation", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", address: { city: "NYC" } });
        await col.updateOne({ name: "Alice" }, { $set: { "address.zip": "10001" } });

        const doc = await col.findOne({ name: "Alice" });
        expect((doc?.address as Record<string, unknown>)?.zip).toBe("10001");
        expect((doc?.address as Record<string, unknown>)?.city).toBe("NYC");
      });

      it("should create nested structure if not exists", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $set: { "profile.bio": "Hello" } });

        const doc = await col.findOne({ name: "Alice" });
        expect((doc?.profile as Record<string, unknown>)?.bio).toBe("Hello");
      });

      it("should set field to null", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", status: "active" });
        await col.updateOne({ name: "Alice" }, { $set: { status: null } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.status).toBeNull();
      });

      it("should set field to array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $set: { tags: ["a", "b", "c"] } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b", "c"]);
      });
    });

    describe("$unset - Remove field", () => {
      it("should remove a field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", age: 25, email: "alice@test.com" });
        await col.updateOne({ name: "Alice" }, { $unset: { email: "" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.email).toBeUndefined();
        expect(doc?.age).toBe(25);
      });

      it("should remove multiple fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", age: 25, email: "a@t.com", phone: "123" });
        await col.updateOne({ name: "Alice" }, { $unset: { email: "", phone: "" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.email).toBeUndefined();
        expect(doc?.phone).toBeUndefined();
        expect(doc?.age).toBe(25);
      });

      it("should remove nested field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({
          name: "Alice",
          address: { city: "NYC", zip: "10001" },
        });
        await col.updateOne({ name: "Alice" }, { $unset: { "address.zip": "" } });

        const doc = await col.findOne({ name: "Alice" });
        expect((doc?.address as Record<string, unknown>)?.zip).toBeUndefined();
        expect((doc?.address as Record<string, unknown>)?.city).toBe("NYC");
      });

      it("should handle removing non-existent field gracefully", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $unset: { nonexistent: "" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.name).toBe("Alice");
      });
    });

    describe("$inc - Increment numeric", () => {
      it("should increment a numeric field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", score: 10 });
        await col.updateOne({ name: "Alice" }, { $inc: { score: 5 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.score).toBe(15);
      });

      it("should decrement with negative value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", score: 10 });
        await col.updateOne({ name: "Alice" }, { $inc: { score: -3 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.score).toBe(7);
      });

      it("should create field if not exists with incremented value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $inc: { score: 5 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.score).toBe(5);
      });

      it("should increment multiple fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", score: 10, level: 1 });
        await col.updateOne({ name: "Alice" }, { $inc: { score: 5, level: 2 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.score).toBe(15);
        expect(doc?.level).toBe(3);
      });

      it("should handle floating point increment", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", balance: 100.5 });
        await col.updateOne({ name: "Alice" }, { $inc: { balance: 0.25 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.balance).toBeCloseTo(100.75);
      });
    });

    describe("$mul - Multiply numeric", () => {
      it("should multiply a numeric field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", score: 10 });
        await col.updateOne({ name: "Alice" }, { $mul: { score: 2 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.score).toBe(20);
      });

      it("should multiply with fractional value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", price: 100 });
        await col.updateOne({ name: "Alice" }, { $mul: { price: 0.9 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.price).toBeCloseTo(90);
      });

      it("should set to 0 if field does not exist", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $mul: { score: 5 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.score).toBe(0);
      });

      it("should handle negative multiplier", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", value: 10 });
        await col.updateOne({ name: "Alice" }, { $mul: { value: -2 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.value).toBe(-20);
      });
    });

    describe("$push - Push to array", () => {
      it("should push a single value to array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b"] });
        await col.updateOne({ name: "Alice" }, { $push: { tags: "c" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b", "c"]);
      });

      it("should create array if not exists", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $push: { tags: "a" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a"]);
      });

      it("should push with $each modifier", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a"] });
        await col.updateOne({ name: "Alice" }, { $push: { tags: { $each: ["b", "c", "d"] } } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b", "c", "d"]);
      });

      it("should push object to array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", orders: [] });
        await col.updateOne({ name: "Alice" }, { $push: { orders: { id: 1, amount: 100 } } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.orders).toEqual([{ id: 1, amount: 100 }]);
      });

      it("should allow duplicate values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b"] });
        await col.updateOne({ name: "Alice" }, { $push: { tags: "a" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b", "a"]);
      });
    });

    describe("$pull - Pull from array", () => {
      it("should pull a value from array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b", "c"] });
        await col.updateOne({ name: "Alice" }, { $pull: { tags: "b" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "c"]);
      });

      it("should pull all matching values", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", scores: [1, 2, 2, 3, 2] });
        await col.updateOne({ name: "Alice" }, { $pull: { scores: 2 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.scores).toEqual([1, 3]);
      });

      it("should handle pulling from non-existent array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $pull: { tags: "a" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toBeUndefined();
      });

      it("should pull object from array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({
          name: "Alice",
          items: [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
          ],
        });
        await col.updateOne({ name: "Alice" }, { $pull: { items: { id: 1, name: "a" } } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.items).toEqual([{ id: 2, name: "b" }]);
      });
    });

    describe("$pop - Pop from array", () => {
      it("should pop last element with value 1", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b", "c"] });
        await col.updateOne({ name: "Alice" }, { $pop: { tags: 1 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b"]);
      });

      it("should pop first element with value -1", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b", "c"] });
        await col.updateOne({ name: "Alice" }, { $pop: { tags: -1 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["b", "c"]);
      });

      it("should handle empty array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: [] });
        await col.updateOne({ name: "Alice" }, { $pop: { tags: 1 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual([]);
      });

      it("should handle single element array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["only"] });
        await col.updateOne({ name: "Alice" }, { $pop: { tags: 1 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual([]);
      });

      it("should handle non-existent array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $pop: { tags: 1 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toBeUndefined();
      });
    });

    describe("$addToSet - Add unique to array", () => {
      it("should add value if not present", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b"] });
        await col.updateOne({ name: "Alice" }, { $addToSet: { tags: "c" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b", "c"]);
      });

      it("should not add duplicate value", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b"] });
        await col.updateOne({ name: "Alice" }, { $addToSet: { tags: "a" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b"]);
      });

      it("should create array if not exists", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $addToSet: { tags: "a" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a"]);
      });

      it("should add with $each modifier", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: ["a", "b"] });
        await col.updateOne({ name: "Alice" }, { $addToSet: { tags: { $each: ["b", "c", "d"] } } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.tags).toEqual(["a", "b", "c", "d"]);
      });

      it("should handle object uniqueness", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({
          name: "Alice",
          items: [{ id: 1, name: "a" }],
        });
        await col.updateOne({ name: "Alice" }, { $addToSet: { items: { id: 1, name: "a" } } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.items).toEqual([{ id: 1, name: "a" }]);

        await col.updateOne({ name: "Alice" }, { $addToSet: { items: { id: 2, name: "b" } } });

        const doc2 = await col.findOne({ name: "Alice" });
        expect(doc2?.items).toEqual([
          { id: 1, name: "a" },
          { id: 2, name: "b" },
        ]);
      });
    });

    describe("$rename - Rename field", () => {
      it("should rename a field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", oldField: "value" });
        await col.updateOne({ name: "Alice" }, { $rename: { oldField: "newField" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.oldField).toBeUndefined();
        expect(doc?.newField).toBe("value");
      });

      it("should rename multiple fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", field1: "a", field2: "b" });
        await col.updateOne(
          { name: "Alice" },
          { $rename: { field1: "newField1", field2: "newField2" } }
        );

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.field1).toBeUndefined();
        expect(doc?.field2).toBeUndefined();
        expect(doc?.newField1).toBe("a");
        expect(doc?.newField2).toBe("b");
      });

      it("should handle renaming non-existent field", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $rename: { nonexistent: "newField" } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.nonexistent).toBeUndefined();
        expect(doc?.newField).toBeUndefined();
      });

      it("should rename nested fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", profile: { oldName: "test" } });
        await col.updateOne(
          { name: "Alice" },
          { $rename: { "profile.oldName": "profile.newName" } }
        );

        const doc = await col.findOne({ name: "Alice" });
        expect((doc?.profile as Record<string, unknown>)?.oldName).toBeUndefined();
        expect((doc?.profile as Record<string, unknown>)?.newName).toBe("test");
      });
    });

    describe("$min - Conditional update (minimum)", () => {
      it("should update field if new value is lower", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", minScore: 100 });
        await col.updateOne({ name: "Alice" }, { $min: { minScore: 50 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.minScore).toBe(50);
      });

      it("should not update if new value is higher", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", minScore: 100 });
        await col.updateOne({ name: "Alice" }, { $min: { minScore: 150 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.minScore).toBe(100);
      });

      it("should set field if it does not exist", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $min: { minScore: 50 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.minScore).toBe(50);
      });

      it("should not update if values are equal", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", minScore: 100 });
        await col.updateOne({ name: "Alice" }, { $min: { minScore: 100 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.minScore).toBe(100);
      });
    });

    describe("$max - Conditional update (maximum)", () => {
      it("should update field if new value is higher", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", maxScore: 100 });
        await col.updateOne({ name: "Alice" }, { $max: { maxScore: 150 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.maxScore).toBe(150);
      });

      it("should not update if new value is lower", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", maxScore: 100 });
        await col.updateOne({ name: "Alice" }, { $max: { maxScore: 50 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.maxScore).toBe(100);
      });

      it("should set field if it does not exist", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $max: { maxScore: 150 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.maxScore).toBe(150);
      });

      it("should not update if values are equal", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", maxScore: 100 });
        await col.updateOne({ name: "Alice" }, { $max: { maxScore: 100 } });

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.maxScore).toBe(100);
      });
    });

    describe("$currentDate - Set to current date/timestamp", () => {
      it("should set field to current date with true", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        const before = new Date();
        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $currentDate: { updatedAt: true } });
        const after = new Date();

        const doc = await col.findOne({ name: "Alice" });
        const updatedAt = doc?.updatedAt as Date;
        expect(updatedAt).toBeInstanceOf(Date);
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it("should set field to date with $type: date", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        const before = new Date();
        await col.insertOne({ name: "Alice" });
        await col.updateOne({ name: "Alice" }, { $currentDate: { updatedAt: { $type: "date" } } });
        const after = new Date();

        const doc = await col.findOne({ name: "Alice" });
        const updatedAt = doc?.updatedAt as Date;
        expect(updatedAt).toBeInstanceOf(Date);
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it("should set field to timestamp with $type: timestamp", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        const before = Date.now();
        await col.insertOne({ name: "Alice" });
        await col.updateOne(
          { name: "Alice" },
          { $currentDate: { updatedAt: { $type: "timestamp" } } }
        );
        const after = Date.now();

        const doc = await col.findOne({ name: "Alice" });
        const updatedAt = doc?.updatedAt as number;
        expect(typeof updatedAt).toBe("number");
        expect(updatedAt).toBeGreaterThanOrEqual(before);
        expect(updatedAt).toBeLessThanOrEqual(after);
      });

      it("should set multiple date fields", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });
        await col.updateOne(
          { name: "Alice" },
          {
            $currentDate: {
              createdAt: true,
              modifiedAt: { $type: "timestamp" },
            },
          }
        );

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.createdAt).toBeInstanceOf(Date);
        expect(typeof doc?.modifiedAt).toBe("number");
      });
    });

    describe("Combined update operators", () => {
      it("should apply multiple update operators", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({
          name: "Alice",
          score: 100,
          oldField: "value",
          tags: ["a"],
        });

        await col.updateOne(
          { name: "Alice" },
          {
            $set: { status: "active" },
            $inc: { score: 10 },
            $unset: { oldField: "" },
            $push: { tags: "b" },
          }
        );

        const doc = await col.findOne({ name: "Alice" });
        expect(doc?.status).toBe("active");
        expect(doc?.score).toBe(110);
        expect(doc?.oldField).toBeUndefined();
        expect(doc?.tags).toEqual(["a", "b"]);
      });

      it("should update multiple documents with updateMany", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertMany([
          { name: "Alice", status: "pending" },
          { name: "Bob", status: "pending" },
          { name: "Charlie", status: "active" },
        ]);

        const result = await col.updateMany(
          { status: "pending" },
          { $set: { status: "processed" } }
        );

        expect(result.matchedCount).toBe(2);
        expect(result.modifiedCount).toBe(2);

        const docs = await col.find({ status: "processed" }).toArray();
        expect(docs).toHaveLength(2);
      });
    });

    describe("Error handling", () => {
      it("should throw error when trying to modify _id with $set", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });

        await expect(
          col.updateOne({ name: "Alice" }, { $set: { _id: "newId" } })
        ).rejects.toThrow();
      });

      it("should throw error when trying to $unset _id", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice" });

        await expect(col.updateOne({ name: "Alice" }, { $unset: { _id: "" } })).rejects.toThrow();
      });

      it("should throw error when $push on non-array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: "not-an-array" });

        await expect(
          col.updateOne({ name: "Alice" }, { $push: { tags: "value" } })
        ).rejects.toThrow();
      });

      it("should throw error when $addToSet on non-array", async () => {
        const client = createClient(tempDir);
        const db = client.db("test");
        const col = db.collection("users");

        await col.insertOne({ name: "Alice", tags: "not-an-array" });

        await expect(
          col.updateOne({ name: "Alice" }, { $addToSet: { tags: "value" } })
        ).rejects.toThrow();
      });
    });
  });
});
