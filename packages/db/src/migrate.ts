import { createDatabase } from "./database.js";
import { migrateDatabase } from "./migrations.js";

const db = createDatabase({ ...process.env, DB_POOL_MAX: "1" });
try {
  await migrateDatabase(db);
  console.info("Database migrations applied");
} catch {
  console.error(JSON.stringify({ event: "migration_failed" }));
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
