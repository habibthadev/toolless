# Toolless

A file-based, document-oriented database for Node.js with MongoDB-compatible API, crash-safe append-only NDJSON storage, and zero infrastructure requirements.

[![npm version](https://img.shields.io/npm/v/toollessdb.svg)](https://www.npmjs.com/package/toollessdb)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Documentation**: [toolless.dev](https://toolless.dev)

**GitHub**: [github.com/habibthadev/toolless](https://github.com/habibthadev/toolless)

## Features

- **MongoDB-compatible API** - Familiar query syntax for documents
- **Zero infrastructure** - No servers, daemons, or external dependencies
- **Crash-safe storage** - Append-only NDJSON log with atomic writes
- **Type-safe** - Full TypeScript support with generic collections
- **Schema validation** - Optional Zod integration with type inference
- **Indexing** - Single and compound indexes with unique constraints
- **Interactive Studio** - Web UI for data visualization and management
- **CLI tools** - Command-line interface for database operations

## Installation

```bash
npm install toollessdb
```

For the CLI:

```bash
npm install -g toollessdb
```

## Quick Start

```typescript
import { createClient } from "toollessdb";
import { z } from "zod";

// Create a client pointing to a directory
const client = createClient({ path: "./data" });
const db = client.db("myapp");

// Define a schema (optional but recommended)
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0),
});

// Get a typed collection
const users = db.collection("users", UserSchema);

// Insert documents
await users.insertOne({ name: "Alice", email: "alice@example.com", age: 30 });
await users.insertMany([
  { name: "Bob", email: "bob@example.com", age: 25 },
  { name: "Charlie", email: "charlie@example.com", age: 35 },
]);

// Query documents
const adults = await users
  .find({ age: { $gte: 18 } })
  .sort({ age: -1 })
  .toArray();
const alice = await users.findOne({ name: "Alice" });

// Update documents
await users.updateOne({ name: "Alice" }, { $set: { age: 31 } });
await users.updateMany({ age: { $lt: 30 } }, { $inc: { age: 1 } });

// Delete documents
await users.deleteOne({ name: "Bob" });
await users.deleteMany({ age: { $gt: 50 } });

// Create indexes
await users.createIndex({ email: 1 }, { unique: true });
await users.createIndex({ name: 1, age: -1 });

// Close when done
await client.close();
```

## API Reference

### Client

```typescript
import { createClient } from "toollessdb";

const client = createClient({
  path: "./data", // Directory for database files
  lockTimeout: 5000, // Lock acquisition timeout (ms)
});

// Get a database
const db = client.db("myapp");

// Close all connections
await client.close();
```

### Database

```typescript
// Get a collection (untyped)
const posts = db.collection("posts");

// Get a typed collection with Zod schema
const users = db.collection("users", UserSchema);

// List all collections
const names = await db.listCollections();

// Drop a collection
await db.dropCollection("old_data");
```

### Collection

#### Insert Operations

```typescript
// Insert one document
const result = await coll.insertOne({ name: "Alice" });
// { acknowledged: true, insertedId: '507f1f77...' }

// Insert many documents
const result = await coll.insertMany([{ name: "Bob" }, { name: "Charlie" }]);
// { acknowledged: true, insertedIds: ['507f1f77...', '507f1f78...'], insertedCount: 2 }
```

#### Query Operations

```typescript
// Find one document
const doc = await coll.findOne({ name: "Alice" });

// Find many documents (returns cursor)
const cursor = coll.find({ age: { $gte: 18 } });
const docs = await cursor.toArray();

// Count documents
const count = await coll.countDocuments({ status: "active" });
```

#### Update Operations

```typescript
// Update one document
const result = await coll.updateOne({ name: "Alice" }, { $set: { age: 31 } });
// { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null }

// Update many documents
const result = await coll.updateMany({ status: "pending" }, { $set: { status: "processed" } });

// Upsert (insert if not found)
const result = await coll.updateOne(
  { email: "new@example.com" },
  { $set: { name: "New User" } },
  { upsert: true }
);
```

#### Delete Operations

```typescript
// Delete one document
const result = await coll.deleteOne({ _id: "507f1f77..." });
// { acknowledged: true, deletedCount: 1 }

// Delete many documents
const result = await coll.deleteMany({ status: "expired" });
```

### Cursor

Cursors are lazy - they only fetch documents when terminal methods are called.

```typescript
const cursor = coll
  .find({ status: "active" })
  .sort({ createdAt: -1 }) // Sort descending
  .skip(20) // Skip first 20
  .limit(10) // Limit to 10 results
  .project({ name: 1, email: 1 }); // Include only these fields

// Terminal methods
const docs = await cursor.toArray();
const count = await cursor.count();
await cursor.forEach((doc) => console.log(doc));
```

### Filter Operators

```typescript
// Comparison
{ age: { $eq: 25 } }       // Equal
{ age: { $ne: 25 } }       // Not equal
{ age: { $gt: 25 } }       // Greater than
{ age: { $gte: 25 } }      // Greater than or equal
{ age: { $lt: 25 } }       // Less than
{ age: { $lte: 25 } }      // Less than or equal
{ age: { $in: [20, 25] } } // In array
{ age: { $nin: [20, 25] }} // Not in array

// Logical
{ $and: [{ age: { $gte: 18 } }, { age: { $lte: 65 } }] }
{ $or: [{ status: 'active' }, { premium: true }] }
{ $not: { status: 'banned' } }
{ $nor: [{ deleted: true }, { expired: true }] }

// Element
{ email: { $exists: true } }  // Field exists
{ type: { $type: 'string' } } // Field is type

// String
{ name: { $regex: '^A' } }          // Regex match
{ name: { $regex: 'alice', $options: 'i' } } // Case-insensitive

// Array
{ tags: { $elemMatch: { $eq: 'featured' } } }
{ scores: { $size: 3 } }
{ tags: { $all: ['a', 'b'] } }
```

### Update Operators

```typescript
// Field operators
{ $set: { name: 'Alice', age: 30 } }    // Set fields
{ $unset: { temporary: '' } }            // Remove fields
{ $inc: { count: 1, score: -5 } }        // Increment
{ $mul: { price: 1.1 } }                 // Multiply
{ $min: { low: 5 } }                     // Set if less than current
{ $max: { high: 100 } }                  // Set if greater than current
{ $rename: { oldName: 'newName' } }      // Rename field
{ $currentDate: { lastModified: true } } // Set to current date

// Array operators
{ $push: { tags: 'new' } }               // Push to array
{ $push: { tags: { $each: ['a', 'b'] } }}// Push multiple
{ $addToSet: { tags: 'unique' } }        // Add if not exists
{ $pop: { queue: 1 } }                   // Remove last (-1 for first)
{ $pull: { tags: 'old' } }               // Remove matching
{ $pullAll: { tags: ['a', 'b'] } }       // Remove all matching
```

### Indexes

```typescript
// Create a single-field index
await coll.createIndex({ email: 1 });

// Create a compound index
await coll.createIndex({ lastName: 1, firstName: 1 });

// Create a unique index
await coll.createIndex({ email: 1 }, { unique: true });

// Create with custom name
await coll.createIndex({ score: -1 }, { name: "score_desc" });

// List indexes
const indexes = await coll.listIndexes();
// [{ name: 'email_1', spec: { email: 1 }, unique: true }, ...]

// Drop an index
await coll.dropIndex("email_1");

// Compact collection (remove dead records)
await coll.compact();
```

## CLI Reference

The CLI auto-discovers databases in the `./data` folder. You can also specify database paths directly:

```bash
# Auto-discovery: finds testdb in ./data folder
toollessdb query testdb users

# Direct path: specify database location
toollessdb query data/testdb users
toollessdb query ./mydata/testdb users

# Explicit path option
toollessdb query testdb users -p ./mydata

# List databases
toollessdb list

# List collections in a database
toollessdb list mydb

# Query documents
toollessdb query mydb users
toollessdb query mydb users -f '{"age": {"$gte": 18}}'
toollessdb query mydb users --sort '{"createdAt": -1}' --limit 10

# Insert a document
toollessdb insert mydb users '{"name": "Alice", "age": 30}'

# Update documents
toollessdb update mydb users '{"name": "Alice"}' '{"$set": {"age": 31}}'
toollessdb update mydb users '{"status": "pending"}' '{"$set": {"status": "done"}}' --many

# Delete documents
toollessdb delete mydb users '{"_id": "507f1f77..."}'
toollessdb delete mydb users '{"status": "expired"}' --many

# Export/Import
toollessdb export mydb users -o users.json --pretty
toollessdb import mydb users users.json
toollessdb import mydb users users.json --drop

# Index management
toollessdb index list mydb users
toollessdb index create mydb users '{"email": 1}' --unique
toollessdb index drop mydb users email_1

# Compact a collection
toollessdb compact mydb users
toollessdb compact mydb  # All collections

# Drop a collection
toollessdb drop mydb old_collection

# Show statistics
toollessdb stats
toollessdb stats mydb
toollessdb stats mydb users

# Interactive shell
toollessdb shell
toollessdb shell -d mydb

# Start Studio web interface
toollessdb studio
toollessdb studio --port 3000
```

### Shell Commands

```
> use mydb
> show dbs
> show collections
> db.users.find()
> db.users.findOne({"name": "Alice"})
> db.users.insertOne({"name": "Bob"})
> db.users.count()
> help
> exit
```

## Studio

Start the web-based data browser:

```bash
toollessdb studio
```

Open http://localhost:4000 to:

- Browse databases and collections
- View, filter, and sort documents
- Create, edit, and delete documents
- Visual JSON editor with syntax validation

## Storage Format

Toolless uses an append-only NDJSON log format for crash safety:

```
{"v":1,"created":"2024-01-01T00:00:00.000Z"}
{"op":"i","_id":"507f1f77...","d":{"name":"Alice","age":30}}
{"op":"u","_id":"507f1f77...","d":{"name":"Alice","age":31}}
{"op":"d","_id":"507f1f77..."}
```

- `i` - Insert operation
- `u` - Update operation (full document replacement)
- `d` - Delete operation

Benefits:

- **Crash safety**: Incomplete writes at end of file are ignored
- **Auditability**: Full history of all changes
- **Simplicity**: Human-readable format

Auto-compaction removes deleted records when dead ratio exceeds 50%.

## Error Handling

```typescript
import {
  ToollessError,
  LockError,
  DuplicateKeyError,
  ValidationError,
  DocumentNotFoundError,
} from "toollessdb";

try {
  await users.insertOne({ email: "alice@example.com" });
} catch (err) {
  if (err instanceof DuplicateKeyError) {
    console.log("Email already exists:", err.key);
  } else if (err instanceof ValidationError) {
    console.log("Invalid document:", err.errors);
  } else if (err instanceof LockError) {
    console.log("Could not acquire lock");
  }
}
```

## TypeScript Support

Full type inference with Zod schemas:

```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  profile: z
    .object({
      bio: z.string().optional(),
      avatar: z.string().url().optional(),
    })
    .optional(),
});

// Collection is typed as Collection<z.infer<typeof UserSchema>>
const users = db.collection("users", UserSchema);

// TypeScript knows the shape of documents
const user = await users.findOne({ name: "Alice" });
if (user) {
  console.log(user.email); // string
  console.log(user.profile?.bio); // string | undefined
}

// Insert validation at compile time and runtime
await users.insertOne({
  name: "Bob",
  email: "invalid", // Runtime error: invalid email
});
```

## Performance

- **Memory**: All documents loaded into memory on collection open
- **Reads**: O(n) scan, O(1) with index on \_id
- **Writes**: Sequential, atomic append
- **Compaction**: Automatic or manual, locks collection briefly

Recommended for:

- Small to medium datasets (< 100k documents)
- Development and prototyping
- Embedded applications
- Configuration storage
- Local-first applications

## License

MIT - Created by [Habib Adebayo](https://github.com/habibthadev)
