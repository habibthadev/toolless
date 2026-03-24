import { createClient } from "toollessdb";

export const db = createClient("./data");

export interface User extends Record<string, unknown> {
  _id?: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
}

export interface Link extends Record<string, unknown> {
  _id?: string;
  userId: string;
  shortCode: string;
  targetUrl: string;
  title?: string | undefined;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session extends Record<string, unknown> {
  _id?: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

const shortlinkDb = db.db("shortlink");
export const users = shortlinkDb.collection<User>("users");
export const links = shortlinkDb.collection<Link>("links");
export const sessions = shortlinkDb.collection<Session>("sessions");

export async function initializeDatabase() {
  await users.createIndex({ email: 1 }, { unique: true });
  await links.createIndex({ shortCode: 1 }, { unique: true });
  await links.createIndex({ userId: 1 });
  await sessions.createIndex({ token: 1 }, { unique: true });
  await sessions.createIndex({ userId: 1 });
}
