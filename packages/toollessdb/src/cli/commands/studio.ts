import { Command } from "commander";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs";
import { createClient } from "../../index";
import type { Client } from "../../index";
import { colors, printError, printInfo } from "../utils";

interface StudioState {
  client: Client;
  basePath: string;
}

function createApiHandler(state: StudioState) {
  return async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathParts = url.pathname.split("/").filter(Boolean);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (pathParts[0] === "api") {
        if (pathParts[1] === "databases") {
          if (req.method === "GET" && pathParts.length === 2) {
            let databases: { name: string }[] = [];

            if (state.basePath.endsWith(".tdb")) {
              const dbName = path.basename(state.basePath, ".tdb");
              databases = [{ name: dbName }];
            } else {
              const entries = fs.readdirSync(state.basePath, { withFileTypes: true });
              databases = entries
                .filter((e) => e.isDirectory() && e.name.endsWith(".tdb"))
                .map((e) => ({ name: e.name.replace(".tdb", "") }));
            }
            res.writeHead(200);
            res.end(JSON.stringify(databases));
            return;
          }

          const dbName = pathParts[2];
          if (dbName) {
            const db = state.client.db(dbName);

            if (pathParts[3] === "collections") {
              if (req.method === "GET" && pathParts.length === 4) {
                const collections = await db.listCollections();
                const result = [];
                for (const name of collections) {
                  const coll = db.collection(name);
                  const count = await coll.countDocuments();
                  result.push({ name, count });
                }
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
              }

              const collName = pathParts[4];
              if (collName) {
                const coll = db.collection(collName);

                if (pathParts[5] === "documents") {
                  if (req.method === "GET") {
                    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
                    const skip = parseInt(url.searchParams.get("skip") ?? "0", 10);
                    const filter = url.searchParams.get("filter");
                    const sort = url.searchParams.get("sort");

                    let cursor = coll.find(filter ? JSON.parse(filter) : {});
                    if (sort) cursor = cursor.sort(JSON.parse(sort));
                    const docs = await cursor.skip(skip).limit(limit).toArray();
                    const total = await coll.countDocuments(filter ? JSON.parse(filter) : {});

                    res.writeHead(200);
                    res.end(JSON.stringify({ documents: docs, total }));
                    return;
                  }

                  if (req.method === "POST") {
                    let body = "";
                    req.on("data", (chunk) => (body += chunk));
                    req.on("end", async () => {
                      const doc = JSON.parse(body);
                      const result = await coll.insertOne(doc);
                      res.writeHead(201);
                      res.end(JSON.stringify(result));
                    });
                    return;
                  }

                  const docId = pathParts[6];
                  if (docId) {
                    if (req.method === "GET") {
                      const doc = await coll.findOne({ _id: docId });
                      if (doc) {
                        res.writeHead(200);
                        res.end(JSON.stringify(doc));
                      } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ error: "Document not found" }));
                      }
                      return;
                    }

                    if (req.method === "PUT") {
                      let body = "";
                      req.on("data", (chunk) => (body += chunk));
                      req.on("end", async () => {
                        const doc = JSON.parse(body);
                        const { _id, ...updateDoc } = doc;
                        const result = await coll.updateOne({ _id: docId }, { $set: updateDoc });
                        res.writeHead(200);
                        res.end(JSON.stringify(result));
                      });
                      return;
                    }

                    if (req.method === "DELETE") {
                      const result = await coll.deleteOne({ _id: docId });
                      res.writeHead(200);
                      res.end(JSON.stringify(result));
                      return;
                    }
                  }
                }
              }
            }
          }
        }
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  };
}

function serveStatic(res: http.ServerResponse, studioPath: string, pathname: string): void {
  let filePath = path.join(studioPath, pathname === "/" ? "index.html" : pathname);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(studioPath, "index.html");
  }

  const ext = path.extname(filePath);
  const contentTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  };

  const contentType = contentTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.writeHead(200);
    res.end(data);
  });
}

export function registerStudioCommand(program: Command): void {
  program
    .command("studio")
    .description("Start the Toolless Studio web interface")
    .argument("[dbPath]", "Path to database directory", "./data")
    .option("--port <port>", "Port to listen on", "4000")
    .option("--host <host>", "Host to bind to", "localhost")
    .action(async (dbPath: string, options: { port: string; host: string }) => {
      try {
        const basePath = path.resolve(dbPath);
        const port = parseInt(options.port, 10);
        const host = options.host;

        if (!fs.existsSync(basePath)) {
          printError(`Database directory not found: ${basePath}`);
          printInfo("Create the directory or run from your project root (default: ./data)");
          process.exit(1);
        }

        const clientPath = basePath.endsWith(".tdb") ? path.dirname(basePath) : basePath;
        const client = createClient({ path: clientPath });
        const state: StudioState = { client, basePath };

        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const studioPath = path.join(__dirname, "studio-dist");

        if (!fs.existsSync(path.join(studioPath, "index.html"))) {
          printError("Studio UI not found. Please rebuild the package with 'npm run build'");
          printInfo(`Expected studio at: ${studioPath}`);
          process.exit(1);
        }

        const apiHandler = createApiHandler(state);

        const server = http.createServer(async (req, res) => {
          const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

          if (url.pathname.startsWith("/api")) {
            await apiHandler(req, res);
          } else {
            serveStatic(res, studioPath, url.pathname);
          }
        });

        server.listen(port, host, () => {
          console.log("");
          console.log(colors.bold("  Toolless Studio"));
          console.log("");
          console.log(`  ${colors.dim("Local:")}    ${colors.primary(`http://${host}:${port}`)}`);
          console.log(`  ${colors.dim("Database:")} ${colors.muted(basePath)}`);
          console.log("");
          printInfo("Press Ctrl+C to stop");
        });

        process.on("SIGINT", async () => {
          console.log("");
          printInfo("Shutting down...");
          await client.close();
          server.close();
          process.exit(0);
        });
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
