import { Command } from "commander";
import * as path from "node:path";
import { createClient } from "../../index";
import { printError, printSuccess, formatJson, resolveDatabase } from "../utils";

export function registerInsertCommand(program: Command): void {
  program
    .command("insert <database> <collection> <document>")
    .alias("i")
    .description("Insert a document into a collection")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("--json", "Output result as JSON")
    .action(async (database: string, collection: string, document: string, options) => {
      try {
        const resolved = resolveDatabase(database, options.path);
        const basePath = resolved?.basePath ?? path.resolve(options.path);
        const dbName = resolved?.dbName ?? database;

        const client = createClient({ path: basePath });
        const db = client.db(dbName);
        const coll = db.collection(collection);

        const doc = JSON.parse(document);

        if (Array.isArray(doc)) {
          const result = await coll.insertMany(doc);
          if (options.json) {
            console.log(formatJson(result));
          } else {
            printSuccess(`Inserted ${result.insertedCount} documents`);
          }
        } else {
          const result = await coll.insertOne(doc);
          if (options.json) {
            console.log(formatJson(result));
          } else {
            printSuccess(`Inserted document with _id: ${result.insertedId}`);
          }
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

export function registerUpdateCommand(program: Command): void {
  program
    .command("update <database> <collection> <filter> <update>")
    .alias("u")
    .description("Update documents in a collection")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("--many", "Update all matching documents")
    .option("--upsert", "Create document if not found")
    .option("--json", "Output result as JSON")
    .action(
      async (
        database: string,
        collection: string,
        filterStr: string,
        updateStr: string,
        options
      ) => {
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

          const filter = JSON.parse(filterStr);
          const update = JSON.parse(updateStr);
          const updateOptions = { upsert: options.upsert ?? false };

          const result = options.many
            ? await coll.updateMany(filter, update, updateOptions)
            : await coll.updateOne(filter, update, updateOptions);

          if (options.json) {
            console.log(formatJson(result));
          } else {
            printSuccess(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
            if (result.upsertedId) {
              printSuccess(`Upserted: ${result.upsertedId}`);
            }
          }

          await client.close();
        } catch (err) {
          printError(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      }
    );
}

export function registerDeleteCommand(program: Command): void {
  program
    .command("delete <database> <collection> <filter>")
    .alias("d")
    .description("Delete documents from a collection")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("--many", "Delete all matching documents")
    .option("--json", "Output result as JSON")
    .action(async (database: string, collection: string, filterStr: string, options) => {
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

        const filter = JSON.parse(filterStr);

        const result = options.many ? await coll.deleteMany(filter) : await coll.deleteOne(filter);

        if (options.json) {
          console.log(formatJson(result));
        } else {
          printSuccess(`Deleted ${result.deletedCount} document(s)`);
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
