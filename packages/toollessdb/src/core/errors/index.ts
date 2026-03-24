export type ErrorCode =
  | "LOCK_ERROR"
  | "DUPLICATE_KEY_ERROR"
  | "VALIDATION_ERROR"
  | "DOCUMENT_NOT_FOUND_ERROR"
  | "CORRUPT_FILE_ERROR"
  | "IMMUTABLE_FIELD_ERROR"
  | "COLLECTION_DROPPED_ERROR"
  | "INVALID_OPERATION_ERROR";

export class ToollessError extends Error {
  readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.name = "ToollessError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LockError extends ToollessError {
  readonly pid: number | undefined;
  readonly lockPath: string;

  constructor(message: string, lockPath: string, pid?: number) {
    super(message, "LOCK_ERROR");
    this.name = "LockError";
    this.lockPath = lockPath;
    this.pid = pid;
  }
}

export class DuplicateKeyError extends ToollessError {
  readonly field: string;
  readonly value: unknown;

  constructor(field: string, value: unknown) {
    super(
      `Duplicate key error: field "${field}" with value "${String(value)}" already exists`,
      "DUPLICATE_KEY_ERROR"
    );
    this.name = "DuplicateKeyError";
    this.field = field;
    this.value = value;
  }
}

export interface ZodIssue {
  code: string;
  message: string;
  path: Array<string | number>;
}

export class ValidationError extends ToollessError {
  readonly issues: ZodIssue[];

  constructor(message: string, issues: ZodIssue[]) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class DocumentNotFoundError extends ToollessError {
  readonly filter: unknown;

  constructor(filter: unknown) {
    super("Document not found", "DOCUMENT_NOT_FOUND_ERROR");
    this.name = "DocumentNotFoundError";
    this.filter = filter;
  }
}

export class CorruptFileError extends ToollessError {
  readonly filePath: string;
  readonly lineNumber: number | undefined;

  constructor(message: string, filePath: string, lineNumber?: number) {
    super(message, "CORRUPT_FILE_ERROR");
    this.name = "CorruptFileError";
    this.filePath = filePath;
    this.lineNumber = lineNumber;
  }
}

export class ImmutableFieldError extends ToollessError {
  readonly field: string;

  constructor(field: string) {
    super(`Cannot modify immutable field: "${field}"`, "IMMUTABLE_FIELD_ERROR");
    this.name = "ImmutableFieldError";
    this.field = field;
  }
}

export class CollectionDroppedError extends ToollessError {
  readonly collectionName: string;

  constructor(collectionName: string) {
    super(`Collection "${collectionName}" has been dropped`, "COLLECTION_DROPPED_ERROR");
    this.name = "CollectionDroppedError";
    this.collectionName = collectionName;
  }
}

export class InvalidOperationError extends ToollessError {
  constructor(message: string) {
    super(message, "INVALID_OPERATION_ERROR");
    this.name = "InvalidOperationError";
  }
}
