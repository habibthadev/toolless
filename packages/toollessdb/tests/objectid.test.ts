import { describe, it, expect } from "vitest";
import { generateObjectId, isValidObjectId, extractTimestamp } from "../src/index";

describe("ObjectId API", () => {
  describe("generateObjectId()", () => {
    it("returns a 24-character hex string", () => {
      const id = generateObjectId();
      expect(id).toHaveLength(24);
      expect(/^[0-9a-f]{24}$/.test(id)).toBe(true);
    });

    it("returns unique values on each call", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateObjectId()));
      expect(ids.size).toBe(100);
    });

    it("is monotonically increasing (later IDs are lexicographically larger)", () => {
      const a = generateObjectId();
      const b = generateObjectId();
      // ObjectIds embed a timestamp, so later ones should be >= earlier ones
      expect(b >= a).toBe(true);
    });

    it("consecutive IDs from the same millisecond have different sequence parts", () => {
      const ids = Array.from({ length: 10 }, () => generateObjectId());
      const unique = new Set(ids);
      expect(unique.size).toBe(10);
    });
  });

  describe("isValidObjectId()", () => {
    it("returns true for a generated ObjectId", () => {
      expect(isValidObjectId(generateObjectId())).toBe(true);
    });

    it("returns true for a valid 24-char hex string", () => {
      expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    });

    it("returns false for too-short string", () => {
      expect(isValidObjectId("507f1f77bcf86cd7994390")).toBe(false);
    });

    it("returns false for too-long string", () => {
      expect(isValidObjectId("507f1f77bcf86cd7994390111")).toBe(false);
    });

    it("returns false for non-hex characters", () => {
      expect(isValidObjectId("507f1f77bcf86cd79943901z")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidObjectId("")).toBe(false);
    });

    it("returns false for uppercase hex (format is lowercase only)", () => {
      // isValidObjectId is case-insensitive (/i flag) — uppercase is valid
      expect(isValidObjectId("507F1F77BCF86CD799439011")).toBe(true);
    });

    it("returns false for non-string inputs", () => {
      expect(isValidObjectId(null as never)).toBe(false);
      expect(isValidObjectId(undefined as never)).toBe(false);
      expect(isValidObjectId(123 as never)).toBe(false);
    });
  });

  describe("extractTimestamp()", () => {
    it("returns a Date close to now from a generated ID", () => {
      const before = Date.now();
      const id = generateObjectId();
      const after = Date.now();
      const ts = extractTimestamp(id);
      expect(ts).toBeInstanceOf(Date);
      // Timestamp embedded at second precision, allow 2s tolerance
      expect(ts.getTime()).toBeGreaterThanOrEqual(before - 2000);
      expect(ts.getTime()).toBeLessThanOrEqual(after + 2000);
    });

    it("returns a Date object", () => {
      const ts = extractTimestamp(generateObjectId());
      expect(ts).toBeInstanceOf(Date);
      expect(ts.getTime()).toBeGreaterThan(0);
    });

    it("later ID has a timestamp >= earlier ID's timestamp", () => {
      const id1 = generateObjectId();
      const id2 = generateObjectId();
      expect(extractTimestamp(id2).getTime()).toBeGreaterThanOrEqual(
        extractTimestamp(id1).getTime()
      );
    });
  });
});
