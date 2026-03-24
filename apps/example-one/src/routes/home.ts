import { Hono } from "hono";
import { homePage } from "../views/home.ts";
import { optionalAuth } from "../middleware/auth.ts";
import type { AuthContext } from "../middleware/auth.ts";

const routes = new Hono();

routes.get("/", optionalAuth, (c) => {
  const auth = c.get("auth") as AuthContext | undefined;
  return c.html(homePage(!!auth, auth?.user.name));
});

export default routes;
