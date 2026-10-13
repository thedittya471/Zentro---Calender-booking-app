import assert from "node:assert/strict";
import { test } from "node:test";
import { withApi } from "./fixtures/api.mjs";

test("API fixture serves the application without fixed ports", async () => {
  await withApi(async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-powered-by"), null);
  });
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
