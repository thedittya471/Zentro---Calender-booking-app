import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { ApiError, getReadiness } from "../app/lib/api.ts";
import { createQueryClient, readinessQuery } from "../app/lib/queries.ts";
import { GET } from "../app/api/health/ready/route.ts";

test("typed reads validate responses, omit HTTP bodies and propagate cancellation", async (t) => {
  const responses = [
    Response.json({ status: "ready", secret: "ignored" }),
    Response.json({ status: "alive" }),
    Response.json(
      { error: { message: "private upstream details" } },
      { status: 401 },
    ),
    new Response("not json"),
  ];
  t.mock.method(globalThis, "fetch", async (path, options) => {
    assert.equal(path, "/api/health/ready");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    return responses.shift();
  });
  assert.deepEqual(await getReadiness(), { status: "ready" });
  await assert.rejects(getReadiness(), /Unexpected service response/);
  await assert.rejects(getReadiness(), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
  await assert.rejects(getReadiness());
  t.mock.restoreAll();

  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, "fetch", async (_path, { signal }) =>
    signal.throwIfAborted(),
  );
  await assert.rejects(getReadiness(controller.signal), { name: "AbortError" });
  const deadline = AbortSignal.abort(
    new DOMException("Timed out", "TimeoutError"),
  );
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    assert.equal(milliseconds, 10_000);
    return deadline;
  });
  await assert.rejects(getReadiness(), { name: "TimeoutError" });
});

test("query cache deduplicates, reuses fresh data, invalidates and isolates clients", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ status: "ready" });
  });
  const client = createQueryClient();
  const other = createQueryClient();
  try {
    await Promise.all([
      client.fetchQuery(readinessQuery),
      client.fetchQuery(readinessQuery),
    ]);
    await client.fetchQuery(readinessQuery);
    assert.equal(calls, 1);
    assert.equal(other.getQueryData(readinessQuery.queryKey), undefined);
    await client.invalidateQueries({ queryKey: readinessQuery.queryKey });
    await client.fetchQuery(readinessQuery);
    assert.equal(calls, 2);
    assert.equal(client.getDefaultOptions().queries.gcTime, 300_000);
    client.clear();
    assert.equal(client.getQueryData(readinessQuery.queryKey), undefined);
  } finally {
    client.clear();
    other.clear();
  }
});

test("query failures never enter the success cache or automatically retry; explicit retry recovers", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return calls === 1
      ? Response.json({}, { status: 503 })
      : Response.json({ status: "ready" });
  });
  const client = createQueryClient();
  try {
    await assert.rejects(client.fetchQuery(readinessQuery), ApiError);
    assert.equal(calls, 1);
    assert.equal(client.getQueryData(readinessQuery.queryKey), undefined);
    assert.deepEqual(await client.fetchQuery(readinessQuery), {
      status: "ready",
    });
    assert.equal(calls, 2);
  } finally {
    client.clear();
  }
});

test("cancelling a query aborts its transport without caching a result", async (t) => {
  let requestSignal;
  t.mock.method(globalThis, "fetch", async (_path, { signal }) => {
    requestSignal = signal;
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  });
  const client = createQueryClient();
  try {
    const pending = client.fetchQuery(readinessQuery);
    const rejection = assert.rejects(pending);
    await client.cancelQueries({ queryKey: readinessQuery.queryKey });
    await rejection;
    assert.equal(requestSignal.aborted, true);
    assert.equal(client.getQueryData(readinessQuery.queryKey), undefined);
  } finally {
    client.clear();
  }
});

test("bridge enforces its upstream deadline and sanitizes timeouts", async (t) => {
  const originalOrigin = process.env.API_ORIGIN;
  process.env.API_ORIGIN = "http://127.0.0.1:3001";
  let deadlineMilliseconds;
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    deadlineMilliseconds = milliseconds;
    return AbortSignal.abort(
      new DOMException("private timeout context", "TimeoutError"),
    );
  });
  t.mock.method(globalThis, "fetch", async (_path, { signal }) =>
    signal.throwIfAborted(),
  );
  try {
    const response = await GET(
      new Request("http://web.example/api/health/ready"),
    );
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /private/);
    assert.equal(deadlineMilliseconds, 6_000);
  } finally {
    if (originalOrigin === undefined) delete process.env.API_ORIGIN;
    else process.env.API_ORIGIN = originalOrigin;
  }
});

test("same-origin bridge uses a fixed public probe, strips credentials and disables caching", async () => {
  const originalOrigin = process.env.API_ORIGIN;
  const originalMode = process.env.NODE_ENV;
  let status = 200;
  let body = { status: "ready", internal: "never forward" };
  let received;
  const server = createServer((request, response) => {
    received = request;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = () =>
    new Request("http://web.example/api/health/ready?target=untrusted", {
      headers: { Cookie: "private=session", Authorization: "Bearer private" },
    });
  try {
    process.env.API_ORIGIN = origin;
    const healthy = await GET(request());
    assert.equal(healthy.status, 200);
    assert.equal(healthy.headers.get("cache-control"), "no-store");
    assert.deepEqual(await healthy.json(), { status: "ready" });
    assert.equal(received.url, "/health/ready");
    assert.equal(received.headers.cookie, undefined);
    assert.equal(received.headers.authorization, undefined);
    for (const [nextStatus, nextBody] of [
      [503, { secret: "internal failure" }],
      [200, { status: "alive" }],
    ]) {
      status = nextStatus;
      body = nextBody;
      const failed = await GET(request());
      assert.equal(failed.status, 503);
      assert.equal(failed.headers.get("cache-control"), "no-store");
      assert.deepEqual(await failed.json(), {
        error: { code: "NOT_READY", message: "Service not ready" },
      });
    }
    for (const invalid of [
      "",
      "file:///tmp/private",
      `${origin}/unexpected`,
      `${origin}?secret=x`,
      "http://user:password@localhost",
    ]) {
      process.env.API_ORIGIN = invalid;
      assert.equal((await GET(request())).status, 503);
    }
    delete process.env.API_ORIGIN;
    process.env.NODE_ENV = "production";
    assert.equal((await GET(request())).status, 503);
    process.env.API_ORIGIN = origin;
    await new Promise((resolve) => server.close(resolve));
    assert.equal((await GET(request())).status, 503);
  } finally {
    if (originalOrigin === undefined) delete process.env.API_ORIGIN;
    else process.env.API_ORIGIN = originalOrigin;
    if (originalMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalMode;
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
});
