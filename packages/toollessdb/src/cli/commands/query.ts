import { Command } from "commander";
import { createClient } from "../../index";
import Table from "cli-table3";
import { colors, formatJson, printError, truncate, resolveDatabase } from "../utils";

export function registerQueryCommand(program: Command): void {
  program
    .command("query <database> <collection>")
    .alias("q")
    .description("Query documents from a collection")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("-f, --filter <json>", "Filter as JSON", "{}")
    .option("-s, --sort <json>", "Sort specification as JSON")
    .option("-l, --limit <number>", "Limit results", "20")
    .option("-k, --skip <number>", "Skip results", "0")
    .option("--fields <fields>", "Comma-separated fields to display")
    .option("--json", "Output as JSON array")
    .option("--count", "Only show count")
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

        const filter = JSON.parse(options.filter);

        if (options.count) {
          const count = await coll.countDocuments(filter);
          console.log(count);
          await client.close();
          return;
        }

        let cursor = coll.find(filter);

        if (options.sort) {
          cursor = cursor.sort(JSON.parse(options.sort));
        }

        cursor = cursor.skip(parseInt(options.skip, 10)).limit(parseInt(options.limit, 10));

        const docs = await cursor.toArray();

        if (options.json) {
          console.log(formatJson(docs));
          await client.close();
          return;
        }

        if (docs.length === 0) {
          printError("No documents found");
          await client.close();
          return;
        }

        const fields = options.fields
          ? options.fields.split(",").map((f: string) => f.trim())
          : Object.keys(docs[0] ?? {}).slice(0, 6);

        const table = new Table({
          head: fields.map((f: string) => colors.bold(f)),
          style: { head: [], border: [] },
          colWidths: fields.map(() => Math.floor(80 / fields.length)),
          wordWrap: true,
        });

        for (const doc of docs) {
          const row = fields.map((field: string) => {
            const value = (doc as Record<string, unknown>)[field];
            if (value === undefined) return colors.dim("-");
            if (typeof value === "object") return truncate(JSON.stringify(value), 30);
            return truncate(String(value), 30);
          });
          table.push(row);
        }

        console.log(table.toString());
        console.log(colors.muted(`\nShowing ${docs.length} document(s)`));

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
