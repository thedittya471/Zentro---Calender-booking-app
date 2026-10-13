import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig(process.env);
const app = createApp();

app.listen(config.port, config.host, (error?: Error) => {
  if (error) throw error;
  const host = config.host.includes(":") ? `[${config.host}]` : config.host;
  console.info(`API listening on http://${host}:${config.port}`);
});
