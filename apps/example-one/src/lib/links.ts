import { nanoid } from "nanoid";
import type { Link } from "./db.ts";
import { links } from "./db.ts";

export async function createShortLink(
  userId: string,
  targetUrl: string,
  title?: string | undefined,
  customCode?: string | undefined
): Promise<Link> {
  const shortCode = customCode || nanoid(7);

  const linkData: Link = {
    userId,
    shortCode,
    targetUrl,
    title: title || undefined,
    clicks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await links.insertOne(linkData);

  return (await links.findOne({ _id: result.insertedId })) as Link;
}

export async function getLinkByShortCode(shortCode: string): Promise<Link | null> {
  return links.findOne({ shortCode });
}

export async function getUserLinks(userId: string): Promise<Link[]> {
  return links.find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function incrementLinkClicks(linkId: string): Promise<void> {
  await links.updateOne({ _id: linkId }, { $inc: { clicks: 1 } });
}

export async function updateLink(
  linkId: string,
  updates: { targetUrl?: string; title?: string }
): Promise<void> {
  await links.updateOne(
    { _id: linkId },
    {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    }
  );
}

export async function deleteLink(linkId: string): Promise<void> {
  await links.deleteOne({ _id: linkId });
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidShortCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(code);
}
