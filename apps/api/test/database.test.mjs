import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";
import { withDatabase } from "./fixtures/database.mjs";

test("database fixture rejects an unexpected database before writing", async (t) => {
  t.mock.method(pg.Client.prototype, "connect", async () => {});
  const queries = [];
  t.mock.method(pg.Client.prototype, "query", async (sql) => {
    queries.push(sql);
    return { rows: [{ database: "zentro", username: "zentro" }] };
  });
  const end = t.mock.method(pg.Client.prototype, "end", async () => {});
  await assert.rejects(
    withDatabase(async () => assert.fail("Unsafe fixture callback ran")),
    { code: "ERR_ASSERTION" },
  );
  assert.equal(queries.length, 1);
  assert.match(queries[0], /^SELECT current_database/);
  assert.equal(end.mock.callCount(), 1);
});

test("database fixtures isolate concurrent tests", async () => {
  await withDatabase(async (first) => {
    await first.query("CREATE TABLE fixture_values (value text UNIQUE)");
    await first.query("INSERT INTO fixture_values VALUES ($1)", ["first"]);
    await withDatabase(async (second) => {
      await second.query("CREATE TABLE fixture_values (value text UNIQUE)");
      await second.query("INSERT INTO fixture_values VALUES ($1)", ["second"]);
      assert.deepEqual(
        (await first.query("SELECT value FROM fixture_values")).rows,
        [{ value: "first" }],
      );
      assert.deepEqual(
        (await second.query("SELECT value FROM fixture_values")).rows,
        [{ value: "second" }],
      );
    });
  });
});

test("database fixture removes schema after a failed transaction", async () => {
  let schema;
  await assert.rejects(
    withDatabase(async (client) => {
      schema = (await client.query("SELECT current_schema() AS name")).rows[0]
        .name;
      await client.query("BEGIN");
      await client.query("SELECT * FROM missing_fixture_table");
    }),
    { code: "42P01" },
  );
  await withDatabase(async (client) => {
    const remaining = await client.query(
      "SELECT 1 FROM pg_namespace WHERE nspname = $1",
      [schema],
    );
    assert.equal(remaining.rowCount, 0);
  });
});

test("database fixtures do not use application or libpq environment connections", async () => {
  const names = [
    "DATABASE_URL",
    "PGHOST",
    "PGPORT",
    "PGDATABASE",
    "PGUSER",
    "PGPASSWORD",
  ];
  const previous = names.map((name) => process.env[name]);
  for (const name of names) process.env[name] = "not-a-test-connection";
  try {
    await withDatabase(async (client) => {
      const identity = await client.query("SELECT current_database() AS name");
      assert.equal(identity.rows[0].name, "zentro_test");
    });
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
