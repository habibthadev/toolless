import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  createClient,
  ToollessError,
  DuplicateKeyError,
  ValidationError,
  ImmutableFieldError,
  CollectionDroppedError,
  LockError,
} from "../src/index";
import { z } from "zod";
import { spawn } from "node:child_process";

describe("Error Types", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-error-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("ToollessError base class", () => {
    it("should be the base class for all toolless errors", () => {
      const errors = [
        new DuplicateKeyError("_id", "test-id"),
        new ValidationError("test", []),
        new ImmutableFieldError("_id"),
        new CollectionDroppedError("test"),
        new LockError("test", "/test/path"),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(ToollessError);
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should have correct name and code properties", () => {
      const duplicateError = new DuplicateKeyError("field", "value");
      expect(duplicateError.name).toBe("DuplicateKeyError");
      expect(duplicateError.code).toBe("DUPLICATE_KEY_ERROR");

      const validationError = new ValidationError("test", []);
      expect(validationError.name).toBe("ValidationError");
      expect(validationError.code).toBe("VALIDATION_ERROR");

      const immutableError = new ImmutableFieldError("_id");
      expect(immutableError.name).toBe("ImmutableFieldError");
      expect(immutableError.code).toBe("IMMUTABLE_FIELD_ERROR");

      const droppedError = new CollectionDroppedError("test");
      expect(droppedError.name).toBe("CollectionDroppedError");
      expect(droppedError.code).toBe("COLLECTION_DROPPED_ERROR");

      const lockError = new LockError("test", "/path");
      expect(lockError.name).toBe("LockError");
      expect(lockError.code).toBe("LOCK_ERROR");
    });
  });

  describe("DuplicateKeyError", () => {
    it("should be thrown when inserting document with duplicate _id", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      await expect(collection.insertOne({ _id: "user-1", name: "Bob" })).rejects.toThrow(
        DuplicateKeyError
      );

      await expect(collection.insertOne({ _id: "user-1", name: "Bob" })).rejects.toMatchObject({
        field: "_id",
        value: "user-1",
        code: "DUPLICATE_KEY_ERROR",
      });

      await client.close();
    });

    it("should be thrown when inserting many with duplicate _id", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await expect(
        collection.insertMany([
          { _id: "dup-id", name: "Alice" },
          { _id: "dup-id", name: "Bob" },
        ])
      ).rejects.toThrow(DuplicateKeyError);

      await client.close();
    });

    it("should be thrown on unique index violation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.createIndex({ email: 1 }, { unique: true });
      await collection.insertOne({ email: "alice@example.com", name: "Alice" });

      await expect(
        collection.insertOne({ email: "alice@example.com", name: "Bob" })
      ).rejects.toThrow(DuplicateKeyError);

      await expect(
        collection.insertOne({ email: "alice@example.com", name: "Bob" })
      ).rejects.toMatchObject({
        field: "email",
        value: "alice@example.com",
        code: "DUPLICATE_KEY_ERROR",
      });

      await client.close();
    });

    it("should have proper error message", () => {
      const error = new DuplicateKeyError("email", "test@example.com");
      expect(error.message).toBe(
        'Duplicate key error: field "email" with value "test@example.com" already exists'
      );
    });

    it("should store field and value properties", () => {
      const error = new DuplicateKeyError("userId", 12345);
      expect(error.field).toBe("userId");
      expect(error.value).toBe(12345);
    });
  });

  describe("ValidationError", () => {
    const userSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive(),
    });

    it("should be thrown when document fails schema validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users", { schema: userSchema });

      await expect(collection.insertOne({ name: "", email: "invalid", age: -5 })).rejects.toThrow(
        ValidationError
      );

      await client.close();
    });

    it("should include issues array with validation details", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users", { schema: userSchema });

      try {
        await collection.insertOne({ name: "", email: "invalid", age: -5 });
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;

        expect(validationError.issues).toBeInstanceOf(Array);
        expect(validationError.issues.length).toBeGreaterThan(0);

        for (const issue of validationError.issues) {
          expect(issue).toHaveProperty("code");
          expect(issue).toHaveProperty("message");
          expect(issue).toHaveProperty("path");
          expect(Array.isArray(issue.path)).toBe(true);
        }
      }

      await client.close();
    });

    it("should capture specific validation issues", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users", { schema: userSchema });

      try {
        await collection.insertOne({ name: "Alice", email: "not-an-email", age: 25 });
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;

        const emailIssue = validationError.issues.find((i) => i.path.includes("email"));
        expect(emailIssue).toBeDefined();
      }

      await client.close();
    });

    it("should validate on updateOne when schema exists", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users", { schema: userSchema });

      await collection.insertOne({ name: "Alice", email: "alice@example.com", age: 25 });

      await expect(collection.updateOne({ name: "Alice" }, { $set: { age: -10 } })).rejects.toThrow(
        ValidationError
      );

      await client.close();
    });

    it("should have correct code property", () => {
      const error = new ValidationError("Test validation failed", [
        {
          code: "too_small",
          message: "String must contain at least 1 character(s)",
          path: ["name"],
        },
      ]);

      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Test validation failed");
    });
  });

  describe("ImmutableFieldError", () => {
    it("should be thrown when attempting to modify _id via $set", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      await expect(
        collection.updateOne({ _id: "user-1" }, { $set: { _id: "new-id" } })
      ).rejects.toThrow(ImmutableFieldError);

      await expect(
        collection.updateOne({ _id: "user-1" }, { $set: { _id: "new-id" } })
      ).rejects.toMatchObject({
        field: "_id",
        code: "IMMUTABLE_FIELD_ERROR",
      });

      await client.close();
    });

    it("should be thrown when attempting to rename _id field", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      await expect(
        collection.updateOne({ _id: "user-1" }, { $rename: { _id: "newId" } })
      ).rejects.toThrow(ImmutableFieldError);

      await client.close();
    });

    it("should be thrown when attempting to rename field to _id", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice", userId: "test" });

      await expect(
        collection.updateOne({ _id: "user-1" }, { $rename: { userId: "_id" } })
      ).rejects.toThrow(ImmutableFieldError);

      await client.close();
    });

    it("should be thrown when attempting to $unset _id", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      await expect(
        collection.updateOne({ _id: "user-1" }, { $unset: { _id: "" } })
      ).rejects.toThrow(ImmutableFieldError);

      await client.close();
    });

    it("should be thrown when attempting to $inc _id", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection.updateOne({ _id: "user-1" }, { $inc: { _id: 1 } } as any)
      ).rejects.toThrow(ImmutableFieldError);

      await client.close();
    });

    it("should be thrown when replacing document with different _id", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection.replaceOne({ _id: "user-1" }, { _id: "different-id", name: "Bob" } as any)
      ).rejects.toThrow(ImmutableFieldError);

      await client.close();
    });

    it("should have proper error message", () => {
      const error = new ImmutableFieldError("_id");
      expect(error.message).toBe('Cannot modify immutable field: "_id"');
      expect(error.field).toBe("_id");
    });
  });

  describe("CollectionDroppedError", () => {
    it("should be thrown when performing operations on dropped collection", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      await expect(collection.findOne({})).rejects.toThrow(CollectionDroppedError);

      await client.close();
    });

    it("should be thrown on insertOne after drop", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      await expect(collection.insertOne({ name: "Bob" })).rejects.toMatchObject({
        collectionName: "users",
        code: "COLLECTION_DROPPED_ERROR",
      });

      await client.close();
    });

    it("should be thrown on updateOne after drop", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      await expect(collection.updateOne({}, { $set: { name: "Bob" } })).rejects.toThrow(
        CollectionDroppedError
      );

      await client.close();
    });

    it("should be thrown on deleteOne after drop", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      await expect(collection.deleteOne({})).rejects.toThrow(CollectionDroppedError);

      await client.close();
    });

    it("should be thrown on find after drop", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      expect(() => collection.find({})).toThrow(CollectionDroppedError);

      await client.close();
    });

    it("should be thrown on countDocuments after drop", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      await expect(collection.countDocuments()).rejects.toThrow(CollectionDroppedError);

      await client.close();
    });

    it("should be thrown on createIndex after drop", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ name: "Alice" });
      await collection.drop();

      await expect(collection.createIndex({ name: 1 })).rejects.toThrow(CollectionDroppedError);

      await client.close();
    });

    it("should have proper error message and collectionName property", () => {
      const error = new CollectionDroppedError("my_collection");
      expect(error.message).toBe('Collection "my_collection" has been dropped');
      expect(error.collectionName).toBe("my_collection");
    });
  });

  describe("LockError", () => {
    it("should be thrown when database is already locked by another process", async () => {
      const testDbPath = path.join(tempDir, "locktest");

      const childScript = `
        const { createClient } = require('${path.join(__dirname, "..", "dist", "index.js").replace(/\\/g, "\\\\")}');
        const client = createClient({ path: '${testDbPath.replace(/\\/g, "\\\\")}' });
        const db = client.db('test');
        db.collection('users');
        
        process.send({ status: 'locked' });
        
        process.on('message', (msg) => {
          if (msg === 'release') {
            client.close().then(() => {
              process.exit(0);
            });
          }
        });
      `;

      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, ["-e", childScript], {
          stdio: ["pipe", "pipe", "pipe", "ipc"],
        });

        let childOutput = "";
        child.stdout?.on("data", (data) => {
          childOutput += data;
        });
        child.stderr?.on("data", (data) => {
          childOutput += data;
        });

        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error("Timeout waiting for child process"));
        }, 10000);

        child.on("message", async (msg: { status: string }) => {
          if (msg.status === "locked") {
            try {
              const client2 = createClient({ path: testDbPath });

              expect(() => {
                client2.db("test");
              }).toThrow(LockError);

              try {
                client2.db("test");
              } catch (error) {
                expect(error).toBeInstanceOf(LockError);
                const lockError = error as LockError;
                expect(lockError.code).toBe("LOCK_ERROR");
                expect(lockError.pid).toBeDefined();
                expect(typeof lockError.pid).toBe("number");
                expect(lockError.lockPath).toContain("_lock");
              }

              child.send("release");
              clearTimeout(timeout);
              resolve();
            } catch (error) {
              child.kill();
              clearTimeout(timeout);
              reject(error);
            }
          }
        });

        child.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        child.on("exit", (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(timeout);
            reject(new Error(`Child process exited with code ${code}: ${childOutput}`));
          }
        });
      });
    });

    it("should have proper error message with PID", () => {
      const error = new LockError(
        "Database is locked by another process (PID: 12345)",
        "/test/path/_lock",
        12345
      );
      expect(error.message).toBe("Database is locked by another process (PID: 12345)");
      expect(error.pid).toBe(12345);
      expect(error.lockPath).toBe("/test/path/_lock");
    });

    it("should work without PID", () => {
      const error = new LockError("Database is locked", "/test/path/_lock");
      expect(error.pid).toBeUndefined();
      expect(error.lockPath).toBe("/test/path/_lock");
    });
  });

  describe("Error inheritance and properties", () => {
    it("all errors should be catchable as ToollessError", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");
      const collection = db.collection("users");

      await collection.insertOne({ _id: "user-1", name: "Alice" });

      try {
        await collection.insertOne({ _id: "user-1", name: "Bob" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ToollessError);
        expect((error as ToollessError).code).toBe("DUPLICATE_KEY_ERROR");
      }

      await client.close();
    });

    it("errors should have stack traces", () => {
      const errors = [
        new DuplicateKeyError("_id", "test"),
        new ValidationError("test", []),
        new ImmutableFieldError("_id"),
        new CollectionDroppedError("test"),
        new LockError("test", "/path"),
      ];

      for (const error of errors) {
        expect(error.stack).toBeDefined();
        expect(typeof error.stack).toBe("string");
        expect(error.stack!.length).toBeGreaterThan(0);
      }
    });

    it("errors should be serializable to JSON with code", () => {
      const error = new DuplicateKeyError("email", "test@example.com");
      const json = JSON.stringify({
        name: error.name,
        message: error.message,
        code: error.code,
        field: error.field,
        value: error.value,
      });

      const parsed = JSON.parse(json);
      expect(parsed.code).toBe("DUPLICATE_KEY_ERROR");
      expect(parsed.field).toBe("email");
    });
  });
});
