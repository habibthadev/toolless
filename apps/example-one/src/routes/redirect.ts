import { Hono } from "hono";
import { getLinkByShortCode, incrementLinkClicks } from "../lib/links.ts";

const routes = new Hono();

routes.get("/:shortCode", async (c) => {
  const shortCode = c.req.param("shortCode");

  const link = await getLinkByShortCode(shortCode);
  if (!link) {
    return c.text("Link not found", 404);
  }

  await incrementLinkClicks(link._id as string);

  return c.redirect(link.targetUrl, 302);
});

export default routes;
