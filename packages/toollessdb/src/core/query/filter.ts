import type { Document, Filter, FilterExpression } from "../types/index";

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

function getTypeString(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  if (value instanceof RegExp) return "regex";
  return typeof value;
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

function matchExpression(value: unknown, expr: FilterExpression<unknown>): boolean {
  for (const [op, operand] of Object.entries(expr)) {
    switch (op) {
      case "$eq":
        if (!deepEqual(value, operand)) return false;
        break;

      case "$ne":
        if (deepEqual(value, operand)) return false;
        break;

      case "$gt":
        if (value === null || value === undefined || operand === null || operand === undefined)
          return false;
        if (typeof value !== typeof operand) return false;
        if ((value as number) <= (operand as number)) return false;
        break;

      case "$gte":
        if (value === null || value === undefined || operand === null || operand === undefined)
          return false;
        if (typeof value !== typeof operand) return false;
        if ((value as number) < (operand as number)) return false;
        break;

      case "$lt":
        if (value === null || value === undefined || operand === null || operand === undefined)
          return false;
        if (typeof value !== typeof operand) return false;
        if ((value as number) >= (operand as number)) return false;
        break;

      case "$lte":
        if (value === null || value === undefined || operand === null || operand === undefined)
          return false;
        if (typeof value !== typeof operand) return false;
        if ((value as number) > (operand as number)) return false;
        break;

      case "$in": {
        const arr = operand as unknown[];
        if (!arr.some((item) => deepEqual(value, item))) return false;
        break;
      }

      case "$nin": {
        const arr = operand as unknown[];
        if (arr.some((item) => deepEqual(value, item))) return false;
        break;
      }

      case "$exists": {
        const exists = value !== undefined;
        if (operand !== exists) return false;
        break;
      }

      case "$type": {
        const typeStr = getTypeString(value);
        if (typeStr !== operand) return false;
        break;
      }

      case "$regex": {
        if (typeof value !== "string") return false;
        const regex = operand instanceof RegExp ? operand : new RegExp(operand as string);
        if (!regex.test(value)) return false;
        break;
      }

      case "$not": {
        if (matchExpression(value, operand as FilterExpression<unknown>)) return false;
        break;
      }

      case "$elemMatch": {
        if (!Array.isArray(value)) return false;
        const subFilter = operand as Filter<unknown>;
        if (!value.some((item) => matchFilter(item as Document, subFilter))) return false;
        break;
      }

      case "$all": {
        if (!Array.isArray(value)) return false;
        const required = operand as unknown[];
        if (!required.every((req) => value.some((item) => deepEqual(item, req)))) return false;
        break;
      }

      case "$size": {
        if (!Array.isArray(value)) return false;
        if (value.length !== operand) return false;
        break;
      }
    }
  }

  return true;
}

function isOperatorExpression(value: unknown): value is FilterExpression<unknown> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => key.startsWith("$"));
}

export function matchFilter<T>(doc: Document, filter: Filter<T>): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    if (key === "$and") {
      const subFilters = condition as Array<Filter<T>>;
      if (!subFilters.every((subFilter) => matchFilter(doc, subFilter))) {
        return false;
      }
      continue;
    }

    if (key === "$or") {
      const subFilters = condition as Array<Filter<T>>;
      if (!subFilters.some((subFilter) => matchFilter(doc, subFilter))) {
        return false;
      }
      continue;
    }

    if (key === "$nor") {
      const subFilters = condition as Array<Filter<T>>;
      if (subFilters.some((subFilter) => matchFilter(doc, subFilter))) {
        return false;
      }
      continue;
    }

    const value = getNestedValue(doc, key);

    if (isOperatorExpression(condition)) {
      if (!matchExpression(value, condition)) {
        return false;
      }
    } else {
      if (!deepEqual(value, condition)) {
        return false;
      }
    }
  }

  return true;
}

export function filterDocuments<T>(
  documents: Map<string, Document>,
  filter: Filter<T>
): Document[] {
  const results: Document[] = [];

  for (const doc of documents.values()) {
    if (matchFilter(doc, filter)) {
      results.push(doc);
    }
  }

  return results;
}
