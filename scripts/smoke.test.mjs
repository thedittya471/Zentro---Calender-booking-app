import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  NODE_ENV: "production",
  API_HOST: "127.0.0.1",
  API_PORT: "3001",
  PORT: "3000",
};
const apiEnv = {
  ...env,
  NODE_ENV: "test",
  DATABASE_URL:
    "postgresql://zentro_test:test_only@127.0.0.1:55432/zentro_test",
  DB_POOL_MAX: "2",
};

async function start(t, args, cwd, ready, childEnv = env) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 3000);
    try {
      const [code, signal] = await exited;
      if (childEnv === apiEnv) {
        assert.equal(code, 0, `API shutdown failed (${signal})`);
      }
    } finally {
      clearTimeout(timeout);
    }
  });
  await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error(`Startup timed out: ${output}`)),
      15000,
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited before readiness (${code}): ${output}`));
    });
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (chunk) => {
        output += chunk;
        if (ready.test(output)) {
          clearTimeout(timeout);
          resolve();
        }
      });
    }
  });
}

test(
  "built workspace applications start and respond",
  { timeout: 25000 },
  async (t) => {
    await start(
      t,
      ["dist/index.js"],
      `${root}apps/api`,
      /API listening/,
      apiEnv,
    );
    await start(
      t,
      ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"],
      `${root}apps/web`,
      /Ready in/,
    );

    const page = await fetch("http://127.0.0.1:3000", {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<h1>Zentro<\/h1>/);

    const api = await fetch("http://127.0.0.1:3001", {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(api.status, 404);
    assert.equal(api.headers.get("x-powered-by"), null);
    const requestId = api.headers.get("x-request-id");
    assert.ok(requestId);
    assert.deepEqual(await api.json(), {
      error: { code: "NOT_FOUND", message: "Route not found" },
      requestId,
    });

    for (const [path, status] of [
      ["live", "alive"],
      ["ready", "ready"],
    ]) {
      const response = await fetch(`http://127.0.0.1:3001/health/${path}`, {
        signal: AbortSignal.timeout(6000),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status });
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(response.headers.get("x-request-id"));
    }

    const duplicateApi = spawnSync(
      process.execPath,
      ["apps/api/dist/index.js"],
      { cwd: root, env: apiEnv, encoding: "utf8", timeout: 5000 },
    );
    assert.equal(duplicateApi.error, undefined);
    assert.notEqual(duplicateApi.status, 0);
    assert.match(duplicateApi.stderr, /EADDRINUSE/);
    assert.doesNotMatch(duplicateApi.stdout, /API listening/);

    const worker = execFileSync(
      process.execPath,
      ["apps/worker/dist/index.js"],
      { cwd: root, env, encoding: "utf8", timeout: 5000 },
    );
    assert.match(worker, /no job processing configured/);
  },
);
