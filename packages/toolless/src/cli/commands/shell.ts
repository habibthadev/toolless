import { Command } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import { createClient } from "../../index";
import type { Client } from "../../index";
import { colors, formatJson, printError, printSuccess, printInfo } from "../utils";

interface ShellState {
  client: Client | null;
  basePath: string;
  currentDb: string | null;
  currentColl: string | null;
}

const COMMANDS: Record<string, { description: string; usage: string }> = {
  use: { description: "Switch database", usage: "use <database>" },
  show: { description: "Show databases or collections", usage: "show dbs | show collections" },
  db: { description: "Print current database", usage: "db" },
  find: { description: "Query documents", usage: "find [filter] [options]" },
  findOne: { description: "Find single document", usage: "findOne [filter]" },
  insert: { description: "Insert document", usage: "insert <document>" },
  update: { description: "Update documents", usage: "update <filter> <update> [options]" },
  delete: { description: "Delete documents", usage: "delete <filter> [options]" },
  count: { description: "Count documents", usage: "count [filter]" },
  drop: { description: "Drop collection", usage: "drop" },
  help: { description: "Show help", usage: "help" },
  exit: { description: "Exit shell", usage: "exit" },
};

async function executeCommand(state: ShellState, input: string): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  const match = trimmed.match(/^(\w+)(?:\s+(.*))?$/);
  if (!match) {
    printError("Invalid command");
    return;
  }

  const [, cmd, argsStr] = match;
  const command = cmd?.toLowerCase();

  try {
    switch (command) {
      case "use": {
        const dbName = argsStr?.trim();
        if (!dbName) {
          printError("Usage: use <database>");
          return;
        }
        if (state.client) {
          await state.client.close();
        }
        state.client = createClient({ path: state.basePath });
        state.client.db(dbName);
        state.currentDb = dbName;
        state.currentColl = null;
        printSuccess(`Switched to database: ${dbName}`);
        break;
      }

      case "show": {
        const what = argsStr?.trim().toLowerCase();
        if (what === "dbs" || what === "databases") {
          const entries = fs.readdirSync(state.basePath, { withFileTypes: true });
          const databases = entries
            .filter((e) => e.isDirectory() && e.name.endsWith(".tdb"))
            .map((e) => e.name.replace(".tdb", ""));
          for (const db of databases) {
            console.log(`  ${colors.primary(db)}`);
          }
          if (databases.length === 0) {
            printInfo("No databases found");
          }
        } else if (what === "collections" || what === "tables") {
          if (!state.currentDb || !state.client) {
            printError("No database selected. Use: use <database>");
            return;
          }
          const db = state.client.db(state.currentDb);
          const collections = await db.listCollections();
          for (const coll of collections) {
            console.log(`  ${colors.primary(coll)}`);
          }
          if (collections.length === 0) {
            printInfo("No collections found");
          }
        } else {
          printError("Usage: show dbs | show collections");
        }
        break;
      }

      case "db": {
        if (state.currentDb) {
          console.log(state.currentDb);
        } else {
          printInfo("No database selected");
        }
        break;
      }

      case "find":
      case "findone": {
        if (!state.currentDb || !state.currentColl || !state.client) {
          printError("No collection selected. Format: db.collection.find()");
          return;
        }
        const db = state.client.db(state.currentDb);
        const coll = db.collection(state.currentColl);
        const filter = argsStr ? JSON.parse(argsStr) : {};

        if (command === "findone") {
          const doc = await coll.findOne(filter);
          console.log(formatJson(doc));
        } else {
          const docs = await coll.find(filter).limit(20).toArray();
          for (const doc of docs) {
            console.log(formatJson(doc));
          }
          printInfo(`${docs.length} document(s)`);
        }
        break;
      }

      case "insert": {
        if (!state.currentDb || !state.currentColl || !state.client) {
          printError("No collection selected");
          return;
        }
        if (!argsStr) {
          printError("Usage: insert <document>");
          return;
        }
        const db = state.client.db(state.currentDb);
        const coll = db.collection(state.currentColl);
        const doc = JSON.parse(argsStr);
        const result = await coll.insertOne(doc);
        printSuccess(`Inserted: ${result.insertedId}`);
        break;
      }

      case "update": {
        if (!state.currentDb || !state.currentColl || !state.client) {
          printError("No collection selected");
          return;
        }
        const parts = argsStr?.match(/^(\{[^}]+\})\s+(\{.+\})(?:\s+(.+))?$/);
        if (!parts) {
          printError("Usage: update <filter> <update> [options]");
          return;
        }
        const [, filterStr, updateStr, optionsStr] = parts;
        const filter = JSON.parse(filterStr ?? "{}");
        const update = JSON.parse(updateStr ?? "{}");
        const options = optionsStr ? JSON.parse(optionsStr) : {};

        const db = state.client.db(state.currentDb);
        const coll = db.collection(state.currentColl);

        const result = options.many
          ? await coll.updateMany(filter, update, options)
          : await coll.updateOne(filter, update, options);

        printSuccess(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        break;
      }

      case "delete": {
        if (!state.currentDb || !state.currentColl || !state.client) {
          printError("No collection selected");
          return;
        }
        const filter = argsStr ? JSON.parse(argsStr) : {};
        const db = state.client.db(state.currentDb);
        const coll = db.collection(state.currentColl);
        const result = await coll.deleteOne(filter);
        printSuccess(`Deleted: ${result.deletedCount}`);
        break;
      }

      case "count": {
        if (!state.currentDb || !state.currentColl || !state.client) {
          printError("No collection selected");
          return;
        }
        const filter = argsStr ? JSON.parse(argsStr) : {};
        const db = state.client.db(state.currentDb);
        const coll = db.collection(state.currentColl);
        const count = await coll.countDocuments(filter);
        console.log(count);
        break;
      }

      case "drop": {
        if (!state.currentDb || !state.currentColl || !state.client) {
          printError("No collection selected");
          return;
        }
        const db = state.client.db(state.currentDb);
        await db.dropCollection(state.currentColl);
        printSuccess(`Dropped: ${state.currentColl}`);
        state.currentColl = null;
        break;
      }

      case "help": {
        console.log("\nAvailable commands:\n");
        for (const [name, info] of Object.entries(COMMANDS)) {
          console.log(`  ${colors.primary(name.padEnd(12))} ${colors.dim(info.usage)}`);
          console.log(`  ${" ".repeat(12)} ${info.description}\n`);
        }
        console.log("Collection methods: db.<collection>.find(), findOne(), insert(), etc.\n");
        break;
      }

      case "exit":
      case "quit": {
        if (state.client) {
          await state.client.close();
        }
        process.exit(0);
        break;
      }

      default: {
        const collMatch = trimmed.match(/^db\.(\w+)\.(\w+)\((.*)\)$/);
        if (collMatch && state.currentDb && state.client) {
          const [, collName, method, args] = collMatch;
          state.currentColl = collName ?? null;

          const db = state.client.db(state.currentDb);
          const coll = db.collection(collName ?? "");

          switch (method) {
            case "find": {
              const filter = args ? JSON.parse(args || "{}") : {};
              const docs = await coll.find(filter).limit(20).toArray();
              for (const doc of docs) {
                console.log(formatJson(doc));
              }
              printInfo(`${docs.length} document(s)`);
              break;
            }
            case "findOne": {
              const filter = args ? JSON.parse(args || "{}") : {};
              const doc = await coll.findOne(filter);
              console.log(formatJson(doc));
              break;
            }
            case "insertOne": {
              const doc = JSON.parse(args || "{}");
              const result = await coll.insertOne(doc);
              printSuccess(`Inserted: ${result.insertedId}`);
              break;
            }
            case "count":
            case "countDocuments": {
              const filter = args ? JSON.parse(args || "{}") : {};
              const count = await coll.countDocuments(filter);
              console.log(count);
              break;
            }
            default:
              printError(`Unknown method: ${method}`);
          }
        } else {
          printError(`Unknown command: ${command}. Type 'help' for available commands.`);
        }
      }
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
  }
}

export function registerShellCommand(program: Command): void {
  program
    .command("shell")
    .alias("sh")
    .description("Start interactive shell")
    .option("-p, --path <path>", "Path to database directory", ".")
    .option("-d, --database <name>", "Initial database to use")
    .action(async (options) => {
      const basePath = path.resolve(options.path);

      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      const state: ShellState = {
        client: null,
        basePath,
        currentDb: null,
        currentColl: null,
      };

      if (options.database) {
        state.client = createClient({ path: basePath });
        state.client.db(options.database);
        state.currentDb = options.database;
      }

      console.log("");
      console.log(colors.bold("Toolless Shell"));
      console.log(colors.dim(`Database path: ${basePath}`));
      console.log(colors.dim("Type 'help' for commands, 'exit' to quit"));
      console.log("");

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = (): void => {
        const prefix = state.currentDb
          ? state.currentColl
            ? `${state.currentDb}.${state.currentColl}`
            : state.currentDb
          : "toollessdb";
        rl.question(colors.primary(`${prefix}> `), async (input) => {
          await executeCommand(state, input);
          prompt();
        });
      };

      rl.on("close", async () => {
        if (state.client) {
          await state.client.close();
        }
        console.log("");
        process.exit(0);
      });

      prompt();
    });
}
