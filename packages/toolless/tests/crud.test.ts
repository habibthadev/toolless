import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient, DuplicateKeyError, ImmutableFieldError } from "../src/index";

interface TestDoc {
  name?: string;
  age?: number;
  status?: string;
  category?: string;
  tags?: string[];
}

describe("CRUD Operations", () => {
  let tmpDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-crud-test-"));
    client = createClient({ path: tmpDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("insertOne", () => {
    it("should insert a single document with auto-generated _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const result = await collection.insertOne({ name: "Alice", age: 30 });

      expect(result.insertedId).toBeDefined();
      expect(typeof result.insertedId).toBe("string");
      expect(result.insertedId.length).toBeGreaterThan(0);

      const doc = await collection.findOne({ _id: result.insertedId });
      expect(doc).not.toBeNull();
      expect(doc?.name).toBe("Alice");
      expect(doc?.age).toBe(30);
    });

    it("should insert a document with custom _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const customId = "my-custom-id-123";
      const result = await collection.insertOne({
        _id: customId,
        name: "Bob",
        age: 25,
      });

      expect(result.insertedId).toBe(customId);

      const doc = await collection.findOne({ _id: customId });
      expect(doc).not.toBeNull();
      expect(doc?._id).toBe(customId);
      expect(doc?.name).toBe("Bob");
    });

    it("should throw DuplicateKeyError on duplicate _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const customId = "duplicate-id";
      await collection.insertOne({ _id: customId, name: "First" });

      await expect(collection.insertOne({ _id: customId, name: "Second" })).rejects.toThrow(
        DuplicateKeyError
      );
    });
  });

  describe("insertMany", () => {
    it("should insert multiple documents", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const docs = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 },
      ];

      const result = await collection.insertMany(docs);

      expect(result.insertedIds).toHaveLength(3);
      expect(result.insertedCount).toBe(3);
      result.insertedIds.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      });

      const count = await collection.countDocuments();
      expect(count).toBe(3);
    });

    it("should verify all insertedIds match stored documents", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const docs = [
        { _id: "id-1", name: "Alice" },
        { _id: "id-2", name: "Bob" },
      ];

      const result = await collection.insertMany(docs);

      expect(result.insertedIds).toEqual(["id-1", "id-2"]);

      for (const id of result.insertedIds) {
        const doc = await collection.findOne({ _id: id });
        expect(doc).not.toBeNull();
      }
    });

    it("should throw DuplicateKeyError if any document has duplicate _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ _id: "existing-id", name: "Existing" });

      await expect(
        collection.insertMany([
          { name: "New1" },
          { _id: "existing-id", name: "Duplicate" },
          { name: "New2" },
        ])
      ).rejects.toThrow(DuplicateKeyError);
    });
  });

  describe("findOne", () => {
    it("should find document by _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const { insertedId } = await collection.insertOne({
        name: "Alice",
        age: 30,
      });

      const doc = await collection.findOne({ _id: insertedId });

      expect(doc).not.toBeNull();
      expect(doc?._id).toBe(insertedId);
      expect(doc?.name).toBe("Alice");
      expect(doc?.age).toBe(30);
    });

    it("should find document by field value", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 },
      ]);

      const doc = await collection.findOne({ name: "Bob" });

      expect(doc).not.toBeNull();
      expect(doc?.name).toBe("Bob");
      expect(doc?.age).toBe(25);
    });

    it("should return null when no match found", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ name: "Alice", age: 30 });

      const doc = await collection.findOne({ name: "NonExistent" });

      expect(doc).toBeNull();
    });

    it("should find document with multiple filter criteria", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 30, status: "active" },
        { name: "Alice", age: 25, status: "inactive" },
        { name: "Bob", age: 30, status: "active" },
      ]);

      const doc = await collection.findOne({ name: "Alice", age: 30 });

      expect(doc).not.toBeNull();
      expect(doc?.name).toBe("Alice");
      expect(doc?.age).toBe(30);
      expect(doc?.status).toBe("active");
    });
  });

  describe("find().toArray()", () => {
    it("should return empty array when no documents match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ name: "Alice", age: 30 });

      const docs = await collection.find({ name: "NonExistent" }).toArray();

      expect(docs).toEqual([]);
    });

    it("should return multiple matching documents", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "inactive" },
        { name: "Charlie", status: "active" },
        { name: "Diana", status: "active" },
      ]);

      const docs = await collection.find({ status: "active" }).toArray();

      expect(docs).toHaveLength(3);
      const names = docs.map((d) => d.name);
      expect(names).toContain("Alice");
      expect(names).toContain("Charlie");
      expect(names).toContain("Diana");
    });

    it("should return all documents with empty filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]);

      const docs = await collection.find({}).toArray();

      expect(docs).toHaveLength(3);
    });

    it("should return empty array from empty collection", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const docs = await collection.find({}).toArray();

      expect(docs).toEqual([]);
    });
  });

  describe("updateOne", () => {
    it("should update a matching document", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const { insertedId } = await collection.insertOne({
        name: "Alice",
        age: 30,
      });

      const result = await collection.updateOne({ _id: insertedId }, { $set: { age: 31 } });

      expect(result.matchedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);

      const doc = await collection.findOne({ _id: insertedId });
      expect(doc?.age).toBe(31);
      expect(doc?.name).toBe("Alice");
    });

    it("should return 0 counts when no document matches", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ name: "Alice", age: 30 });

      const result = await collection.updateOne({ name: "NonExistent" }, { $set: { age: 99 } });

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.upsertedId).toBeUndefined();
    });

    it("should create new document with upsert when no match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const result = await collection.updateOne(
        { name: "NewUser" },
        { $set: { age: 25 } },
        { upsert: true }
      );

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.upsertedId).toBeDefined();

      const doc = await collection.findOne({ _id: result.upsertedId });
      expect(doc).not.toBeNull();
      expect(doc?.name).toBe("NewUser");
      expect(doc?.age).toBe(25);
    });

    it("should update only one document when multiple match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "active" },
        { name: "Charlie", status: "active" },
      ]);

      const result = await collection.updateOne(
        { status: "active" },
        { $set: { status: "updated" } }
      );

      expect(result.matchedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);

      const stillActive = await collection.find({ status: "active" }).toArray();
      expect(stillActive).toHaveLength(2);
    });
  });

  describe("updateMany", () => {
    it("should update multiple matching documents", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "pending" },
        { name: "Bob", status: "pending" },
        { name: "Charlie", status: "active" },
        { name: "Diana", status: "pending" },
      ]);

      const result = await collection.updateMany(
        { status: "pending" },
        { $set: { status: "processed" } }
      );

      expect(result.matchedCount).toBe(3);
      expect(result.modifiedCount).toBe(3);

      const processed = await collection.find({ status: "processed" }).toArray();
      expect(processed).toHaveLength(3);

      const active = await collection.find({ status: "active" }).toArray();
      expect(active).toHaveLength(1);
    });

    it("should return 0 counts when no documents match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "active" },
      ]);

      const result = await collection.updateMany(
        { status: "nonexistent" },
        { $set: { status: "updated" } }
      );

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
    });

    it("should handle upsert when no documents match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const result = await collection.updateMany(
        { category: "new-category" },
        { $set: { status: "initialized" } },
        { upsert: true }
      );

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.upsertedId).toBeDefined();

      const doc = await collection.findOne({ _id: result.upsertedId });
      expect(doc?.category).toBe("new-category");
      expect(doc?.status).toBe("initialized");
    });

    it("should update all documents with empty filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "old" },
        { name: "Bob", status: "old" },
        { name: "Charlie", status: "old" },
      ]);

      const result = await collection.updateMany({}, { $set: { status: "new" } });

      expect(result.matchedCount).toBe(3);
      expect(result.modifiedCount).toBe(3);

      const docs = await collection.find({}).toArray();
      docs.forEach((doc) => {
        expect(doc.status).toBe("new");
      });
    });
  });

  describe("replaceOne", () => {
    it("should replace entire document except _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const { insertedId } = await collection.insertOne({
        name: "Alice",
        age: 30,
        status: "active",
      });

      const result = await collection.replaceOne(
        { _id: insertedId },
        { name: "Alice Updated", category: "premium" }
      );

      expect(result.matchedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);

      const doc = await collection.findOne({ _id: insertedId });
      expect(doc?._id).toBe(insertedId);
      expect(doc?.name).toBe("Alice Updated");
      expect(doc?.category).toBe("premium");
      expect(doc?.age).toBeUndefined();
      expect(doc?.status).toBeUndefined();
    });

    it("should return 0 counts when no document matches", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ name: "Alice" });

      const result = await collection.replaceOne({ name: "NonExistent" }, { name: "Replacement" });

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.upsertedId).toBeUndefined();
    });

    it("should create new document with upsert when no match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const result = await collection.replaceOne(
        { name: "NewUser" },
        { name: "NewUser", age: 28, status: "new" },
        { upsert: true }
      );

      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
      expect(result.upsertedId).toBeDefined();

      const doc = await collection.findOne({ _id: result.upsertedId });
      expect(doc).not.toBeNull();
      expect(doc?.name).toBe("NewUser");
      expect(doc?.age).toBe(28);
      expect(doc?.status).toBe("new");
    });

    it("should throw ImmutableFieldError if replacement tries to change _id", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const { insertedId } = await collection.insertOne({
        name: "Original",
      });

      await expect(
        collection.replaceOne({ _id: insertedId }, {
          _id: "different-id",
          name: "Replaced",
        } as TestDoc)
      ).rejects.toThrow(ImmutableFieldError);

      // Original document should remain unchanged
      const original = await collection.findOne({ _id: insertedId });
      expect(original).not.toBeNull();
      expect(original?.name).toBe("Original");
    });

    it("should allow replacement with same _id in document", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const { insertedId } = await collection.insertOne({
        name: "Original",
        age: 30,
      });

      // Replacement with same _id should work
      const result = await collection.replaceOne({ _id: insertedId }, {
        _id: insertedId,
        name: "Replaced",
      } as TestDoc);

      expect(result.matchedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);

      const doc = await collection.findOne({ _id: insertedId });
      expect(doc?.name).toBe("Replaced");
      expect(doc?.age).toBeUndefined();
    });
  });

  describe("deleteOne", () => {
    it("should delete a single matching document", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const { insertedId } = await collection.insertOne({
        name: "Alice",
        age: 30,
      });

      const result = await collection.deleteOne({ _id: insertedId });

      expect(result.deletedCount).toBe(1);

      const doc = await collection.findOne({ _id: insertedId });
      expect(doc).toBeNull();
    });

    it("should return deletedCount 0 when no document matches", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertOne({ name: "Alice" });

      const result = await collection.deleteOne({ name: "NonExistent" });

      expect(result.deletedCount).toBe(0);

      const count = await collection.countDocuments();
      expect(count).toBe(1);
    });

    it("should delete only one document when multiple match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "active" },
        { name: "Charlie", status: "active" },
      ]);

      const result = await collection.deleteOne({ status: "active" });

      expect(result.deletedCount).toBe(1);

      const remaining = await collection.find({ status: "active" }).toArray();
      expect(remaining).toHaveLength(2);
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple matching documents", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "inactive" },
        { name: "Bob", status: "active" },
        { name: "Charlie", status: "inactive" },
        { name: "Diana", status: "inactive" },
      ]);

      const result = await collection.deleteMany({ status: "inactive" });

      expect(result.deletedCount).toBe(3);

      const remaining = await collection.find({}).toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe("Bob");
    });

    it("should return deletedCount 0 when no documents match", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "active" },
      ]);

      const result = await collection.deleteMany({ status: "nonexistent" });

      expect(result.deletedCount).toBe(0);

      const count = await collection.countDocuments();
      expect(count).toBe(2);
    });

    it("should delete all documents with empty filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice" },
        { name: "Bob" },
        { name: "Charlie" },
        { name: "Diana" },
      ]);

      const result = await collection.deleteMany({});

      expect(result.deletedCount).toBe(4);

      const count = await collection.countDocuments();
      expect(count).toBe(0);
    });
  });

  describe("countDocuments", () => {
    it("should count all documents without filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]);

      const count = await collection.countDocuments();

      expect(count).toBe(3);
    });

    it("should count documents matching filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "inactive" },
        { name: "Charlie", status: "active" },
        { name: "Diana", status: "active" },
      ]);

      const count = await collection.countDocuments({ status: "active" });

      expect(count).toBe(3);
    });

    it("should return 0 for empty collection", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const count = await collection.countDocuments();

      expect(count).toBe(0);
    });

    it("should return 0 when no documents match filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", status: "active" },
        { name: "Bob", status: "active" },
      ]);

      const count = await collection.countDocuments({ status: "nonexistent" });

      expect(count).toBe(0);
    });

    it("should count correctly with empty filter object", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([{ name: "Alice" }, { name: "Bob" }]);

      const count = await collection.countDocuments({});

      expect(count).toBe(2);
    });
  });

  describe("distinct", () => {
    it("should return distinct values for a field", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", category: "A" },
        { name: "Bob", category: "B" },
        { name: "Charlie", category: "A" },
        { name: "Diana", category: "C" },
        { name: "Eve", category: "B" },
      ]);

      const categories = await collection.distinct("category");

      expect(categories).toHaveLength(3);
      expect(categories).toContain("A");
      expect(categories).toContain("B");
      expect(categories).toContain("C");
    });

    it("should return distinct values with filter", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", category: "A", status: "active" },
        { name: "Bob", category: "B", status: "inactive" },
        { name: "Charlie", category: "A", status: "active" },
        { name: "Diana", category: "C", status: "active" },
        { name: "Eve", category: "B", status: "active" },
      ]);

      const categories = await collection.distinct("category", {
        status: "active",
      });

      expect(categories).toHaveLength(3);
      expect(categories).toContain("A");
      expect(categories).toContain("B");
      expect(categories).toContain("C");
    });

    it("should return empty array when no documents exist", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      const categories = await collection.distinct("category");

      expect(categories).toEqual([]);
    });

    it("should exclude documents without the field", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", category: "A" },
        { name: "Bob" },
        { name: "Charlie", category: "B" },
        { name: "Diana" },
      ]);

      const categories = await collection.distinct("category");

      expect(categories).toHaveLength(2);
      expect(categories).toContain("A");
      expect(categories).toContain("B");
    });

    it("should return distinct values for numeric fields", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 30 },
        { name: "Diana", age: 35 },
        { name: "Eve", age: 25 },
      ]);

      const ages = await collection.distinct("age");

      expect(ages).toHaveLength(3);
      expect(ages).toContain(25);
      expect(ages).toContain(30);
      expect(ages).toContain(35);
    });
  });

  describe("persistence", () => {
    it("should persist data after client close and reopen", async () => {
      const db = client.db("test");
      const collection = db.collection<TestDoc>("users");

      await collection.insertMany([
        { _id: "user-1", name: "Alice", age: 30 },
        { _id: "user-2", name: "Bob", age: 25 },
      ]);

      await client.close();

      const newClient = createClient({ path: tmpDir });
      const newDb = newClient.db("test");
      const newCollection = newDb.collection<TestDoc>("users");

      const count = await newCollection.countDocuments();
      expect(count).toBe(2);

      const alice = await newCollection.findOne({ _id: "user-1" });
      expect(alice?.name).toBe("Alice");
      expect(alice?.age).toBe(30);

      const bob = await newCollection.findOne({ _id: "user-2" });
      expect(bob?.name).toBe("Bob");
      expect(bob?.age).toBe(25);

      await newClient.close();
    });
  });
});
