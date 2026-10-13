import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { readConfig } from "../src/config.ts";
import { withApi } from "./fixtures/api.mjs";

test("API configuration defaults to local development", () => {
  assert.deepEqual(readConfig({}), {
    nodeEnv: "development",
    host: "127.0.0.1",
    port: 3001,
  });
});

test("API configuration accepts explicit deployment settings", () => {
  assert.deepEqual(
    readConfig({
      NODE_ENV: "production",
      API_HOST: "0.0.0.0",
      API_PORT: "8080",
    }),
    { nodeEnv: "production", host: "0.0.0.0", port: 8080 },
  );
  assert.equal(readConfig({ API_HOST: "::1", API_PORT: "65535" }).host, "::1");
  assert.equal(readConfig({ NODE_ENV: "test", API_PORT: "1" }).port, 1);
});

test("API configuration rejects malformed settings without exposing values", () => {
  for (const value of [
    "",
    "0",
    "65536",
    "-1",
    "1.5",
    "1e3",
    " 3001",
    "3001x",
  ]) {
    assert.throws(
      () => readConfig({ API_PORT: value }),
      /^Error: Invalid API_PORT$/,
    );
  }
  for (const value of [
    "",
    "localhost",
    "https://secret.example",
    "127.0.0.999",
  ]) {
    assert.throws(
      () => readConfig({ API_HOST: value }),
      /^Error: Invalid API_HOST$/,
    );
  }
  for (const value of ["", "preview", "secret-runtime-value"]) {
    assert.throws(
      () => readConfig({ NODE_ENV: value }),
      /^Error: Invalid NODE_ENV$/,
    );
  }
});

test("invalid configuration terminates API startup before listening", () => {
  for (const key of ["NODE_ENV", "API_HOST", "API_PORT"]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/index.ts"],
      {
        cwd: new URL("../", import.meta.url),
        env: {
          ...process.env,
          NODE_ENV: "test",
          API_HOST: "127.0.0.1",
          API_PORT: "3001",
          [key]: "secret-invalid-value",
        },
        encoding: "utf8",
        timeout: 3000,
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`Invalid ${key}`));
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /secret-invalid-value|API listening/,
    );
  }
});

test("API startup uses the configured port and rejects an occupied listener", async () => {
  await withApi(async (url) => {
    const port = new URL(url).port;
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/index.ts"],
      {
        cwd: new URL("../", import.meta.url),
        env: {
          ...process.env,
          NODE_ENV: "production",
          API_HOST: "127.0.0.1",
          API_PORT: port,
        },
        encoding: "utf8",
        timeout: 3000,
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /EADDRINUSE/);
    assert.match(result.stderr, new RegExp(`port: ${port}`));
    assert.doesNotMatch(result.stdout, /API listening/);
  });
});
