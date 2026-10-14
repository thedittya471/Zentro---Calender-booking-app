import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { Router } from "express";
import { createApp } from "../src/app.ts";
import { withApi } from "./fixtures/api.mjs";

test("API fixture serves the application without fixed ports", async () => {
  await withApi(async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-powered-by"), null);
  });
});

test("health endpoints distinguish process liveness from readiness and redact failures", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (entry) => logs.push(JSON.parse(entry)));
  let failing = false;
  let checks = 0;
  const app = createApp(undefined, async () => {
    checks++;
    if (failing)
      throw new Error("postgres://private-password@private-host guest details");
  });
  await withApi(async (url) => {
    const live = await fetch(`${url}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: "alive" });
    assert.equal(live.headers.get("cache-control"), "no-store");
    assert.ok(live.headers.get("x-request-id"));
    assert.equal(checks, 0);
    const ready = await fetch(`${url}/health/ready`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: "ready" });
    assert.equal(ready.headers.get("cache-control"), "no-store");
    failing = true;
    const unavailable = await fetch(`${url}/health/ready`);
    const requestId = unavailable.headers.get("x-request-id");
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("cache-control"), "no-store");
    assert.deepEqual(await unavailable.json(), {
      error: { code: "NOT_READY", message: "Service not ready" },
      requestId,
    });
    assert.deepEqual(logs, [
      { event: "readiness_failed", requestId, code: "NOT_READY" },
    ]);
    assert.doesNotMatch(
      JSON.stringify(logs),
      /private-password|private-host|guest details/,
    );
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
    assert.equal(checks, 2);
    failing = false;
    assert.equal((await fetch(`${url}/health/ready`)).status, 200);
    const head = await fetch(`${url}/health/live`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.equal(
      (await fetch(`${url}/health/live`, { method: "POST" })).status,
      404,
    );
  }, app);
});

test("readiness without a configured dependency check fails closed", async (t) => {
  t.mock.method(console, "error", () => {});
  await withApi(async (url) => {
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
    assert.equal((await fetch(`${url}/health/ready`)).status, 503);
  });
});

test("JSON parsing accepts bounded bodies and safely rejects invalid requests", async (t) => {
  const routes = Router();
  routes.post("/echo", (request, response) => {
    response.json({ body: request.body ?? null });
  });
  const limit = 100 * 1024;
  const boundary = JSON.stringify({ value: "x".repeat(limit - 12) });
  assert.equal(Buffer.byteLength(boundary), limit);
  const cases = [
    {
      name: "JSON object",
      body: '{"value":"hello"}',
      status: 200,
      parsed: { value: "hello" },
    },
    { name: "JSON array", body: "[1,2]", status: 200, parsed: [1, 2] },
    {
      name: "exact byte limit",
      body: boundary,
      status: 200,
      parsed: JSON.parse(boundary),
    },
    { name: "body over byte limit", body: boundary + " ", status: 413 },
    {
      name: "chunked body over byte limit without Content-Length",
      body: (async function* () {
        yield boundary;
        yield " ";
      })(),
      status: 413,
    },
    {
      name: "multibyte body over byte limit",
      body: JSON.stringify({ value: "é".repeat(limit / 2) }),
      status: 413,
    },
    {
      name: "malformed JSON containing sensitive text",
      body: '{"secret":"private-probe",broken}',
      status: 400,
    },
    { name: "JSON primitive", body: '"private-probe"', status: 400 },
    {
      name: "compressed JSON",
      body: gzipSync('{"value":"hello"}'),
      encoding: "gzip",
      status: 415,
    },
    {
      name: "unsupported charset",
      body: "{}",
      type: "application/json; charset=iso-8859-1",
      status: 415,
    },
    {
      name: "unparsed plain text",
      body: "hello",
      type: "text/plain",
      status: 200,
      parsed: null,
    },
    {
      name: "unparsed form body",
      body: "value=hello",
      type: "application/x-www-form-urlencoded",
      status: 200,
      parsed: null,
    },
    { name: "empty JSON body", body: "", status: 200, parsed: {} },
  ];
  await withApi(async (url) => {
    for (const entry of cases) {
      await t.test(entry.name, async () => {
        const response = await fetch(`${url}/echo`, {
          method: "POST",
          headers: {
            "content-type": entry.type ?? "application/json",
            ...(entry.encoding ? { "content-encoding": entry.encoding } : {}),
          },
          body: entry.body,
          duplex: "half",
          signal: AbortSignal.timeout(3000),
        });
        assert.equal(response.status, entry.status);
        assert.equal(response.headers.get("x-powered-by"), null);
        assert.ok(response.headers.get("x-request-id"));
        assert.deepEqual(
          await response.json(),
          entry.status === 200
            ? { body: entry.parsed }
            : {
                error: {
                  code:
                    entry.status === 400
                      ? "INVALID_REQUEST_BODY"
                      : entry.status === 413
                        ? "PAYLOAD_TOO_LARGE"
                        : "UNSUPPORTED_MEDIA_TYPE",
                  message:
                    entry.status === 400
                      ? "Invalid request body"
                      : entry.status === 413
                        ? "Request body too large"
                        : "Unsupported request body encoding",
                },
                requestId: response.headers.get("x-request-id"),
              },
        );
      });
    }
  }, createApp(routes));
});

test("missing routes return consistent errors with unique server-generated IDs", async () => {
  await withApi(async (url) => {
    const ids = new Set();
    for (const clientId of ["caller-controlled", "another-id"]) {
      const response = await fetch(`${url}/private-probe?secret=hidden`, {
        headers: { "x-request-id": clientId },
      });
      const requestId = response.headers.get("x-request-id");
      assert.match(
        requestId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      assert.notEqual(requestId, clientId);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), {
        error: { code: "NOT_FOUND", message: "Route not found" },
        requestId,
      });
      ids.add(requestId);
    }
    assert.equal(ids.size, 2);
  });
});

test("successful requests have a request identifier available to handlers", async () => {
  const routes = Router();
  routes.get("/ok", (_request, response) =>
    response.json({ requestId: response.locals.requestId }),
  );
  await withApi(async (url) => {
    const response = await fetch(`${url}/ok`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      requestId: response.headers.get("x-request-id"),
    });
  }, createApp(routes));
});

test("unexpected sync, async and non-Error failures are sanitized and correlated", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (entry) => logs.push(entry));
  const routes = Router();
  routes.get("/sync", () => {
    throw new Error("private-probe");
  });
  routes.get("/async", async () => {
    throw new Error("private-probe");
  });
  routes.get("/unknown", (_request, _response, next) => next("private-probe"));
  routes.get("/fake-status", () => {
    throw Object.assign(new Error("private-probe"), { status: 401 });
  });
  await withApi(async (url) => {
    for (const path of ["sync", "async", "unknown", "fake-status"]) {
      const response = await fetch(`${url}/${path}`, {
        headers: { authorization: "private-probe" },
      });
      const requestId = response.headers.get("x-request-id");
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        requestId,
      });
      assert.deepEqual(JSON.parse(logs.at(-1)), {
        event: "request_failed",
        requestId,
        code: "INTERNAL_ERROR",
      });
    }
  }, createApp(routes));
  assert.equal(logs.length, 4);
  assert.doesNotMatch(logs.join(""), /private-probe|authorization|stack/);
});

test("errors after response headers close the stream without a second response", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (entry) => logs.push(entry));
  const routes = Router();
  routes.get("/stream", (_request, response, next) => {
    response.write("partial response");
    setImmediate(() => next(new Error("private-probe")));
  });
  await withApi(async (url) => {
    await assert.rejects(
      async () => {
        const response = await fetch(`${url}/stream`, {
          signal: AbortSignal.timeout(3000),
        });
        await response.text();
      },
      (error) =>
        error instanceof TypeError &&
        ["UND_ERR_SOCKET", "ECONNRESET"].includes(error.cause?.code),
    );
    assert.equal(logs.length, 1);
    assert.equal(JSON.parse(logs[0]).code, "INTERNAL_ERROR");
    assert.doesNotMatch(logs.join(""), /private-probe/);
    const healthyResponse = await fetch(url);
    assert.equal(healthyResponse.status, 404);
  }, createApp(routes));
});

test("API fixture closes its listener when a test fails", async () => {
  let address;
  const failure = new Error("intentional fixture failure");
  await assert.rejects(
    withApi(async (url) => {
      address = url;
      throw failure;
    }),
    (error) => error === failure,
  );
  await assert.rejects(fetch(address, { signal: AbortSignal.timeout(1000) }));
});

test("API fixtures can run simultaneously without sharing ports", async () => {
  await withApi(async (first) => {
    await withApi(async (second) => {
      assert.notEqual(first, second);
      const responses = await Promise.all([fetch(first), fetch(second)]);
      assert.deepEqual(
        responses.map((response) => response.status),
        [404, 404],
      );
      await Promise.all(responses.map((response) => response.text()));
    });
  });
});
