import assert from "node:assert/strict";
import { test } from "node:test";
import pg from "pg";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { createDatabase } from "@repo/db";
import { migrateDatabase } from "@repo/db/migrations";
import { databaseUrl, withDatabase } from "./fixtures/database.mjs";
import { withApi } from "./fixtures/api.mjs";

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

test("Drizzle transactions roll back and a saturated pool rejects bounded acquisition", async () => {
  await withDatabase(async (client) => {
    const schema = (await client.query("SELECT current_schema() AS name"))
      .rows[0].name;
    const db = createDatabase({
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      DB_POOL_MAX: "1",
    });
    try {
      await db.execute(
        sql.raw(`CREATE TABLE "${schema}".pool_values (value integer UNIQUE)`),
      );
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.execute(
            sql.raw(`INSERT INTO "${schema}".pool_values VALUES (1)`),
          );
          await tx.execute(
            sql.raw(`INSERT INTO "${schema}".pool_values VALUES (1)`),
          );
        }),
        (error) => error.cause?.code === "23505",
      );
      assert.equal(
        (
          await client.query(
            "SELECT count(*)::integer AS count FROM pool_values",
          )
        ).rows[0].count,
        0,
      );
      const held = await db.$client.connect();
      try {
        await assert.rejects(
          db.$client.connect(),
          /timeout exceeded when trying to connect/,
        );
        assert.equal(db.$client.totalCount, 1);
      } finally {
        held.release();
      }
      assert.equal((await db.execute(sql`SELECT 1 AS value`)).rows[0].value, 1);
    } finally {
      await db.$client.end();
    }
    assert.equal(db.$client.totalCount, 0);
  });
});

test("database statements time out and leave the pool usable", async () => {
  const db = createDatabase({ NODE_ENV: "test", DATABASE_URL: databaseUrl });
  try {
    await assert.rejects(
      db.execute(sql`SELECT pg_sleep(10)`),
      (error) => error.cause?.code === "57014",
    );
    assert.equal((await db.execute(sql`SELECT 1 AS value`)).rows[0].value, 1);
  } finally {
    await db.$client.end();
  }
});

test("idle pool errors omit connection details", (t) => {
  const logs = [];
  t.mock.method(console, "error", (entry) => logs.push(entry));
  const db = createDatabase({ NODE_ENV: "test", DATABASE_URL: databaseUrl });
  db.$client.emit("error", new Error("private-password guest details"));
  assert.deepEqual(
    logs.map((entry) => JSON.parse(entry)),
    [{ event: "database_pool_error" }],
  );
  return db.$client.end();
});

test("migrations apply once, preserve existing data, and roll back a failed batch", async () => {
  await withDatabase(async (client) => {
    const schema = (await client.query("SELECT current_schema() AS name"))
      .rows[0].name;
    const folder = await mkdtemp(join(tmpdir(), "zentro-migrations-"));
    const db = createDatabase({
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      DB_POOL_MAX: "1",
    });
    const config = {
      migrationsFolder: folder,
      migrationsSchema: schema,
      migrationsTable: "migration_history",
    };
    const entries = [
      { idx: 0, version: "7", when: 1, tag: "0000_fixture", breakpoints: true },
    ];
    try {
      await mkdir(join(folder, "meta"));
      await writeFile(
        join(folder, "meta/_journal.json"),
        JSON.stringify({ version: "7", dialect: "postgresql", entries }),
      );
      await writeFile(
        join(folder, "0000_fixture.sql"),
        `CREATE TABLE "${schema}".migration_values (value integer PRIMARY KEY);\n--> statement-breakpoint\nINSERT INTO "${schema}".migration_values VALUES (42);`,
      );
      await migrateDatabase(db, config);
      await migrateDatabase(db, config);
      assert.deepEqual(
        (await client.query("SELECT value FROM migration_values")).rows,
        [{ value: 42 }],
      );
      assert.equal(
        (
          await client.query(
            "SELECT count(*)::integer AS count FROM migration_history",
          )
        ).rows[0].count,
        1,
      );
      entries.push({
        idx: 1,
        version: "7",
        when: 2,
        tag: "0001_failure",
        breakpoints: true,
      });
      await writeFile(
        join(folder, "meta/_journal.json"),
        JSON.stringify({ version: "7", dialect: "postgresql", entries }),
      );
      await writeFile(
        join(folder, "0001_failure.sql"),
        `CREATE TABLE "${schema}".rolled_back (value integer);\n--> statement-breakpoint\nSELECT * FROM "${schema}".missing_table;`,
      );
      await assert.rejects(
        migrateDatabase(db, config),
        (error) => error.cause?.code === "42P01",
      );
      assert.equal(
        (
          await client.query("SELECT to_regclass($1) AS name", [
            `${schema}.rolled_back`,
          ])
        ).rows[0].name,
        null,
      );
      assert.equal(
        (
          await client.query(
            "SELECT count(*)::integer AS count FROM migration_history",
          )
        ).rows[0].count,
        1,
      );
      assert.deepEqual(
        (await client.query("SELECT value FROM migration_values")).rows,
        [{ value: 42 }],
      );
    } finally {
      await db.$client.end();
      await rm(folder, { recursive: true, force: true });
    }
  });
});

test("connected API startup rejects an occupied listener and releases its pool", async () => {
  await withDatabase(async () => {
    await withApi(async (url) => {
      const result = spawnSync(
        process.execPath,
        ["--import", "tsx", "src/index.ts"],
        {
          cwd: new URL("../", import.meta.url),
          env: {
            ...process.env,
            NODE_ENV: "test",
            API_HOST: "127.0.0.1",
            API_PORT: new URL(url).port,
            DATABASE_URL: databaseUrl,
          },
          encoding: "utf8",
          timeout: 7000,
        },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /EADDRINUSE/);
      assert.doesNotMatch(
        result.stdout + result.stderr,
        /API listening|test_only|postgresql:\/\//,
      );
    });
  });
});
