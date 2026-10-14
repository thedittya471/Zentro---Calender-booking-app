import { createApp } from "../app.js";
import { readConfig } from "../config/env.js";
import { createDatabase } from "@repo/db";
import { sql } from "drizzle-orm";

export async function startServer() {
  const config = readConfig(process.env);
  const app = createApp();
  const db = createDatabase(process.env);

  try {
    await db.execute(sql`SELECT 1`);
    const server = app.listen(config.port, config.host);
    server.on("error", (error: NodeJS.ErrnoException) => {
      console.error(
        JSON.stringify({
          event: "api_startup_failed",
          code: error.code === "EADDRINUSE" ? "EADDRINUSE" : "LISTEN_FAILED",
        }),
      );
      process.exitCode = 1;
      shutdown();
    });
    server.on("listening", () => {
      const host = config.host.includes(":") ? `[${config.host}]` : config.host;
      console.info(`API listening on http://${host}:${config.port}`);
    });
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      const deadline = setTimeout(() => process.exit(1), 10000);
      server.close(async () => {
        await db.$client.end();
        clearTimeout(deadline);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch {
    console.error(JSON.stringify({ event: "database_connection_failed" }));
    await db.$client.end();
    process.exitCode = 1;
  }
}
