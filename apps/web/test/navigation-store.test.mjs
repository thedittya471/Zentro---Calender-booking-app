import assert from "node:assert/strict";
import { test } from "node:test";
import { createNavigationStore } from "../app/dashboard/navigation-store.ts";

test("navigation starts expanded and toggles without leaking between workspace instances", () => {
  const first = createNavigationStore();
  const second = createNavigationStore();
  assert.equal(first.getInitialState().compact, false);
  const changes = [];
  const unsubscribe = first.subscribe((state) => changes.push(state.compact));
  first.getState().toggle();
  assert.equal(first.getState().compact, true);
  assert.equal(second.getState().compact, false);
  assert.equal(first.getInitialState().compact, false);
  first.getState().toggle();
  assert.equal(first.getState().compact, false);
  assert.deepEqual(changes, [true, false]);
  unsubscribe();
  first.getState().toggle();
  assert.deepEqual(changes, [true, false]);
  assert.equal(createNavigationStore().getState().compact, false);
});
