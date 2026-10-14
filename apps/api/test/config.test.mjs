import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { readConfig } from "../src/config/env.ts";
import { readDatabaseConfig } from "@repo/db/config";

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

test("database configuration requires an explicit PostgreSQL connection and bounded pool", () => {
  const url = "postgresql://host:private-password@127.0.0.1:55432/zentro_test";
  const config = readDatabaseConfig({ DATABASE_URL: url });
  assert.throws(
    () => readDatabaseConfig({ DATABASE_URL: url, NODE_ENV: "invalid" }),
    /^Error: Invalid NODE_ENV$/,
  );
  assert.equal(config.connectionString, url);
  assert.equal(config.max, 10);
  assert.equal(config.connectionTimeoutMillis, 3000);
  assert.equal(config.statement_timeout, 5000);
  assert.equal(config.idle_in_transaction_session_timeout, 5000);
  assert.equal(config.idleTimeoutMillis, 10000);
  assert.equal(config.ssl, false);
  assert.equal(
    readDatabaseConfig({ DATABASE_URL: url, DB_POOL_MAX: "2" }).max,
    2,
  );
  assert.deepEqual(
    readDatabaseConfig({ DATABASE_URL: url, NODE_ENV: "production" }).ssl,
    { rejectUnauthorized: true },
  );
  for (const value of [
    undefined,
    "",
    "https://host:private-password@host/db",
    "postgres://host/db",
    "postgres://host:private-password@host/",
    "postgres://host:private-password%ZZ@host/db",
    `${url}?sslmode=no-verify`,
    `${url}?options=unsafe`,
  ]) {
    assert.throws(
      () => readDatabaseConfig({ DATABASE_URL: value }),
      /^Error: Invalid DATABASE_URL$/,
    );
  }
  assert.throws(
    () =>
      readDatabaseConfig({
        NODE_ENV: "production",
        DATABASE_URL: `${url}?sslmode=disable`,
      }),
    /^Error: Invalid DATABASE_URL$/,
  );
  for (const value of [
    "",
    "0",
    "101",
    "-1",
    "1.5",
    "1e1",
    " 2",
    "private-password",
  ]) {
    assert.throws(
      () => readDatabaseConfig({ DATABASE_URL: url, DB_POOL_MAX: value }),
      /^Error: Invalid DB_POOL_MAX$/,
    );
  }
});

test("database package imports are lazy and browser exports are blocked", () => {
  for (const entry of ["@repo/db", "@repo/db/config", "@repo/db/migrations"]) {
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", `await import('${entry}')`],
      {
        cwd: new URL("../", import.meta.url),
        env: { ...process.env, DATABASE_URL: "invalid", NODE_ENV: "invalid" },
        encoding: "utf8",
        timeout: 3000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    const browser = spawnSync(
      process.execPath,
      [
        "--conditions=browser",
        "--input-type=module",
        "--eval",
        `await import('${entry}')`,
      ],
      {
        cwd: new URL("../", import.meta.url),
        encoding: "utf8",
        timeout: 3000,
      },
    );
    assert.equal(browser.error, undefined);
    assert.notEqual(browser.status, 0);
    assert.match(browser.stderr, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
  }
});

test("database startup failures are sanitized and never advertise an API listener", () => {
  for (const script of ["src/index.ts", "../../packages/db/src/migrate.ts"]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", script], {
      cwd: new URL("../", import.meta.url),
      env: {
        ...process.env,
        NODE_ENV: "test",
        API_HOST: "127.0.0.1",
        API_PORT: "3001",
        DATABASE_URL: "postgres://test:private-password@127.0.0.1:1/missing",
      },
      encoding: "utf8",
      timeout: 7000,
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /database_connection_failed|migration_failed/);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /private-password|postgres:\/\/|API listening/,
    );
  }
});
