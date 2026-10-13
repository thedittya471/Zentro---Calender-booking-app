import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { createApp } from "../src/app.ts";
import { withApi } from "./fixtures/api.mjs";

test("API fixture serves the application without fixed ports", async () => {
  await withApi(async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-powered-by"), null);
  });
});

test("JSON parsing accepts bounded bodies and safely rejects invalid requests", async (t) => {
  const app = createApp();
  app.post("/echo", (request, response) => {
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
        assert.deepEqual(
          await response.json(),
          entry.status === 200
            ? { body: entry.parsed }
            : { error: "Invalid request body" },
        );
      });
    }
  }, app);
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
