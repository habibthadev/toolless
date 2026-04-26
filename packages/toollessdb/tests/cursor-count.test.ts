import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("cursor.count() correctness", () => {
  let tempDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-count-"));
    client = createClient({ path: tempDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("count() does not corrupt toArray() cache", () => {
    it("count() then toArray() returns full documents", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Carol", age: 35 },
      ]);

      const cursor = col.find({});
      const n = await cursor.count();
      expect(n).toBe(3);

      const docs = await cursor.toArray();
      expect(docs).toHaveLength(3);
      expect(docs[0]).toHaveProperty("name");
      expect(docs[0]).toHaveProperty("age");
    });

    it("toArray() after count() is not limited to _id fields", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "only-id", title: "Book", pages: 300, author: "Someone" });

      const cursor = col.find({});
      await cursor.count();
      const docs = await cursor.toArray();

      expect(docs).toHaveLength(1);
      expect(docs[0]?.title).toBe("Book");
      expect(docs[0]?.pages).toBe(300);
      expect(docs[0]?.author).toBe("Someone");
    });

    it("multiple count() calls return same value and don't corrupt state", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);

      const cursor = col.find({});
      expect(await cursor.count()).toBe(3);
      expect(await cursor.count()).toBe(3);
      expect(await cursor.count()).toBe(3);

      const docs = await cursor.toArray();
      expect(docs).toHaveLength(3);
      expect(docs[0]).toHaveProperty("v");
    });

    it("toArray() before count() still works", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ x: 1 }, { x: 2 }]);

      const cursor = col.find({});
      const docs = await cursor.toArray();
      expect(docs).toHaveLength(2);
      expect(docs[0]).toHaveProperty("x");

      const n = await cursor.count();
      expect(n).toBe(2);
    });

    it("count() with a projection set does not bleed into toArray()", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { name: "X", score: 99 },
        { name: "Y", score: 50 },
      ]);

      const cursor = col.find({}).project({ score: 1 });
      const n = await cursor.count();
      expect(n).toBe(2);

      const docs = await cursor.toArray();
      expect(docs).toHaveLength(2);
      expect(docs[0]).toHaveProperty("score");
    });
  });

  describe("count() respects skip and limit", () => {
    it("count() without skip/limit equals total matches", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
      expect(await col.find({}).count()).toBe(5);
    });

    it("count() respects skip", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
      expect(await col.find({}).skip(2).count()).toBe(3);
      expect(await col.find({}).skip(5).count()).toBe(0);
      expect(await col.find({}).skip(10).count()).toBe(0);
    });

    it("count() respects limit", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
      expect(await col.find({}).limit(2).count()).toBe(2);
      expect(await col.find({}).limit(0).count()).toBe(0);
      expect(await col.find({}).limit(100).count()).toBe(5);
    });

    it("count() respects both skip and limit", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
      expect(await col.find({}).skip(1).limit(2).count()).toBe(2);
      expect(await col.find({}).skip(4).limit(2).count()).toBe(1);
      expect(await col.find({}).skip(5).limit(2).count()).toBe(0);
    });

    it("count() with filter is correct", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { active: true },
        { active: false },
        { active: true },
        { active: true },
      ]);
      expect(await col.find({ active: true } as never).count()).toBe(3);
      expect(await col.find({ active: false } as never).count()).toBe(1);
    });

    it("count() with filter + skip + limit", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { active: true, v: 1 },
        { active: true, v: 2 },
        { active: true, v: 3 },
        { active: false, v: 4 },
      ]);
      expect(
        await col
          .find({ active: true } as never)
          .skip(1)
          .limit(1)
          .count()
      ).toBe(1);
      expect(
        await col
          .find({ active: true } as never)
          .skip(1)
          .count()
      ).toBe(2);
    });
  });

  describe("count() on empty or no-match cursors", () => {
    it("count() on empty collection returns 0", async () => {
      const col = client.db("db").collection("c");
      expect(await col.find({}).count()).toBe(0);
    });

    it("count() with no-match filter returns 0", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }]);
      expect(await col.find({ v: 99 } as never).count()).toBe(0);
    });
  });
});
