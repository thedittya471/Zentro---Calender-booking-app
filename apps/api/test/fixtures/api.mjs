import { once } from "node:events";
import { createApp } from "../../src/app.ts";

export async function withApi(run, app = createApp()) {
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  }
}
