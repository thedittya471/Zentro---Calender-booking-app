import { isIP } from "node:net";

export function readConfig(env: NodeJS.ProcessEnv) {
  const nodeEnv = env.NODE_ENV ?? "development";
  const host = env.API_HOST ?? "127.0.0.1";
  const portText = env.API_PORT ?? "3001";

  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error("Invalid NODE_ENV");
  }
  if (!isIP(host)) throw new Error("Invalid API_HOST");
  const port = Number(portText);
  if (
    !/^\d+$/.test(portText) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Invalid API_PORT");
  }

  return { nodeEnv, host, port };
}
