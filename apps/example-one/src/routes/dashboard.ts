import { Hono } from "hono";
import { auth } from "../middleware/auth.ts";
import type { AuthContext } from "../middleware/auth.ts";
import { dashboardPage } from "../views/dashboard.ts";
import {
  createShortLink,
  getUserLinks,
  deleteLink,
  isValidUrl,
  isValidShortCode,
} from "../lib/links.ts";

const routes = new Hono();

routes.use("*", auth);

routes.get("/", async (c) => {
  const { user } = c.get("auth") as AuthContext;
  const links = await getUserLinks(user._id as string);
  return c.html(dashboardPage(user.name, links));
});

routes.post("/create", async (c) => {
  try {
    const { user } = c.get("auth") as AuthContext;
    const body = await c.req.parseBody();

    const targetUrl = body.targetUrl as string;
    const title = (body.title as string) || undefined;
    const customCode = (body.customCode as string) || undefined;

    if (!targetUrl) {
      const links = await getUserLinks(user._id as string);
      return c.html(dashboardPage(user.name, links, "Destination URL is required"), 400);
    }

    if (!isValidUrl(targetUrl)) {
      const links = await getUserLinks(user._id as string);
      return c.html(dashboardPage(user.name, links, "Invalid URL format"), 400);
    }

    if (customCode && !isValidShortCode(customCode)) {
      const links = await getUserLinks(user._id as string);
      return c.html(
        dashboardPage(
          user.name,
          links,
          "Invalid short code. Use 3-20 characters: letters, numbers, hyphens, underscores"
        ),
        400
      );
    }

    await createShortLink(user._id as string, targetUrl, title, customCode);
    return c.redirect("/dashboard");
  } catch (error: unknown) {
    const { user } = c.get("auth") as AuthContext;
    const links = await getUserLinks(user._id as string);

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "DUPLICATE_KEY_ERROR") {
        return c.html(dashboardPage(user.name, links, "This short code is already taken"), 400);
      }
    }

    console.error("Create link error:", error);
    return c.html(dashboardPage(user.name, links, "An error occurred. Please try again."), 500);
  }
});

routes.post("/delete/:id", async (c) => {
  try {
    const linkId = c.req.param("id");

    await deleteLink(linkId);
    return c.redirect("/dashboard");
  } catch (error) {
    const { user } = c.get("auth") as AuthContext;
    const links = await getUserLinks(user._id as string);

    console.error("Delete link error:", error);
    return c.html(dashboardPage(user.name, links, "Failed to delete link"), 500);
  }
});

export default routes;
