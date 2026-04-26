import type { Document, Update } from "../types/index";
import { ImmutableFieldError, InvalidOperationError } from "../errors/index";

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as T;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  const cloned = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = deepClone(value);
  }
  return cloned as T;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    if (
      current[part] === undefined ||
      current[part] === null ||
      typeof current[part] !== "object"
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    if (current[part] === undefined || typeof current[part] !== "object") {
      return;
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    delete current[lastPart];
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  return false;
}

export function applyUpdate<T>(
  doc: Document,
  update: Update<T>
): { updated: Document; delta: Record<string, unknown>; deleted: string[] } {
  const result = deepClone(doc);
  const delta: Record<string, unknown> = {};
  const deleted: string[] = [];

  if (update.$set !== undefined) {
    for (const [field, value] of Object.entries(update.$set)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      setNestedValue(result, field, value);
      delta[field] = value;
    }
  }

  if (update.$unset !== undefined) {
    for (const field of Object.keys(update.$unset)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      deleteNestedValue(result, field);
      deleted.push(field);
    }
  }

  if (update.$inc !== undefined) {
    for (const [field, increment] of Object.entries(update.$inc)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      const currentNum = typeof current === "number" ? current : 0;
      const incNum = typeof increment === "number" ? increment : 0;
      const newValue = currentNum + incNum;
      setNestedValue(result, field, newValue);
      delta[field] = newValue;
    }
  }

  if (update.$mul !== undefined) {
    for (const [field, multiplier] of Object.entries(update.$mul)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      const currentNum = typeof current === "number" ? current : 0;
      const mulNum = typeof multiplier === "number" ? multiplier : 1;
      const newValue = currentNum * mulNum;
      setNestedValue(result, field, newValue);
      delta[field] = newValue;
    }
  }

  if (update.$push !== undefined) {
    for (const [field, value] of Object.entries(update.$push)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      if (current !== undefined && !Array.isArray(current)) {
        throw new InvalidOperationError(`Cannot $push to non-array field "${field}"`);
      }
      const arr = Array.isArray(current) ? [...current] : [];

      if (value !== null && typeof value === "object" && "$each" in value) {
        const each = (value as { $each?: unknown[] }).$each;
        if (Array.isArray(each)) {
          arr.push(...each);
        }
      } else {
        arr.push(value);
      }

      setNestedValue(result, field, arr);
      delta[field] = arr;
    }
  }

  if (update.$pull !== undefined) {
    for (const [field, condition] of Object.entries(update.$pull)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      if (!Array.isArray(current)) {
        continue;
      }
      const filtered = current.filter((item) => !deepEqual(item, condition));
      setNestedValue(result, field, filtered);
      delta[field] = filtered;
    }
  }

  if (update.$pop !== undefined) {
    for (const [field, direction] of Object.entries(update.$pop)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      if (!Array.isArray(current)) {
        continue;
      }
      const arr = [...current];
      if (direction === 1) {
        arr.pop();
      } else if (direction === -1) {
        arr.shift();
      }
      setNestedValue(result, field, arr);
      delta[field] = arr;
    }
  }

  if (update.$addToSet !== undefined) {
    for (const [field, value] of Object.entries(update.$addToSet)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      if (current !== undefined && !Array.isArray(current)) {
        throw new InvalidOperationError(`Cannot $addToSet to non-array field "${field}"`);
      }
      const arr = Array.isArray(current) ? [...current] : [];

      if (value !== null && typeof value === "object" && "$each" in value) {
        const each = (value as { $each?: unknown[] }).$each;
        if (Array.isArray(each)) {
          for (const item of each) {
            if (!arr.some((existing) => deepEqual(existing, item))) {
              arr.push(item);
            }
          }
        }
      } else {
        if (!arr.some((existing) => deepEqual(existing, value))) {
          arr.push(value);
        }
      }

      setNestedValue(result, field, arr);
      delta[field] = arr;
    }
  }

  if (update.$rename !== undefined) {
    for (const [oldField, newField] of Object.entries(update.$rename)) {
      if (oldField === "_id" || newField === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const value = getNestedValue(result, oldField);
      if (value !== undefined) {
        deleteNestedValue(result, oldField);
        setNestedValue(result, newField as string, value);
        deleted.push(oldField);
        delta[newField as string] = value;
      }
    }
  }

  if (update.$min !== undefined) {
    for (const [field, value] of Object.entries(update.$min)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      if (
        current === undefined ||
        (typeof value === typeof current && (value as number) < (current as number))
      ) {
        setNestedValue(result, field, value);
        delta[field] = value;
      }
    }
  }

  if (update.$max !== undefined) {
    for (const [field, value] of Object.entries(update.$max)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      const current = getNestedValue(result, field);
      if (
        current === undefined ||
        (typeof value === typeof current && (value as number) > (current as number))
      ) {
        setNestedValue(result, field, value);
        delta[field] = value;
      }
    }
  }

  if (update.$currentDate !== undefined) {
    for (const [field, spec] of Object.entries(update.$currentDate)) {
      if (field === "_id") {
        throw new ImmutableFieldError("_id");
      }
      let value: Date | number;
      if (spec === true) {
        value = new Date();
      } else if (typeof spec === "object" && spec !== null && "$type" in spec) {
        const typeSpec = spec as { $type: "date" | "timestamp" };
        if (typeSpec.$type === "timestamp") {
          value = Date.now();
        } else {
          value = new Date();
        }
      } else {
        value = new Date();
      }
      setNestedValue(result, field, value);
      delta[field] = value;
    }
  }

  result._id = doc._id;

  return { updated: result, delta, deleted };
}

export function applyReplacement(doc: Document, replacement: Record<string, unknown>): Document {
  if ("_id" in replacement && replacement._id !== doc._id) {
    throw new ImmutableFieldError("_id");
  }

  return {
    ...replacement,
    _id: doc._id,
  } as Document;
}
