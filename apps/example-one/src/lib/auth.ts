import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { User, Session } from "./db.ts";
import { users, sessions } from "./db.ts";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(email: string, password: string, name: string): Promise<User> {
  const hashedPassword = await hashPassword(password);
  const result = await users.insertOne({
    email,
    password: hashedPassword,
    name,
    createdAt: new Date().toISOString(),
  });

  return (await users.findOne({ _id: result.insertedId })) as User;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await users.findOne({ email });
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  return user;
}

export async function createSession(userId: string): Promise<Session> {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const result = await sessions.insertOne({
    userId,
    token,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return (await sessions.findOne({ _id: result.insertedId })) as Session;
}

export async function validateSession(
  token: string
): Promise<{ user: User; session: Session } | null> {
  const session = await sessions.findOne({ token });
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    await sessions.deleteOne({ _id: session._id });
    return null;
  }

  const user = await users.findOne({ _id: session.userId });
  if (!user) return null;

  return { user, session };
}

export async function deleteSession(token: string): Promise<void> {
  await sessions.deleteOne({ token });
}
