import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createClient, ValidationError } from "../src/index";
import { z } from "zod";

describe("Schema Validation", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolless-schema-test-"));
  });

  afterEach(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("schema validation on insert", () => {
    it("valid document passes validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const UserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().int().positive(),
      });

      const users = db.collection("users", { schema: UserSchema });

      const { insertedId } = await users.insertOne({
        name: "Alice",
        email: "alice@example.com",
        age: 30,
      });

      expect(insertedId).toBeDefined();
      expect(typeof insertedId).toBe("string");

      const user = await users.findOne({ _id: insertedId });
      expect(user).toMatchObject({
        name: "Alice",
        email: "alice@example.com",
        age: 30,
      });

      await client.close();
    });

    it("invalid document throws ValidationError", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const UserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().int().positive(),
      });

      const users = db.collection("users", { schema: UserSchema });

      await expect(
        users.insertOne({
          name: "Bob",
          email: "invalid-email", // Invalid email format
          age: 25,
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("insertMany validates all documents", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ItemSchema = z.object({
        name: z.string().min(1),
        quantity: z.number().nonnegative(),
      });

      const items = db.collection("items", { schema: ItemSchema });

      // All valid documents should pass
      const { insertedCount } = await items.insertMany([
        { name: "Item A", quantity: 10 },
        { name: "Item B", quantity: 20 },
      ]);
      expect(insertedCount).toBe(2);

      // One invalid document should cause failure
      await expect(
        items.insertMany([
          { name: "Item C", quantity: 30 },
          { name: "", quantity: 40 }, // Empty name is invalid
        ])
      ).rejects.toThrow(ValidationError);

      await client.close();
    });
  });

  describe("schema validation on update", () => {
    it("$set with invalid value throws ValidationError", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ProductSchema = z.object({
        name: z.string(),
        price: z.number().positive(),
        inStock: z.boolean(),
      });

      const products = db.collection("products", { schema: ProductSchema });

      const { insertedId } = await products.insertOne({
        name: "Widget",
        price: 9.99,
        inStock: true,
      });

      // Valid update should pass
      await products.updateOne({ _id: insertedId }, { $set: { price: 14.99 } });

      // Invalid update should throw
      await expect(
        products.updateOne(
          { _id: insertedId },
          { $set: { price: -5 } } // Negative price is invalid
        )
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("updateMany with invalid value throws ValidationError", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const TaskSchema = z.object({
        title: z.string().min(1),
        priority: z.number().int().min(1).max(5),
        completed: z.boolean(),
      });

      const tasks = db.collection("tasks", { schema: TaskSchema });

      await tasks.insertMany([
        { title: "Task 1", priority: 1, completed: false },
        { title: "Task 2", priority: 2, completed: false },
      ]);

      // Valid updateMany
      await tasks.updateMany({ completed: false }, { $set: { priority: 3 } });

      // Invalid updateMany should throw
      await expect(
        tasks.updateMany(
          { completed: false },
          { $set: { priority: 10 } } // Priority > 5 is invalid
        )
      ).rejects.toThrow(ValidationError);

      await client.close();
    });
  });

  describe("schema validation on replace", () => {
    it("invalid replacement throws ValidationError", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ProfileSchema = z.object({
        username: z.string().min(3).max(20),
        bio: z.string().max(200),
        active: z.boolean(),
      });

      const profiles = db.collection("profiles", { schema: ProfileSchema });

      const { insertedId } = await profiles.insertOne({
        username: "johndoe",
        bio: "Hello world",
        active: true,
      });

      // Valid replacement should pass
      await profiles.replaceOne(
        { _id: insertedId },
        { username: "janedoe", bio: "New bio", active: false }
      );

      // Invalid replacement should throw
      await expect(
        profiles.replaceOne(
          { _id: insertedId },
          { username: "ab", bio: "Short username", active: true } // Username too short
        )
      ).rejects.toThrow(ValidationError);

      await client.close();
    });
  });

  describe("ValidationError contains Zod issues array", () => {
    it("issues array contains detailed error information", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const PersonSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        age: z.number().int().positive("Age must be positive"),
        email: z.string().email("Invalid email format"),
      });

      const people = db.collection("people", { schema: PersonSchema });

      try {
        await people.insertOne({
          name: "A", // Too short
          age: -5, // Negative
          email: "not-an-email", // Invalid format
        });
        expect.fail("Should have thrown ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;

        expect(validationErr.issues).toBeDefined();
        expect(Array.isArray(validationErr.issues)).toBe(true);
        expect(validationErr.issues.length).toBeGreaterThanOrEqual(3);

        // Check that issues have expected structure
        for (const issue of validationErr.issues) {
          expect(issue).toHaveProperty("path");
          expect(issue).toHaveProperty("message");
          expect(Array.isArray(issue.path)).toBe(true);
        }

        // Check specific paths are present
        const paths = validationErr.issues.map((i) => i.path.join("."));
        expect(paths).toContain("name");
        expect(paths).toContain("age");
        expect(paths).toContain("email");
      }

      await client.close();
    });

    it("issues contain Zod error codes", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const DataSchema = z.object({
        count: z.number().int(),
        status: z.enum(["pending", "active", "completed"]),
      });

      const data = db.collection("data", { schema: DataSchema });

      try {
        await data.insertOne({
          count: 3.5, // Not an integer
          status: "invalid", // Not in enum
        });
        expect.fail("Should have thrown ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;

        // Check that issues have code property
        for (const issue of validationErr.issues) {
          expect(issue).toHaveProperty("code");
          expect(typeof issue.code).toBe("string");
        }
      }

      await client.close();
    });
  });

  describe("nested object validation", () => {
    it("validates nested structures", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const AddressSchema = z.object({
        street: z.string().min(1),
        city: z.string().min(1),
        postalCode: z.string().regex(/^\d{5}$/, "Must be 5 digits"),
      });

      const CustomerSchema = z.object({
        name: z.string(),
        address: AddressSchema,
      });

      const customers = db.collection("customers", { schema: CustomerSchema });

      // Valid nested object
      await customers.insertOne({
        name: "Alice",
        address: {
          street: "123 Main St",
          city: "Springfield",
          postalCode: "12345",
        },
      });

      // Invalid nested object
      await expect(
        customers.insertOne({
          name: "Bob",
          address: {
            street: "456 Oak Ave",
            city: "Shelbyville",
            postalCode: "ABCDE", // Invalid postal code
          },
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("ValidationError path includes nested field path", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ContactSchema = z.object({
        name: z.string(),
        info: z.object({
          phone: z.string().min(10),
          email: z.string().email(),
        }),
      });

      const contacts = db.collection("contacts", { schema: ContactSchema });

      try {
        await contacts.insertOne({
          name: "Charlie",
          info: {
            phone: "123", // Too short
            email: "invalid", // Not an email
          },
        });
        expect.fail("Should have thrown ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;

        const paths = validationErr.issues.map((i) => i.path.join("."));
        expect(paths).toContain("info.phone");
        expect(paths).toContain("info.email");
      }

      await client.close();
    });

    it("deeply nested validation works", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const DeepSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              value: z.number().positive(),
            }),
          }),
        }),
      });

      const deep = db.collection("deep", { schema: DeepSchema });

      // Valid deeply nested
      await deep.insertOne({
        level1: {
          level2: {
            level3: {
              value: 42,
            },
          },
        },
      });

      // Invalid deeply nested
      try {
        await deep.insertOne({
          level1: {
            level2: {
              level3: {
                value: -1, // Invalid
              },
            },
          },
        });
        expect.fail("Should have thrown ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;

        const paths = validationErr.issues.map((i) => i.path.join("."));
        expect(paths).toContain("level1.level2.level3.value");
      }

      await client.close();
    });
  });

  describe("array validation", () => {
    it("validates array elements", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ArticleSchema = z.object({
        title: z.string(),
        tags: z.array(z.string().min(1)),
        scores: z.array(z.number().int().min(0).max(100)),
      });

      const articles = db.collection("articles", { schema: ArticleSchema });

      // Valid arrays
      await articles.insertOne({
        title: "My Article",
        tags: ["tech", "news", "update"],
        scores: [85, 90, 78],
      });

      // Invalid array element (empty tag)
      await expect(
        articles.insertOne({
          title: "Another Article",
          tags: ["valid", ""], // Empty string is invalid
          scores: [100],
        })
      ).rejects.toThrow(ValidationError);

      // Invalid array element (score out of range)
      await expect(
        articles.insertOne({
          title: "Third Article",
          tags: ["test"],
          scores: [50, 150], // 150 > 100
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("validates array of objects", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const OrderSchema = z.object({
        orderId: z.string(),
        items: z.array(
          z.object({
            productId: z.string().min(1),
            quantity: z.number().int().positive(),
            price: z.number().positive(),
          })
        ),
      });

      const orders = db.collection("orders", { schema: OrderSchema });

      // Valid order with items
      await orders.insertOne({
        orderId: "ORD-001",
        items: [
          { productId: "PROD-A", quantity: 2, price: 29.99 },
          { productId: "PROD-B", quantity: 1, price: 49.99 },
        ],
      });

      // Invalid item in array
      await expect(
        orders.insertOne({
          orderId: "ORD-002",
          items: [
            { productId: "PROD-C", quantity: 3, price: 19.99 },
            { productId: "PROD-D", quantity: -1, price: 9.99 }, // Negative quantity
          ],
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("validates array length constraints", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const TeamSchema = z.object({
        name: z.string(),
        members: z.array(z.string()).min(1).max(5),
      });

      const teams = db.collection("teams", { schema: TeamSchema });

      // Valid team size
      await teams.insertOne({
        name: "Team Alpha",
        members: ["Alice", "Bob", "Charlie"],
      });

      // Empty array (below min)
      await expect(
        teams.insertOne({
          name: "Team Empty",
          members: [],
        })
      ).rejects.toThrow(ValidationError);

      // Too many members (above max)
      await expect(
        teams.insertOne({
          name: "Team Large",
          members: ["A", "B", "C", "D", "E", "F"],
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("ValidationError path includes array index", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ListSchema = z.object({
        items: z.array(z.string().email()),
      });

      const lists = db.collection("lists", { schema: ListSchema });

      try {
        await lists.insertOne({
          items: ["valid@email.com", "invalid-email", "another@valid.com"],
        });
        expect.fail("Should have thrown ValidationError");
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const validationErr = err as ValidationError;

        // Path should include the array index
        const issue = validationErr.issues.find(
          (i) => i.path.length === 2 && i.path[0] === "items"
        );
        expect(issue).toBeDefined();
        expect(issue?.path[1]).toBe(1); // Index 1 is the invalid one
      }

      await client.close();
    });
  });

  describe("optional fields", () => {
    it("undefined allowed for optional fields", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const UserSchema = z.object({
        username: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        bio: z.string().optional(),
      });

      const users = db.collection("users", { schema: UserSchema });

      // Insert without optional fields
      const { insertedId } = await users.insertOne({
        username: "alice",
        email: "alice@example.com",
        // phone and bio omitted
      });

      const user = await users.findOne({ _id: insertedId });
      expect(user?.username).toBe("alice");
      expect(user?.email).toBe("alice@example.com");
      expect(user?.phone).toBeUndefined();
      expect(user?.bio).toBeUndefined();

      await client.close();
    });

    it("explicit undefined for optional fields", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ConfigSchema = z.object({
        name: z.string(),
        setting1: z.number().optional(),
        setting2: z.boolean().optional(),
      });

      const configs = db.collection("configs", { schema: ConfigSchema });

      // Explicit undefined should be allowed
      await configs.insertOne({
        name: "config1",
        setting1: undefined,
        setting2: undefined,
      });

      // Mix of present and undefined
      await configs.insertOne({
        name: "config2",
        setting1: 42,
        setting2: undefined,
      });

      const count = await configs.countDocuments();
      expect(count).toBe(2);

      await client.close();
    });

    it("null not allowed for optional fields by default", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const RecordSchema = z.object({
        title: z.string(),
        description: z.string().optional(),
      });

      const records = db.collection("records", { schema: RecordSchema });

      // null should not be allowed for optional (use nullable for that)
      await expect(
        records.insertOne({
          title: "Test",
          description: null as unknown as string,
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("nullable fields accept null", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const EntrySchema = z.object({
        name: z.string(),
        deletedAt: z.date().nullable(),
      });

      const entries = db.collection("entries", { schema: EntrySchema });

      // null should be allowed for nullable fields
      const { insertedId } = await entries.insertOne({
        name: "Entry 1",
        deletedAt: null,
      });

      const entry = await entries.findOne({ _id: insertedId });
      expect(entry?.deletedAt).toBeNull();

      await client.close();
    });
  });

  describe("default values", () => {
    it("Zod defaults applied on insert", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const PostSchema = z.object({
        title: z.string(),
        content: z.string(),
        views: z.number().default(0),
        tags: z.array(z.string()).default([]),
        published: z.boolean().default(false),
        metadata: z
          .object({
            version: z.number(),
          })
          .default({ version: 1 }),
      });

      const posts = db.collection("posts", { schema: PostSchema });

      // Insert without default fields
      const { insertedId } = await posts.insertOne({
        title: "My Post",
        content: "Post content here",
      });

      const post = await posts.findOne({ _id: insertedId });
      expect(post?.title).toBe("My Post");
      expect(post?.content).toBe("Post content here");
      expect(post?.views).toBe(0);
      expect(post?.tags).toEqual([]);
      expect(post?.published).toBe(false);
      expect(post?.metadata).toEqual({ version: 1 });

      await client.close();
    });

    it("provided values override defaults", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const ItemSchema = z.object({
        name: z.string(),
        quantity: z.number().default(1),
        active: z.boolean().default(true),
      });

      const items = db.collection("items", { schema: ItemSchema });

      const { insertedId } = await items.insertOne({
        name: "Custom Item",
        quantity: 100,
        active: false,
      });

      const item = await items.findOne({ _id: insertedId });
      expect(item?.quantity).toBe(100);
      expect(item?.active).toBe(false);

      await client.close();
    });

    it("defaults with transform functions", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const LogSchema = z.object({
        message: z.string(),
        level: z.string().default("info"),
        timestamp: z.string().default(() => new Date().toISOString()),
      });

      const logs = db.collection("logs", { schema: LogSchema });

      const before = new Date().toISOString();
      const { insertedId } = await logs.insertOne({
        message: "Test log message",
      });
      const after = new Date().toISOString();

      const log = await logs.findOne({ _id: insertedId });
      expect(log?.message).toBe("Test log message");
      expect(log?.level).toBe("info");
      expect(log?.timestamp).toBeDefined();
      const timestamp = log?.timestamp;
      expect(timestamp && timestamp >= before).toBe(true);
      expect(timestamp && timestamp <= after).toBe(true);

      await client.close();
    });
  });

  describe("collection without schema", () => {
    it("accepts any valid object", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      // Collection without schema
      const things = db.collection("things");

      // Can insert any shape of document
      await things.insertOne({
        name: "Thing 1",
        value: 42,
      });

      await things.insertOne({
        title: "Different shape",
        items: [1, 2, 3],
        nested: { a: 1, b: 2 },
      });

      await things.insertOne({
        completely: "different",
        structure: true,
        count: 999,
      });

      const count = await things.countDocuments();
      expect(count).toBe(3);

      await client.close();
    });

    it("accepts updates without validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const misc = db.collection("misc");

      const { insertedId } = await misc.insertOne({
        field1: "value1",
      });

      // Can update with any field
      await misc.updateOne(
        { _id: insertedId },
        { $set: { newField: "newValue", anotherField: 123 } }
      );

      const doc = await misc.findOne({ _id: insertedId });
      expect(doc?.field1).toBe("value1");
      expect(doc?.newField).toBe("newValue");
      expect(doc?.anotherField).toBe(123);

      await client.close();
    });

    it("collection with generic type but no schema", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      interface MyDocument {
        name: string;
        value: number;
      }

      // Generic type provides TypeScript checking but no runtime validation
      const typed = db.collection<MyDocument>("typed");

      await typed.insertOne({
        name: "Test",
        value: 42,
      });

      const doc = await typed.findOne({});
      expect(doc?.name).toBe("Test");
      expect(doc?.value).toBe(42);

      await client.close();
    });
  });

  describe("TypeScript inference", () => {
    it("schema type flows to collection generic", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const BookSchema = z.object({
        title: z.string(),
        author: z.string(),
        year: z.number().int(),
        isbn: z.string(),
      });

      const books = db.collection("books", { schema: BookSchema });

      // TypeScript should infer the type from the schema
      const { insertedId } = await books.insertOne({
        title: "The TypeScript Handbook",
        author: "Microsoft",
        year: 2023,
        isbn: "978-0-123456-78-9",
      });

      const book = await books.findOne({ _id: insertedId });

      // These should be properly typed
      expect(book?.title).toBe("The TypeScript Handbook");
      expect(book?.author).toBe("Microsoft");
      expect(book?.year).toBe(2023);
      expect(book?.isbn).toBe("978-0-123456-78-9");

      // Verify the document has _id
      expect(book?._id).toBe(insertedId);

      await client.close();
    });

    it("inferred type works with find cursor", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const MovieSchema = z.object({
        title: z.string(),
        director: z.string(),
        rating: z.number().min(0).max(10),
      });

      const movies = db.collection("movies", { schema: MovieSchema });

      await movies.insertMany([
        { title: "Movie A", director: "Director 1", rating: 8.5 },
        { title: "Movie B", director: "Director 2", rating: 7.2 },
        { title: "Movie C", director: "Director 1", rating: 9.1 },
      ]);

      // Cursor should return properly typed documents
      const topMovies = await movies
        .find({ rating: { $gte: 8 } })
        .sort({ rating: -1 })
        .toArray();

      expect(topMovies).toHaveLength(2);
      expect(topMovies[0].title).toBe("Movie C");
      expect(topMovies[0].rating).toBe(9.1);
      expect(topMovies[1].title).toBe("Movie A");
      expect(topMovies[1].rating).toBe(8.5);

      await client.close();
    });

    it("complex schema type inference", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const AddressSchema = z.object({
        street: z.string(),
        city: z.string(),
        country: z.string(),
      });

      const CompanySchema = z.object({
        name: z.string(),
        founded: z.number().int(),
        headquarters: AddressSchema,
        departments: z.array(z.string()),
        metadata: z.object({
          verified: z.boolean(),
          lastUpdated: z.string(),
        }),
      });

      const companies = db.collection("companies", { schema: CompanySchema });

      const { insertedId } = await companies.insertOne({
        name: "TechCorp",
        founded: 2010,
        headquarters: {
          street: "123 Tech Blvd",
          city: "San Francisco",
          country: "USA",
        },
        departments: ["Engineering", "Marketing", "Sales"],
        metadata: {
          verified: true,
          lastUpdated: "2024-01-15",
        },
      });

      const company = await companies.findOne({ _id: insertedId });

      // All nested types should be properly inferred
      expect(company?.name).toBe("TechCorp");
      expect(company?.founded).toBe(2010);
      expect(company?.headquarters.city).toBe("San Francisco");
      expect(company?.departments).toContain("Engineering");
      expect(company?.metadata.verified).toBe(true);

      await client.close();
    });
  });

  describe("edge cases", () => {
    it("empty object schema validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const MinimalSchema = z.object({});

      const minimal = db.collection("minimal", { schema: MinimalSchema });

      // Empty object should be valid
      const { insertedId } = await minimal.insertOne({});

      const doc = await minimal.findOne({ _id: insertedId });
      expect(doc?._id).toBe(insertedId);

      await client.close();
    });

    it("strict schema rejects extra fields", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const StrictSchema = z
        .object({
          name: z.string(),
          value: z.number(),
        })
        .strict();

      const strict = db.collection("strict", { schema: StrictSchema });

      // Extra field should cause validation error with strict schema
      await expect(
        strict.insertOne({
          name: "Test",
          value: 42,
          extra: "not allowed",
        } as { name: string; value: number })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("passthrough schema allows extra fields", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const PassthroughSchema = z
        .object({
          name: z.string(),
          value: z.number(),
        })
        .passthrough();

      const passthrough = db.collection("passthrough", {
        schema: PassthroughSchema,
      });

      // Extra fields should be allowed with passthrough
      const { insertedId } = await passthrough.insertOne({
        name: "Test",
        value: 42,
        extra: "allowed",
      });

      const doc = await passthrough.findOne({ _id: insertedId });
      expect(doc?.name).toBe("Test");
      expect((doc as Record<string, unknown>).extra).toBe("allowed");

      await client.close();
    });

    it("union type validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const EventSchema = z.object({
        type: z.union([z.literal("click"), z.literal("view"), z.literal("purchase")]),
        timestamp: z.number(),
        data: z.record(z.unknown()),
      });

      const events = db.collection("events", { schema: EventSchema });

      // Valid union values
      await events.insertOne({
        type: "click",
        timestamp: Date.now(),
        data: { x: 100, y: 200 },
      });

      await events.insertOne({
        type: "purchase",
        timestamp: Date.now(),
        data: { amount: 99.99 },
      });

      // Invalid union value
      await expect(
        events.insertOne({
          type: "invalid" as "click",
          timestamp: Date.now(),
          data: {},
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });

    it("transform validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const UserSchema = z.object({
        email: z
          .string()
          .email()
          .transform((e) => e.toLowerCase()),
        name: z.string().transform((n) => n.trim()),
      });

      const users = db.collection("users", { schema: UserSchema });

      const { insertedId } = await users.insertOne({
        email: "TEST@EXAMPLE.COM",
        name: "  John Doe  ",
      });

      const user = await users.findOne({ _id: insertedId });
      expect(user?.email).toBe("test@example.com");
      expect(user?.name).toBe("John Doe");

      await client.close();
    });

    it("refinement validation", async () => {
      const client = createClient({ path: tempDir });
      const db = client.db("test");

      const DateRangeSchema = z
        .object({
          startDate: z.string(),
          endDate: z.string(),
        })
        .refine((data) => data.endDate >= data.startDate, {
          message: "End date must be after start date",
          path: ["endDate"],
        });

      const dateRanges = db.collection("dateRanges", { schema: DateRangeSchema });

      // Valid date range
      await dateRanges.insertOne({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      // Invalid date range (end before start)
      await expect(
        dateRanges.insertOne({
          startDate: "2024-12-31",
          endDate: "2024-01-01",
        })
      ).rejects.toThrow(ValidationError);

      await client.close();
    });
  });
});
