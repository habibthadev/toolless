import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("Update operators — exhaustive", () => {
  let tempDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-update-"));
    client = createClient({ path: tempDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("$set", () => {
    it("sets top-level fields", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "s1", a: 1 });
      await col.updateOne({ _id: "s1" }, { $set: { a: 99, b: "new" } });
      const doc = await col.findOne({ _id: "s1" });
      expect(doc?.a).toBe(99);
      expect(doc?.b).toBe("new");
    });

    it("sets nested fields via dot-notation", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "s2", user: { name: "old" } });
      await col.updateOne({ _id: "s2" }, { $set: { "user.name": "new" } });
      const doc = await col.findOne({ _id: "s2" });
      expect((doc?.user as { name: string })?.name).toBe("new");
    });

    it("creates intermediate objects for deep nested sets", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "s3" });
      await col.updateOne({ _id: "s3" }, { $set: { "a.b.c": 42 } });
      const doc = await col.findOne({ _id: "s3" });
      expect(((doc?.a as Record<string, unknown>)?.b as Record<string, unknown>)?.c).toBe(42);
    });

    it("sets a field to null (distinct from unsetting)", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "s4", v: 10 });
      await col.updateOne({ _id: "s4" }, { $set: { v: null } });
      const doc = await col.findOne({ _id: "s4" });
      expect(doc).toHaveProperty("v");
      expect(doc?.v).toBeNull();
    });

    it("throws ImmutableFieldError when trying to $set _id", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "s5", v: 1 });
      const { ImmutableFieldError } = await import("../src/index");
      await expect(col.updateOne({ _id: "s5" }, { $set: { _id: "other" } })).rejects.toBeInstanceOf(
        ImmutableFieldError
      );
    });
  });

  describe("$unset", () => {
    it("removes a field from a document", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "u1", a: 1, b: 2 });
      await col.updateOne({ _id: "u1" }, { $unset: { a: "" } });
      const doc = await col.findOne({ _id: "u1" });
      expect(doc).not.toHaveProperty("a");
      expect(doc?.b).toBe(2);
    });

    it("is a no-op on a non-existent field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "u2", v: 1 });
      await col.updateOne({ _id: "u2" }, { $unset: { missing: "" } });
      const doc = await col.findOne({ _id: "u2" });
      expect(doc?.v).toBe(1);
    });

    it("throws ImmutableFieldError when trying to $unset _id", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "u3" });
      const { ImmutableFieldError } = await import("../src/index");
      await expect(col.updateOne({ _id: "u3" }, { $unset: { _id: "" } })).rejects.toBeInstanceOf(
        ImmutableFieldError
      );
    });
  });

  describe("$inc", () => {
    it("increments a field by positive value", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "i1", n: 5 });
      await col.updateOne({ _id: "i1" }, { $inc: { n: 3 } });
      const doc = await col.findOne({ _id: "i1" });
      expect(doc?.n).toBe(8);
    });

    it("decrements with negative value", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "i2", n: 10 });
      await col.updateOne({ _id: "i2" }, { $inc: { n: -4 } });
      const doc = await col.findOne({ _id: "i2" });
      expect(doc?.n).toBe(6);
    });

    it("creates field at 0 + increment when field doesn't exist", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "i3" });
      await col.updateOne({ _id: "i3" }, { $inc: { counter: 1 } });
      const doc = await col.findOne({ _id: "i3" });
      expect(doc?.counter).toBe(1);
    });
  });

  describe("$mul", () => {
    it("multiplies an existing field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "m1", v: 4 });
      await col.updateOne({ _id: "m1" }, { $mul: { v: 3 } });
      const doc = await col.findOne({ _id: "m1" });
      expect(doc?.v).toBe(12);
    });

    it("creates field as 0 when field doesn't exist (0 * n = 0)", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "m2" });
      await col.updateOne({ _id: "m2" }, { $mul: { v: 5 } });
      const doc = await col.findOne({ _id: "m2" });
      expect(doc?.v).toBe(0);
    });
  });

  describe("$push", () => {
    it("appends to an array", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "p1", arr: [1, 2] });
      await col.updateOne({ _id: "p1" }, { $push: { arr: 3 } });
      const doc = await col.findOne({ _id: "p1" });
      expect(doc?.arr).toEqual([1, 2, 3]);
    });

    it("creates array when field doesn't exist", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "p2" });
      await col.updateOne({ _id: "p2" }, { $push: { arr: "first" } });
      const doc = await col.findOne({ _id: "p2" });
      expect(doc?.arr).toEqual(["first"]);
    });

    it("$push with $each appends multiple values", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "p3", arr: [1] });
      await col.updateOne({ _id: "p3" }, { $push: { arr: { $each: [2, 3, 4] } } });
      const doc = await col.findOne({ _id: "p3" });
      expect(doc?.arr).toEqual([1, 2, 3, 4]);
    });

    it("throws when pushing to a non-array field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "p4", v: "not-array" });
      const { InvalidOperationError } = await import("../src/index");
      await expect(col.updateOne({ _id: "p4" }, { $push: { v: 1 } })).rejects.toBeInstanceOf(
        InvalidOperationError
      );
    });
  });

  describe("$pull", () => {
    it("removes elements equal to condition", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "pl1", arr: [1, 2, 3, 2, 1] });
      await col.updateOne({ _id: "pl1" }, { $pull: { arr: 2 } });
      const doc = await col.findOne({ _id: "pl1" });
      expect(doc?.arr).toEqual([1, 3, 1]);
    });

    it("removes object elements matching by deep equality", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({
        _id: "pl2",
        items: [{ name: "a" }, { name: "b" }, { name: "a" }],
      });
      await col.updateOne({ _id: "pl2" }, { $pull: { items: { name: "a" } } });
      const doc = await col.findOne({ _id: "pl2" });
      expect(doc?.items).toEqual([{ name: "b" }]);
    });

    it("is a no-op when element not found", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "pl3", arr: [1, 2, 3] });
      await col.updateOne({ _id: "pl3" }, { $pull: { arr: 99 } });
      const doc = await col.findOne({ _id: "pl3" });
      expect(doc?.arr).toEqual([1, 2, 3]);
    });

    it("is a no-op on non-array field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "pl4", v: "not-array" });
      await col.updateOne({ _id: "pl4" }, { $pull: { v: "not-array" } });
      const doc = await col.findOne({ _id: "pl4" });
      expect(doc?.v).toBe("not-array");
    });
  });

  describe("$pop", () => {
    it("removes last element with direction 1", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "pop1", arr: [1, 2, 3] });
      await col.updateOne({ _id: "pop1" }, { $pop: { arr: 1 } });
      const doc = await col.findOne({ _id: "pop1" });
      expect(doc?.arr).toEqual([1, 2]);
    });

    it("removes first element with direction -1", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "pop2", arr: [1, 2, 3] });
      await col.updateOne({ _id: "pop2" }, { $pop: { arr: -1 } });
      const doc = await col.findOne({ _id: "pop2" });
      expect(doc?.arr).toEqual([2, 3]);
    });

    it("is a no-op on non-array field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "pop3", v: "not-array" });
      await col.updateOne({ _id: "pop3" }, { $pop: { v: 1 } });
      const doc = await col.findOne({ _id: "pop3" });
      expect(doc?.v).toBe("not-array");
    });
  });

  describe("$addToSet", () => {
    it("adds a unique element", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "ats1", arr: [1, 2] });
      await col.updateOne({ _id: "ats1" }, { $addToSet: { arr: 3 } });
      const doc = await col.findOne({ _id: "ats1" });
      expect(doc?.arr).toEqual([1, 2, 3]);
    });

    it("does not add duplicate element", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "ats2", arr: [1, 2, 3] });
      await col.updateOne({ _id: "ats2" }, { $addToSet: { arr: 2 } });
      const doc = await col.findOne({ _id: "ats2" });
      expect(doc?.arr).toEqual([1, 2, 3]);
    });

    it("$addToSet with $each adds only unique values", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "ats3", arr: [1, 2] });
      await col.updateOne({ _id: "ats3" }, { $addToSet: { arr: { $each: [2, 3, 4, 2] } } });
      const doc = await col.findOne({ _id: "ats3" });
      expect(doc?.arr).toEqual([1, 2, 3, 4]);
    });

    it("creates array when field doesn't exist", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "ats4" });
      await col.updateOne({ _id: "ats4" }, { $addToSet: { arr: "first" } });
      const doc = await col.findOne({ _id: "ats4" });
      expect(doc?.arr).toEqual(["first"]);
    });

    it("throws when $addToSet on non-array field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "ats5", v: "not-array" });
      const { InvalidOperationError } = await import("../src/index");
      await expect(
        col.updateOne({ _id: "ats5" }, { $addToSet: { v: "x" } })
      ).rejects.toBeInstanceOf(InvalidOperationError);
    });
  });

  describe("$rename", () => {
    it("renames a field", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "rn1", old: "value" });
      await col.updateOne({ _id: "rn1" }, { $rename: { old: "new" } });
      const doc = await col.findOne({ _id: "rn1" });
      expect(doc).not.toHaveProperty("old");
      expect(doc?.new).toBe("value");
    });

    it("is a no-op when source field doesn't exist", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "rn2", v: 1 });
      await col.updateOne({ _id: "rn2" }, { $rename: { missing: "dst" } });
      const doc = await col.findOne({ _id: "rn2" });
      expect(doc).not.toHaveProperty("dst");
      expect(doc?.v).toBe(1);
    });

    it("throws ImmutableFieldError when renaming _id", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "rn3" });
      const { ImmutableFieldError } = await import("../src/index");
      await expect(
        col.updateOne({ _id: "rn3" }, { $rename: { _id: "newId" } })
      ).rejects.toBeInstanceOf(ImmutableFieldError);
    });
  });

  describe("$min and $max", () => {
    it("$min does not update when current is already smaller", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "mn1", score: 30 });
      await col.updateOne({ _id: "mn1" }, { $min: { score: 50 } });
      const doc = await col.findOne({ _id: "mn1" });
      expect(doc?.score).toBe(30);
    });

    it("$min updates when new value is smaller", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "mn2", score: 50 });
      await col.updateOne({ _id: "mn2" }, { $min: { score: 20 } });
      const doc = await col.findOne({ _id: "mn2" });
      expect(doc?.score).toBe(20);
    });

    it("$max does not update when current is already larger", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "mx1", score: 100 });
      await col.updateOne({ _id: "mx1" }, { $max: { score: 50 } });
      const doc = await col.findOne({ _id: "mx1" });
      expect(doc?.score).toBe(100);
    });

    it("$max updates when new value is larger", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "mx2", score: 50 });
      await col.updateOne({ _id: "mx2" }, { $max: { score: 100 } });
      const doc = await col.findOne({ _id: "mx2" });
      expect(doc?.score).toBe(100);
    });

    it("$min sets field when it doesn't exist", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "mn3" });
      await col.updateOne({ _id: "mn3" }, { $min: { score: 42 } });
      const doc = await col.findOne({ _id: "mn3" });
      expect(doc?.score).toBe(42);
    });
  });

  describe("$currentDate", () => {
    it("sets a date when spec is true", async () => {
      const col = client.db("db").collection("c");
      const before = Date.now();
      await col.insertOne({ _id: "cd1" });
      await col.updateOne({ _id: "cd1" }, { $currentDate: { updatedAt: true } });
      const after = Date.now();
      const doc = await col.findOne({ _id: "cd1" });
      const ts = new Date(doc?.updatedAt as string).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it("sets a timestamp when spec is {$type: timestamp}", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "cd2" });
      await col.updateOne({ _id: "cd2" }, { $currentDate: { ts: { $type: "timestamp" } } });
      const doc = await col.findOne({ _id: "cd2" });
      expect(typeof doc?.ts).toBe("number");
    });
  });

  describe("multiple operators in same update", () => {
    it("applies all operators atomically", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ _id: "multi", a: 10, b: "old", arr: [1, 2], extra: "remove" });
      await col.updateOne(
        { _id: "multi" },
        {
          $inc: { a: 5 },
          $set: { b: "new" },
          $push: { arr: 3 },
          $unset: { extra: "" },
        }
      );
      const doc = await col.findOne({ _id: "multi" });
      expect(doc?.a).toBe(15);
      expect(doc?.b).toBe("new");
      expect(doc?.arr).toEqual([1, 2, 3]);
      expect(doc).not.toHaveProperty("extra");
    });
  });

  describe("updateMany", () => {
    it("updates all matching documents", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { _id: "1", active: true, score: 10 },
        { _id: "2", active: true, score: 20 },
        { _id: "3", active: false, score: 30 },
      ]);
      const result = await col.updateMany({ active: true } as never, { $inc: { score: 5 } });
      expect(result.matchedCount).toBe(2);
      expect(result.modifiedCount).toBe(2);

      const doc1 = await col.findOne({ _id: "1" });
      const doc2 = await col.findOne({ _id: "2" });
      const doc3 = await col.findOne({ _id: "3" });
      expect(doc1?.score).toBe(15);
      expect(doc2?.score).toBe(25);
      expect(doc3?.score).toBe(30);
    });

    it("returns correct counts when no match", async () => {
      const col = client.db("db").collection("c");
      await col.insertOne({ v: 1 });
      const result = await col.updateMany({ v: 999 } as never, { $set: { touched: true } });
      expect(result.matchedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);
    });
  });
});
