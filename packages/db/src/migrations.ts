import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { MigrationConfig } from "drizzle-orm/migrator";
import type { createDatabase } from "./database.js";

export function migrateDatabase(
  db: ReturnType<typeof createDatabase>,
  config: MigrationConfig = {
    migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)),
    migrationsSchema: "drizzle",
    migrationsTable: "__drizzle_migrations",
  },
) {
  return migrate(db, config);
}
