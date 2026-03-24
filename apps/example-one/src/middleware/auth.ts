import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { validateSession } from "../lib/auth.ts";
import type { User, Session } from "../lib/db.ts";

export interface AuthContext {
  user: User;
  session: Session;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function auth(c: Context, next: Next): Promise<Response | void> {
  const token = getCookie(c, "auth_token");

  if (!token) {
    return c.redirect("/login");
  }

  const result = await validateSession(token);
  if (!result) {
    c.header("Set-Cookie", "auth_token=; Path=/; Max-Age=0");
    return c.redirect("/login");
  }

  c.set("auth", result);
  await next();
}

export async function optionalAuth(c: Context, next: Next) {
  const token = getCookie(c, "auth_token");

  if (token) {
    const result = await validateSession(token);
    if (result) {
      c.set("auth", result);
    }
  }

  await next();
}
