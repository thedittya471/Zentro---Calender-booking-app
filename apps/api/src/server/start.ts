import { createApp } from "../app.js";
import { readConfig } from "../config/env.js";
import { checkDatabase, createDatabase } from "@repo/db";

export async function startServer() {
  const config = readConfig(process.env);
  const db = createDatabase(process.env);
  let stopping = false;
  const app = createApp(undefined, async () => {
    if (stopping) throw new Error("Server stopping");
    await checkDatabase(db);
    if (stopping) throw new Error("Server stopping");
  });

  try {
    await checkDatabase(db);
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
