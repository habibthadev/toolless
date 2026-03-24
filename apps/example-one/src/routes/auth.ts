import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { loginPage, registerPage } from "../views/auth.ts";
import { createUser, authenticateUser, createSession, deleteSession } from "../lib/auth.ts";
import { optionalAuth } from "../middleware/auth.ts";
import type { AuthContext } from "../middleware/auth.ts";

const routes = new Hono();

routes.get("/login", optionalAuth, (c) => {
  const auth = c.get("auth") as AuthContext | undefined;
  if (auth) {
    return c.redirect("/dashboard");
  }
  return c.html(loginPage());
});

routes.post("/login", async (c) => {
  try {
    const body = await c.req.parseBody();
    const email = body.email as string;
    const password = body.password as string;

    if (!email || !password) {
      return c.html(loginPage("Email and password are required"), 400);
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return c.html(loginPage("Invalid email or password"), 401);
    }

    const session = await createSession(user._id as string);

    setCookie(c, "auth_token", session.token, {
      path: "/",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60,
    });
    return c.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    return c.html(loginPage("An error occurred. Please try again."), 500);
  }
});

routes.get("/register", optionalAuth, (c) => {
  const auth = c.get("auth") as AuthContext | undefined;
  if (auth) {
    return c.redirect("/dashboard");
  }
  return c.html(registerPage());
});

routes.post("/register", async (c) => {
  try {
    const body = await c.req.parseBody();
    const name = body.name as string;
    const email = body.email as string;
    const password = body.password as string;

    if (!name || !email || !password) {
      return c.html(registerPage("All fields are required"), 400);
    }

    if (password.length < 8) {
      return c.html(registerPage("Password must be at least 8 characters"), 400);
    }

    const user = await createUser(email, password, name);
    const session = await createSession(user._id as string);

    setCookie(c, "auth_token", session.token, {
      path: "/",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60,
    });
    return c.redirect("/dashboard");
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "DUPLICATE_KEY_ERROR") {
        return c.html(registerPage("An account with this email already exists"), 400);
      }
    }
    console.error("Registration error:", error);
    return c.html(registerPage("An error occurred. Please try again."), 500);
  }
});

routes.post("/logout", async (c) => {
  const token = getCookie(c, "auth_token");
  if (token) {
    await deleteSession(token);
  }
  deleteCookie(c, "auth_token");
  return c.redirect("/");
});

export default routes;
