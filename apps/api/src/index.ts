import { createApp } from "./app.js";

const app = createApp();

app.listen(3001, "127.0.0.1", (error?: Error) => {
  if (error) throw error;
  console.info("API listening on http://127.0.0.1:3001");
});
