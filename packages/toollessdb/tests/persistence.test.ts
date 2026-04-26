import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("Persistence — restart correctness", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-persist-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("$unset survives reload", () => {
    it("unset field is absent after reload — not null", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "u1", name: "Alice", status: "active" });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "u1" }, { $unset: { status: "" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "u1" });
      expect(doc).not.toHaveProperty("status");
      expect(doc?.name).toBe("Alice");
      await c2.close();
    });

    it("$unset multiple fields — all absent after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "u2", a: 1, b: 2, c: 3 });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "u2" }, { $unset: { a: "", b: "" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "u2" });
      expect(doc).not.toHaveProperty("a");
      expect(doc).not.toHaveProperty("b");
      expect(doc?.c).toBe(3);
      await c2.close();
    });

    it("updateMany $unset — all targets absent after reload", async () => {
      const c1 = createClient(tempDir);
      const col = c1.db("db").collection("c");
      await col.insertMany([
        { _id: "1", tag: "old", val: 10 },
        { _id: "2", tag: "old", val: 20 },
        { _id: "3", tag: "keep", val: 30 },
      ]);
      await col.updateMany({ tag: "old" } as never, { $unset: { tag: "" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const docs = await c2.db("db").collection("c").find({}).toArray();
      const doc1 = docs.find((d) => d._id === "1");
      const doc2 = docs.find((d) => d._id === "2");
      const doc3 = docs.find((d) => d._id === "3");
      expect(doc1).not.toHaveProperty("tag");
      expect(doc2).not.toHaveProperty("tag");
      expect(doc3?.tag).toBe("keep");
      await c2.close();
    });

    it("$unset-ed field is not matched by $exists:true after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "u3", flag: true, name: "test" });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "u3" }, { $unset: { flag: "" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const found = await c2
        .db("db")
        .collection("c")
        .find({ flag: { $exists: true } } as never)
        .toArray();
      expect(found).toHaveLength(0);
      await c2.close();
    });

    it("setting field to null vs unsetting are distinct after reload", async () => {
      const c1 = createClient(tempDir);
      const col = c1.db("db").collection("c");
      await col.insertMany([
        { _id: "null", v: 1, field: "present" },
        { _id: "unset", v: 2, field: "present" },
      ]);
      await col.updateOne({ _id: "null" }, { $set: { field: null } });
      await col.updateOne({ _id: "unset" }, { $unset: { field: "" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const nullDoc = await c2.db("db").collection("c").findOne({ _id: "null" });
      const unsetDoc = await c2.db("db").collection("c").findOne({ _id: "unset" });
      expect(nullDoc).toHaveProperty("field");
      expect(nullDoc?.field).toBeNull();
      expect(unsetDoc).not.toHaveProperty("field");
      await c2.close();
    });
  });

  describe("$rename survives reload", () => {
    it("old field absent, new field present after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "r1", oldName: "Alice" });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "r1" }, { $rename: { oldName: "newName" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "r1" });
      expect(doc).not.toHaveProperty("oldName");
      expect(doc?.newName).toBe("Alice");
      await c2.close();
    });

    it("old field is not null (was not just zeroed out) after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "r2", src: "hello", other: "world" });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "r2" }, { $rename: { src: "dst" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "r2" });
      expect(doc?.src).toBeUndefined();
      expect(doc?.dst).toBe("hello");
      expect(doc?.other).toBe("world");
      await c2.close();
    });

    it("$rename: old field not matched by $exists:true after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "r3", a: 5 });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "r3" }, { $rename: { a: "b" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const found = await c2
        .db("db")
        .collection("c")
        .find({ a: { $exists: true } } as never)
        .toArray();
      expect(found).toHaveLength(0);
      const doc = await c2
        .db("db")
        .collection("c")
        .findOne({ b: { $exists: true } } as never);
      expect(doc?.b).toBe(5);
      await c2.close();
    });
  });

  describe("replaceOne survives reload", () => {
    it("old fields absent after reload following replaceOne", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "rep1", a: 1, b: 2, c: 3 });
      await c1
        .db("db")
        .collection("c")
        .replaceOne({ _id: "rep1" }, { d: 4 } as never);
      const live = await c1.db("db").collection("c").findOne({ _id: "rep1" });
      expect(live).not.toHaveProperty("a");
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "rep1" });
      expect(doc).not.toHaveProperty("a");
      expect(doc).not.toHaveProperty("b");
      expect(doc).not.toHaveProperty("c");
      expect(doc?.d).toBe(4);
      await c2.close();
    });

    it("replaceOne with completely different schema — only new fields after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "rep2", x: 100, y: 200, label: "point" });
      await c1
        .db("db")
        .collection("c")
        .replaceOne({ _id: "rep2" }, { name: "Alice", score: 99 } as never);
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "rep2" });
      expect(doc?.name).toBe("Alice");
      expect(doc?.score).toBe(99);
      expect(doc).not.toHaveProperty("x");
      expect(doc).not.toHaveProperty("y");
      expect(doc).not.toHaveProperty("label");
      await c2.close();
    });

    it("replaceOne preserves _id after reload", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "preserve-id", v: 1 });
      await c1
        .db("db")
        .collection("c")
        .replaceOne({ _id: "preserve-id" }, { v: 2 } as never);
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "preserve-id" });
      expect(doc?._id).toBe("preserve-id");
      expect(doc?.v).toBe(2);
      await c2.close();
    });

    it("replaceOne on non-existing doc with upsert persists correctly", async () => {
      const c1 = createClient(tempDir);
      await c1
        .db("db")
        .collection("c")
        .replaceOne({ name: "Ghost" } as never, { name: "Ghost", score: 42 } as never, {
          upsert: true,
        });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2
        .db("db")
        .collection("c")
        .findOne({ name: "Ghost" } as never);
      expect(doc?.name).toBe("Ghost");
      expect(doc?.score).toBe(42);
      await c2.close();
    });
  });

  describe("compaction correctness", () => {
    it("$unset fields do not reappear after compaction", async () => {
      const client = createClient(tempDir);
      const col = client.db("db").collection("c");
      for (let i = 0; i < 6; i++) {
        await col.insertOne({ _id: `d${i}`, v: i, temp: `t${i}` });
      }
      for (let i = 0; i < 6; i++) {
        await col.updateOne({ _id: `d${i}` }, { $unset: { temp: "" } });
      }
      await col.compact();

      const docs = await col.find({}).toArray();
      for (const doc of docs) {
        expect(doc).not.toHaveProperty("temp");
      }
      await client.close();
    });

    it("replaceOne old fields do not reappear after compaction", async () => {
      const client = createClient(tempDir);
      const col = client.db("db").collection("c");
      for (let i = 0; i < 6; i++) {
        await col.insertOne({ _id: `r${i}`, old: i, extra: "discard" });
      }
      for (let i = 0; i < 6; i++) {
        await col.replaceOne({ _id: `r${i}` } as never, { fresh: i * 2 } as never);
      }
      await col.compact();

      const docs = await col.find({}).toArray();
      for (const doc of docs) {
        expect(doc).not.toHaveProperty("old");
        expect(doc).not.toHaveProperty("extra");
        expect(doc).toHaveProperty("fresh");
      }
      await client.close();
    });

    it("compact resets op counters correctly", async () => {
      const client = createClient(tempDir);
      const col = client.db("db").collection("c");
      for (let i = 0; i < 4; i++) {
        await col.insertOne({ _id: `x${i}`, v: i });
      }
      await col.deleteOne({ _id: "x0" } as never);
      await col.deleteOne({ _id: "x1" } as never);
      await col.compact();

      const count = await col.countDocuments();
      expect(count).toBe(2);
      await client.close();
    });
  });

  describe("combined operator persistence", () => {
    it("$set + $unset in same update persists correctly", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "co1", a: 1, b: 2 });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "co1" }, { $set: { c: 3 }, $unset: { a: "" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "co1" });
      expect(doc).not.toHaveProperty("a");
      expect(doc?.b).toBe(2);
      expect(doc?.c).toBe(3);
      await c2.close();
    });

    it("$set + $inc + $unset persists fully", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "co2", score: 10, tag: "old", extra: 99 });
      await c1
        .db("db")
        .collection("c")
        .updateOne(
          { _id: "co2" },
          { $inc: { score: 5 }, $set: { tag: "new" }, $unset: { extra: "" } }
        );
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "co2" });
      expect(doc?.score).toBe(15);
      expect(doc?.tag).toBe("new");
      expect(doc).not.toHaveProperty("extra");
      await c2.close();
    });
  });

  describe("basic data persistence", () => {
    it("inserts persist across client restart", async () => {
      const c1 = createClient(tempDir);
      await c1
        .db("db")
        .collection("c")
        .insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      await c1.close();

      const c2 = createClient(tempDir);
      const count = await c2.db("db").collection("c").countDocuments();
      expect(count).toBe(3);
      await c2.close();
    });

    it("deletes persist across client restart", async () => {
      const c1 = createClient(tempDir);
      const col = c1.db("db").collection("c");
      await col.insertMany([
        { _id: "a", v: 1 },
        { _id: "b", v: 2 },
      ]);
      await col.deleteOne({ _id: "a" } as never);
      await c1.close();

      const c2 = createClient(tempDir);
      const docs = await c2.db("db").collection("c").find({}).toArray();
      expect(docs).toHaveLength(1);
      expect(docs[0]?._id).toBe("b");
      await c2.close();
    });

    it("$inc increments persist across restart", async () => {
      const c1 = createClient(tempDir);
      await c1.db("db").collection("c").insertOne({ _id: "inc1", n: 10 });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "inc1" }, { $inc: { n: 5 } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "inc1" });
      expect(doc?.n).toBe(15);
      await c2.close();
    });

    it("array mutations persist correctly after reload", async () => {
      const c1 = createClient(tempDir);
      await c1
        .db("db")
        .collection("c")
        .insertOne({ _id: "arr1", tags: ["a", "b", "c"] });
      await c1
        .db("db")
        .collection("c")
        .updateOne({ _id: "arr1" }, { $pull: { tags: "b" } });
      await c1.close();

      const c2 = createClient(tempDir);
      const doc = await c2.db("db").collection("c").findOne({ _id: "arr1" });
      expect(doc?.tags).toEqual(["a", "c"]);
      await c2.close();
    });
  });
});
