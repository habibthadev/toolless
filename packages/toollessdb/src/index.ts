export { createClient, Client, type ClientOptions } from "./core/client";
export { Database } from "./core/database";
export { Collection, type CollectionOptions } from "./core/collection";
export { Cursor } from "./core/query/cursor";
export { generateObjectId, extractTimestamp, isValidObjectId } from "./core/storage/objectid";

export {
  ToollessError,
  LockError,
  DuplicateKeyError,
  ValidationError,
  DocumentNotFoundError,
  CorruptFileError,
  ImmutableFieldError,
  CollectionDroppedError,
  InvalidOperationError,
  type ErrorCode,
  type ZodIssue,
} from "./core/errors/index";

export type {
  Document,
  WithId,
  OptionalId,
  InsertOneResult,
  InsertManyResult,
  UpdateResult,
  DeleteResult,
  ReplaceResult,
  SortDirection,
  SortSpec,
  ProjectionSpec,
  FindOptions,
  UpdateOptions,
  IndexSpec,
  IndexOptions,
  IndexDefinition,
  Filter,
  FilterExpression,
  LogicalOperators,
  Update,
  FilterOperator,
  UpdateOperator,
} from "./core/types/index";
