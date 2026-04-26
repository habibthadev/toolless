import { Command } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import { createClient } from "../../index";
import ora from "ora";
import { printError, printSuccess, formatBytes, resolveDatabase } from "../utils";

export function registerCompactCommand(program: Command): void {
  program
    .command("compact <database> [collection]")
    .description("Compact a collection or all collections in a database")
    .option("-p, --path <path>", "Path to database directory", "data")
    .action(async (database: string, collection: string | undefined, options) => {
      try {
        const resolved = resolveDatabase(database, options.path);

        if (!resolved) {
          printError(`Database "${database}" not found`);
          process.exit(1);
        }

        const { basePath, dbName } = resolved;
        const client = createClient({ path: basePath });
        const db = client.db(dbName);

        const collections = collection ? [collection] : await db.listCollections();

        for (const name of collections) {
          const spinner = ora(`Compacting ${name}...`).start();
          const filePath = path.join(basePath, `${dbName}.tdb`, `${name}.tdb`);
          const sizeBefore = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

          const coll = db.collection(name);
          await coll.compact();

          const sizeAfter = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
          const saved = sizeBefore - sizeAfter;

          spinner.succeed(
            `${name}: ${formatBytes(sizeBefore)} -> ${formatBytes(sizeAfter)} (saved ${formatBytes(saved)})`
          );
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

export function registerDropCommand(program: Command): void {
  program
    .command("drop <database> <collection>")
    .description("Drop a collection")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("-f, --force", "Skip confirmation")
    .action(async (database: string, collection: string, options) => {
      try {
        const resolved = resolveDatabase(database, options.path);

        if (!resolved) {
          printError(`Database "${database}" not found`);
          process.exit(1);
        }

        const { basePath, dbName } = resolved;
        const client = createClient({ path: basePath });
        const db = client.db(dbName);

        const dropped = await db.dropCollection(collection);

        if (dropped) {
          printSuccess(`Dropped collection "${collection}"`);
        } else {
          printError(`Collection "${collection}" not found`);
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

export function registerExportCommand(program: Command): void {
  program
    .command("export <database> <collection>")
    .description("Export a collection to JSON")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("-o, --output <file>", "Output file (default: stdout)")
    .option("--pretty", "Pretty print JSON")
    .action(async (database: string, collection: string, options) => {
      try {
        const resolved = resolveDatabase(database, options.path);

        if (!resolved) {
          printError(`Database "${database}" not found`);
          process.exit(1);
        }

        const { basePath, dbName } = resolved;
        const client = createClient({ path: basePath });
        const db = client.db(dbName);
        const coll = db.collection(collection);

        const docs = await coll.find({}).toArray();
        const json = options.pretty ? JSON.stringify(docs, null, 2) : JSON.stringify(docs);

        if (options.output) {
          fs.writeFileSync(options.output, json);
          printSuccess(`Exported ${docs.length} documents to ${options.output}`);
        } else {
          console.log(json);
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

export function registerImportCommand(program: Command): void {
  program
    .command("import <database> <collection> <file>")
    .description("Import documents from JSON file")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("--drop", "Drop collection before import")
    .action(async (database: string, collection: string, file: string, options) => {
      try {
        const resolved = resolveDatabase(database, options.path);
        const basePath = resolved?.basePath ?? path.resolve(options.path);
        const dbName = resolved?.dbName ?? database;

        const client = createClient({ path: basePath });
        const db = client.db(dbName);

        if (options.drop) {
          await db.dropCollection(collection);
        }

        const coll = db.collection(collection);
        const content = fs.readFileSync(file, "utf-8");
        const docs = JSON.parse(content) as Array<Record<string, unknown>>;

        if (!Array.isArray(docs)) {
          printError("File must contain a JSON array");
          await client.close();
          process.exit(1);
          return;
        }

        const result = await coll.insertMany(docs);
        printSuccess(`Imported ${result.insertedCount} documents`);

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
