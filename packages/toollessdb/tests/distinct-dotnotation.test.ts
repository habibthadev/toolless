import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient } from "../src/index";

describe("distinct() — dot-notation and edge cases", () => {
  let tempDir: string;
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-distinct-"));
    client = createClient({ path: tempDir });
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("dot-notation field paths", () => {
    it("returns distinct values for a single level of nesting", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { address: { city: "NYC" } },
        { address: { city: "LA" } },
        { address: { city: "NYC" } },
        { address: { city: "London" } },
      ]);

      const cities = await col.distinct("address.city" as never);
      expect(cities.sort()).toEqual(["LA", "London", "NYC"]);
    });

    it("returns distinct values for deeply nested path", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { a: { b: { c: 1 } } },
        { a: { b: { c: 2 } } },
        { a: { b: { c: 1 } } },
        { a: { b: { c: 3 } } },
      ]);

      const vals = await col.distinct("a.b.c" as never);
      expect(vals.sort()).toEqual([1, 2, 3]);
    });

    it("excludes docs missing intermediate path node", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { user: { role: "admin" } },
        { user: { role: "editor" } },
        { other: "no user" },
      ]);

      const roles = await col.distinct("user.role" as never);
      expect(roles.sort()).toEqual(["admin", "editor"]);
    });

    it("works with filter on nested path", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { region: "east", meta: { tier: "A" } },
        { region: "west", meta: { tier: "B" } },
        { region: "east", meta: { tier: "B" } },
        { region: "west", meta: { tier: "C" } },
      ]);

      const tiers = await col.distinct("meta.tier" as never, { region: "east" } as never);
      expect(tiers.sort()).toEqual(["A", "B"]);
    });
  });

  describe("shallow field paths still work", () => {
    it("returns distinct values for a top-level field", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ status: "active" }, { status: "inactive" }, { status: "active" }]);
      const statuses = await col.distinct("status" as never);
      expect(statuses.sort()).toEqual(["active", "inactive"]);
    });

    it("distinct on numeric field", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ score: 10 }, { score: 20 }, { score: 10 }, { score: 30 }]);
      const scores = await col.distinct("score" as never);
      expect(scores.sort((a: unknown, b: unknown) => (a as number) - (b as number))).toEqual([
        10, 20, 30,
      ]);
    });

    it("distinct excludes docs where field is undefined", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([{ v: 1 }, { v: 2 }, { other: "no v" }, { v: 1 }]);
      const vals = await col.distinct("v" as never);
      expect(vals.sort()).toEqual([1, 2]);
    });

    it("distinct returns empty array on empty collection", async () => {
      const col = client.db("db").collection("c");
      const vals = await col.distinct("field" as never);
      expect(vals).toEqual([]);
    });

    it("distinct with filter narrows results", async () => {
      const col = client.db("db").collection("c");
      await col.insertMany([
        { type: "fruit", name: "apple" },
        { type: "fruit", name: "banana" },
        { type: "veg", name: "carrot" },
      ]);
      const names = await col.distinct("name" as never, { type: "fruit" } as never);
      expect(names.sort()).toEqual(["apple", "banana"]);
    });
  });
});
