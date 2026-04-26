import { Command } from "commander";
import * as path from "node:path";
import * as fs from "node:fs";
import { createClient } from "../../index";
import Table from "cli-table3";
import { colors, formatBytes, formatCount, printError, resolveDatabase } from "../utils";

export function registerStatsCommand(program: Command): void {
  program
    .command("stats [database] [collection]")
    .description("Show database or collection statistics")
    .option("-p, --path <path>", "Path to database directory", "data")
    .option("--json", "Output as JSON")
    .action(async (database: string | undefined, collection: string | undefined, options) => {
      try {
        if (!database) {
          const basePath = path.resolve(options.path);

          const entries = fs.readdirSync(basePath, { withFileTypes: true });
          const databases = entries
            .filter((e) => e.isDirectory() && e.name.endsWith(".tdb"))
            .map((e) => e.name.replace(".tdb", ""));

          let totalSize = 0;
          let totalCollections = 0;

          for (const dbName of databases) {
            const dbPath = path.join(basePath, `${dbName}.tdb`);
            const files = fs.readdirSync(dbPath);
            totalCollections += files.filter(
              (f) => f.endsWith(".tdb") && !f.startsWith("_")
            ).length;
            totalSize += files.reduce((acc, f) => {
              const stat = fs.statSync(path.join(dbPath, f));
              return acc + stat.size;
            }, 0);
          }

          const stats = {
            path: basePath,
            databases: databases.length,
            collections: totalCollections,
            totalSize,
          };

          if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log("");
            console.log(colors.bold("  Database Statistics"));
            console.log("");
            console.log(`  ${colors.dim("Path:")}        ${basePath}`);
            console.log(`  ${colors.dim("Databases:")}   ${databases.length}`);
            console.log(`  ${colors.dim("Collections:")} ${totalCollections}`);
            console.log(`  ${colors.dim("Total Size:")}  ${formatBytes(totalSize)}`);
            console.log("");
          }
          return;
        }

        const resolved = resolveDatabase(database, options.path);

        if (!resolved) {
          printError(`Database "${database}" not found`);
          process.exit(1);
        }

        const { basePath, dbName } = resolved;
        const client = createClient({ path: basePath });
        const db = client.db(dbName);
        const dbPath = path.join(basePath, `${dbName}.tdb`);

        if (collection) {
          const coll = db.collection(collection);
          const count = await coll.countDocuments();
          const filePath = path.join(dbPath, `${collection}.tdb`);
          const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
          const idxPath = path.join(dbPath, `${collection}.idx.tdb`);
          const idxSize = fs.existsSync(idxPath) ? fs.statSync(idxPath).size : 0;
          const indexes = await coll.listIndexes();

          const stats = {
            collection,
            documents: count,
            dataSize: fileSize,
            indexSize: idxSize,
            totalSize: fileSize + idxSize,
            indexes: indexes.length,
          };

          if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log("");
            console.log(colors.bold(`  Collection: ${collection}`));
            console.log("");
            console.log(`  ${colors.dim("Documents:")}  ${formatCount(count)}`);
            console.log(`  ${colors.dim("Data Size:")}  ${formatBytes(fileSize)}`);
            console.log(`  ${colors.dim("Index Size:")} ${formatBytes(idxSize)}`);
            console.log(`  ${colors.dim("Total Size:")} ${formatBytes(fileSize + idxSize)}`);
            console.log(`  ${colors.dim("Indexes:")}    ${indexes.length}`);
            console.log("");
          }
        } else {
          const collections = await db.listCollections();
          let totalDocs = 0;
          let totalSize = 0;
          let totalIndexes = 0;

          const collStats = [];

          for (const name of collections) {
            const coll = db.collection(name);
            const count = await coll.countDocuments();
            const filePath = path.join(dbPath, `${name}.tdb`);
            const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
            const indexes = await coll.listIndexes();

            totalDocs += count;
            totalSize += size;
            totalIndexes += indexes.length;

            collStats.push({ name, documents: count, size, indexes: indexes.length });
          }

          const stats = {
            database: dbName,
            collections: collections.length,
            documents: totalDocs,
            totalSize,
            indexes: totalIndexes,
            collectionStats: collStats,
          };

          if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log("");
            console.log(colors.bold(`  Database: ${dbName}`));
            console.log("");
            console.log(`  ${colors.dim("Collections:")} ${collections.length}`);
            console.log(`  ${colors.dim("Documents:")}   ${formatCount(totalDocs)}`);
            console.log(`  ${colors.dim("Total Size:")}  ${formatBytes(totalSize)}`);
            console.log(`  ${colors.dim("Indexes:")}     ${totalIndexes}`);
            console.log("");

            if (collStats.length > 0) {
              const table = new Table({
                head: [
                  colors.bold("Collection"),
                  colors.bold("Documents"),
                  colors.bold("Size"),
                  colors.bold("Indexes"),
                ],
                style: { head: [], border: [] },
              });

              for (const cs of collStats) {
                table.push([
                  cs.name,
                  formatCount(cs.documents),
                  formatBytes(cs.size),
                  cs.indexes.toString(),
                ]);
              }

              console.log(table.toString());
              console.log("");
            }
          }
        }

        await client.close();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
