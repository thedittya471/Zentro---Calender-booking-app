import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readDatabaseConfig } from "./config.js";

export function createDatabase(env: NodeJS.ProcessEnv) {
  const pool = new pg.Pool(readDatabaseConfig(env));
  pool.on("error", () => {
    console.error(JSON.stringify({ event: "database_pool_error" }));
  });
  return drizzle(pool);
}

export function checkDatabase(db: ReturnType<typeof createDatabase>) {
  // pg supports per-query deadlines; its QueryConfig type omits this option.
  const query = { text: "SELECT 1", query_timeout: 2000 };
  return db.$client.query(query);
}
