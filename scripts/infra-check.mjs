import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const compose = ["compose", "-f", "compose.dev.yaml", "-p", "calendly-local"];

const postgres = execFileSync(
  "docker",
  [
    ...compose,
    "exec",
    "-T",
    "postgres",
    "sh",
    "-c",
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atqc "SELECT 1"',
  ],
  { cwd, encoding: "utf8", timeout: 10000 },
);
assert.equal(
  postgres.trim(),
  "1",
  "PostgreSQL must accept an authenticated query",
);

const redis = execFileSync(
  "docker",
  [
    ...compose,
    "exec",
    "-T",
    "redis",
    "sh",
    "-c",
    'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping',
  ],
  { cwd, encoding: "utf8", timeout: 10000 },
);
assert.equal(
  redis.trim(),
  "PONG",
  "Redis must accept an authenticated command",
);
console.info("Local PostgreSQL and Redis connection checks passed.");
