# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-03-26

### Changed

- **Performance: Batched insertMany writes** - Bulk inserts now batch all records into a single disk write+sync instead of one per document, improving insertMany throughput by ~15x
- **Performance: Optimized findOne by \_id** - Direct Map lookup when querying solely by `_id` field, bypassing filter matching
- **Performance: Faster NDJSON parsing** - Replaced `split("\n")` with indexed string scanning to reduce memory allocation during cold start

### Fixed

- **CLI: Smart database path resolution** - CLI commands now auto-discover databases in `./data` folder and accept database paths directly (e.g., `data/testdb` or `./mydata/testdb.tdb`)

## [1.0.0] - 2026-03-24

Initial release of Toollessdb - a file-based document database for Node.js.

### Added

- **Core Database**
  - File-based document database with MongoDB-compatible API
  - Append-only NDJSON storage format with crash-safe writes
  - Process-safe file locking with stale lock detection
  - ObjectId-compatible 24-character hex identifiers sortable by insertion time
  - Full CRUD operations: insertOne, insertMany, findOne, find, updateOne, updateMany, replaceOne, deleteOne, deleteMany
  - Lazy cursor with chainable methods: sort, limit, skip, project
  - Terminal cursor methods: toArray, forEach, count
  - Async iteration support for cursors
  - Automatic compaction at 50% dead record ratio
  - Single-field and compound indexes with unique constraints

- **Query Operators**
  - Comparison: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
  - Logical: $and, $or, $nor, $not
  - Element: $exists, $type
  - String: $regex with $options
  - Array: $elemMatch, $all, $size

- **Update Operators**
  - Field: $set, $unset, $inc, $mul, $min, $max, $rename, $currentDate
  - Array: $push, $pull, $pop, $addToSet, $pullAll
  - Modifiers: $each for $push and $addToSet
  - Upsert support for updateOne, updateMany, and replaceOne

- **Schema Validation**
  - Optional Zod schema integration
  - Full TypeScript type inference from schemas
  - Runtime validation with detailed error messages

- **CLI Tool**
  - Database and collection listing
  - Query command with filters, sorting, limits, and projections
  - Insert, update, and delete commands
  - Export and import with JSON format
  - Index management: create, list, drop
  - Collection compaction and statistics
  - Interactive shell with MongoDB-like syntax
  - Studio web server launcher

- **Studio UI**
  - Web-based data browser at localhost:4000
  - Database and collection navigation
  - Document viewing with pagination
  - Document creation, editing, and deletion
  - Visual JSON editor with syntax validation
  - Dark and light mode support
  - Responsive design for all screen sizes (mobile -> desktop)

- **Error Handling**
  - Typed error classes: ToollessError, LockError, DuplicateKeyError, ValidationError, ImmutableFieldError, CollectionDroppedError, CorruptFileError
  - Detailed error messages with context

- **Developer Experience**
  - Dual CJS/ESM output
  - Full TypeScript declarations
  - Comprehensive test suite (314 tests)
  - Zero external runtime dependencies for core

### Documentation

- Complete API reference with examples
- CLI command documentation
- Migration guide from SQLite and MongoDB
- Storage format specification
- Performance guidelines

[Unreleased]: https://github.com/habibthadev/toolless/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/habibthadev/toolless/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/habibthadev/toolless/releases/tag/v1.0.0
