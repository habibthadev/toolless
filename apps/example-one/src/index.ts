import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { initializeDatabase } from "./lib/db.ts";
import homeRoutes from "./routes/home.ts";
import authRoutes from "./routes/auth.ts";
import dashboardRoutes from "./routes/dashboard.ts";
import redirectRoutes from "./routes/redirect.ts";

const app = new Hono();

app.route("/", homeRoutes);
app.route("/", authRoutes);
app.route("/dashboard", dashboardRoutes);
app.route("/", redirectRoutes);

const port = Number(process.env.PORT) || 3500;

async function start() {
  try {
    console.log("Initializing database...");
    await initializeDatabase();
    console.log("Database initialized successfully");

    console.log(`Starting server on port ${port}...`);
    serve({
      fetch: app.fetch,
      port,
    });

    console.log(`\n✓ Server running at http://localhost:${port}`);
    console.log("  Press Ctrl+C to stop\n");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
