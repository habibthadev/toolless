import * as crypto from "node:crypto";

let counter = Math.floor(Math.random() * 0xffffff);
const randomBytes = crypto.randomBytes(5);

export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  counter = (counter + 1) % 0xffffff;

  const buffer = Buffer.alloc(12);

  buffer.writeUInt32BE(timestamp, 0);

  randomBytes.copy(buffer, 4);

  buffer.writeUIntBE(counter, 9, 3);

  return buffer.toString("hex");
}

export function extractTimestamp(objectId: string): Date {
  if (objectId.length !== 24) {
    throw new Error("Invalid ObjectId: must be 24 characters");
  }
  const timestampHex = objectId.slice(0, 8);
  const timestamp = parseInt(timestampHex, 16);
  return new Date(timestamp * 1000);
}

export function isValidObjectId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  if (value.length !== 24) {
    return false;
  }
  return /^[0-9a-f]{24}$/i.test(value);
}
