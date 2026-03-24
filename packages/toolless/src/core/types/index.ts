export type Document = Record<string, unknown> & { _id: string };

export type WithId<T> = T & { _id: string };

export type OptionalId<T> = T & { _id?: string };

export interface InsertOneResult {
  insertedId: string;
}

export interface InsertManyResult {
  insertedIds: string[];
  insertedCount: number;
}

export interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: string;
}

export interface DeleteResult {
  deletedCount: number;
}

export interface ReplaceResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedId?: string;
}

export type SortDirection = 1 | -1 | "asc" | "desc";

export type SortSpec = Record<string, SortDirection>;

export type ProjectionSpec = Record<string, 0 | 1 | boolean>;

export interface FindOptions {
  sort?: SortSpec;
  limit?: number;
  skip?: number;
  projection?: ProjectionSpec;
}

export interface UpdateOptions {
  upsert?: boolean;
}

export interface IndexSpec {
  [field: string]: 1 | -1;
}

export interface IndexOptions {
  unique?: boolean;
  name?: string;
}

export interface IndexDefinition {
  name: string;
  spec: IndexSpec;
  unique: boolean;
}

export type FilterOperator =
  | "$eq"
  | "$ne"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$in"
  | "$nin"
  | "$and"
  | "$or"
  | "$nor"
  | "$not"
  | "$exists"
  | "$type"
  | "$regex"
  | "$elemMatch"
  | "$all"
  | "$size";

export type UpdateOperator =
  | "$set"
  | "$unset"
  | "$inc"
  | "$mul"
  | "$push"
  | "$pull"
  | "$pop"
  | "$addToSet"
  | "$rename"
  | "$min"
  | "$max"
  | "$currentDate";

export type Filter<T> = {
  [K in keyof T]?: T[K] | FilterExpression<T[K]>;
} & LogicalOperators<T> & { _id?: string | FilterExpression<string> };

export interface FilterExpression<T> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $not?: FilterExpression<T>;
  $exists?: boolean;
  $type?: string;
  $regex?: RegExp | string;
  $elemMatch?: T extends Array<infer U> ? Filter<U> : never;
  $all?: T extends Array<infer U> ? U[] : never;
  $size?: number;
}

export interface LogicalOperators<T> {
  $and?: Array<Filter<T>>;
  $or?: Array<Filter<T>>;
  $nor?: Array<Filter<T>>;
}

export type Update<T> = {
  $set?: Partial<T>;
  $unset?: { [K in keyof T]?: "" | 1 | true };
  $inc?: { [K in keyof T]?: number };
  $mul?: { [K in keyof T]?: number };
  $push?: { [K in keyof T]?: T[K] extends Array<infer U> ? U | { $each?: U[] } : never };
  $pull?: { [K in keyof T]?: T[K] extends Array<infer U> ? U | Filter<U> : never };
  $pop?: { [K in keyof T]?: 1 | -1 };
  $addToSet?: { [K in keyof T]?: T[K] extends Array<infer U> ? U | { $each?: U[] } : never };
  $rename?: { [K in keyof T]?: string };
  $min?: { [K in keyof T]?: T[K] };
  $max?: { [K in keyof T]?: T[K] };
  $currentDate?: { [K in keyof T]?: true | { $type: "date" | "timestamp" } };
};

export interface OperationRecord {
  op: "insert" | "update" | "delete";
  _id: string;
  ts: number;
  doc?: Document;
  delta?: Record<string, unknown>;
}

export interface CollectionHeader {
  type: "header";
  collection: string;
  created: number;
  version: 1;
}

export interface DatabaseMeta {
  name: string;
  version: 1;
  created: number;
  collections: string[];
}

export interface LockInfo {
  pid: number;
  created: number;
  hostname: string;
}
