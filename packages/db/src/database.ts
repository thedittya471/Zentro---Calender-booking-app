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
