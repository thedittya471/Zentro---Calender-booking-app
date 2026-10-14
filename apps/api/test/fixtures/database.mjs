import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

export const databaseUrl =
  "postgresql://zentro_test:test_only@127.0.0.1:55432/zentro_test";

export async function withDatabase(run) {
  // Fixed test-only connection: application/libpq environment must not redirect cleanup.
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: false,
    connectionTimeoutMillis: 3000,
    statement_timeout: 5000,
  });
  const schema = `fixture_${randomUUID().replaceAll("-", "")}`;
  let created = false;
  try {
    await client.connect();
    const identity = await client.query(
      "SELECT current_database() AS database, current_user AS username",
    );
    assert.equal(identity.rows[0].database, "zentro_test");
    assert.equal(identity.rows[0].username, "zentro_test");
    // This identifier is generated internally from a UUID, never user input.
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    return await run(client);
  } finally {
    try {
      if (created) {
        await client.query("ROLLBACK");
        await client.query("RESET search_path");
        await client.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
    } finally {
      await client.end();
    }
  }
}
