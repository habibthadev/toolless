import { Command } from "commander";
import { createClient } from "../../index";
import Table from "cli-table3";
import { colors, formatJson, printError, printSuccess, resolveDatabase } from "../utils";

export function registerIndexCommand(program: Command): void {
  const indexCmd = program.command("index").description("Manage collection indexes");

  indexCmd
    .command("list <database> <collection>")
    .description("List indexes on a collection")
    .option("-p, --path <path>", "Path to database directory", ".")
    .option("--json", "Output as JSON")
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

        const indexes = await coll.listIndexes();

        if (options.json) {
          console.log(formatJson(indexes));
          await client.close();
          return;
        }

        if (indexes.length === 0) {
          printError("No indexes defined");
          await client.close();
          return;
        }

        const table = new Table({
          head: [colors.bold("Name"), colors.bold("Fields"), colors.bold("Unique")],
          style: { head: [], border: [] },
        });

        for (const idx of indexes) {
          const fields = Object.entries(idx.spec)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          table.push([colors.primary(idx.name), fields, idx.unique ? colors.success("Yes") : "No"]);
        }

        console.log(table.toString());
        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  indexCmd
    .command("create <database> <collection> <spec>")
    .description('Create an index (spec: {"field": 1} or {"a": 1, "b": -1})')
    .option("-p, --path <path>", "Path to database directory", ".")
    .option("-n, --name <name>", "Index name")
    .option("-u, --unique", "Unique index")
    .action(async (database: string, collection: string, specStr: string, options) => {
      try {
        const resolved = resolveDatabase(database, options.path);
        const basePath = resolved?.basePath ?? options.path;
        const dbName = resolved?.dbName ?? database;

        const client = createClient({ path: basePath });
        const db = client.db(dbName);
        const coll = db.collection(collection);

        const spec = JSON.parse(specStr);
        const indexOptions: { name?: string; unique?: boolean } = {};

        if (options.name) indexOptions.name = options.name;
        if (options.unique) indexOptions.unique = true;

        const name = await coll.createIndex(spec, indexOptions);
        printSuccess(`Created index: ${name}`);

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  indexCmd
    .command("drop <database> <collection> <name>")
    .description("Drop an index by name")
    .option("-p, --path <path>", "Path to database directory", ".")
    .action(async (database: string, collection: string, name: string, options) => {
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

        const dropped = await coll.dropIndex(name);

        if (dropped) {
          printSuccess(`Dropped index: ${name}`);
        } else {
          printError(`Index "${name}" not found`);
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
