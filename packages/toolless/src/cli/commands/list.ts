import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "../../index";
import Table from "cli-table3";
import { colors, formatBytes, formatCount, printError } from "../utils";

export function registerListCommand(program: Command): void {
  program
    .command("list [database]")
    .alias("ls")
    .description("List databases or collections")
    .option("-p, --path <path>", "Path to database directory", ".")
    .action(async (database: string | undefined, options: { path: string }) => {
      try {
        const basePath = path.resolve(options.path);

        if (!database) {
          const entries = fs.readdirSync(basePath, { withFileTypes: true });
          const databases = entries
            .filter((e) => e.isDirectory() && e.name.endsWith(".tdb"))
            .map((e) => e.name.replace(".tdb", ""));

          if (databases.length === 0) {
            printError(`No databases found in ${basePath}`);
            return;
          }

          const table = new Table({
            head: [colors.bold("Database"), colors.bold("Collections"), colors.bold("Size")],
            style: { head: [], border: [] },
          });

          for (const dbName of databases) {
            const dbPath = path.join(basePath, `${dbName}.tdb`);
            const files = fs.readdirSync(dbPath);
            const collections = files.filter(
              (f) => f.endsWith(".tdb") && !f.startsWith("_")
            ).length;
            const size = files.reduce((acc, f) => {
              const stat = fs.statSync(path.join(dbPath, f));
              return acc + stat.size;
            }, 0);

            table.push([colors.primary(dbName), collections.toString(), formatBytes(size)]);
          }

          console.log(table.toString());
        } else {
          const client = createClient({ path: basePath });
          const db = client.db(database);
          const collections = await db.listCollections();

          if (collections.length === 0) {
            printError(`No collections in database "${database}"`);
            await client.close();
            return;
          }

          const table = new Table({
            head: [colors.bold("Collection"), colors.bold("Documents"), colors.bold("Size")],
            style: { head: [], border: [] },
          });

          for (const name of collections) {
            const coll = db.collection(name);
            const count = await coll.countDocuments();
            const filePath = path.join(basePath, `${database}.tdb`, `${name}.tdb`);
            const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

            table.push([colors.primary(name), formatCount(count), formatBytes(size)]);
          }

          console.log(table.toString());
          await client.close();
        }
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
