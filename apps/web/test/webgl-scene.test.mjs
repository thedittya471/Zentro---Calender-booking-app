import assert from "node:assert/strict";
import { test } from "node:test";
import { createScene } from "../app/landing/webgl-scene.ts";

test("unavailable or blocked WebGL leaves the static fallback intact", () => {
  for (const getContext of [
    () => null,
    () => {
      throw new Error("Graphics blocked");
    },
  ]) {
    const canvas = { getContext, dataset: {} };
    const dispose = createScene(canvas);
    assert.equal(canvas.dataset.ready, undefined);
    assert.doesNotThrow(dispose);
  }
});

test("failed shader allocation or linking releases partial GPU resources", () => {
  for (const failedAllocation of [true, false]) {
    const deleted = [];
    const program = {};
    const shaders = [];
    const gl = {
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 2,
      createProgram: () => program,
      createShader: () => {
        if (failedAllocation) return null;
        const shader = {};
        shaders.push(shader);
        return shader;
      },
      shaderSource() {},
      compileShader() {},
      attachShader() {},
      linkProgram() {},
      getProgramParameter: () => false,
      deleteShader: (shader) => deleted.push(shader),
      deleteProgram: (value) => deleted.push(value),
    };
    const canvas = { getContext: () => gl, dataset: {} };
    createScene(canvas)();
    assert.deepEqual(deleted, [...shaders, program]);
    assert.equal(canvas.dataset.ready, undefined);
  }
});

test("renders only on demand, caps resolution and cleans up after context loss", () => {
  const frames = new Map();
  let nextFrame = 0;
  let draws = 0;
  let released = 0;
  const browser = Object.assign(new EventTarget(), {
    devicePixelRatio: 3,
    scrollY: 0,
  });
  const page = Object.assign(new EventTarget(), { hidden: false });
  const replacements = {
    window: browser,
    document: page,
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  const originals = Object.fromEntries(
    Object.keys(replacements).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    createProgram: () => ({}),
    createShader: () => ({}),
    shaderSource() {},
    compileShader() {},
    attachShader() {},
    linkProgram() {},
    getProgramParameter: () => true,
    getUniformLocation: () => null,
    viewport() {},
    useProgram() {},
    uniform2f() {},
    uniform1f() {},
    drawArrays: () => {
      draws++;
    },
    deleteShader: () => {
      released++;
    },
    deleteProgram: () => {
      released++;
    },
  };
  const canvas = Object.assign(new EventTarget(), {
    clientWidth: 2400,
    clientHeight: 1600,
    width: 300,
    height: 150,
    dataset: {},
    getContext: () => gl,
  });
  let dispose;
  try {
    dispose = createScene(canvas);
    browser.dispatchEvent(new Event("scroll"));
    browser.dispatchEvent(new Event("resize"));
    assert.equal(frames.size, 1);
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback();
    assert.equal(draws, 1);
    assert.equal(frames.size, 0, "no idle rendering loop");
    assert.equal(canvas.width, 1200);
    assert.equal(canvas.height, 800);
    assert.equal(canvas.dataset.ready, "true");
    page.hidden = true;
    browser.dispatchEvent(new Event("scroll"));
    assert.equal(frames.size, 0);
    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frames.size, 1);
    canvas.dispatchEvent(new Event("webglcontextlost"));
    assert.equal(frames.size, 0);
    assert.equal(canvas.dataset.ready, undefined);
    browser.dispatchEvent(new Event("scroll"));
    assert.equal(frames.size, 0);
  } finally {
    dispose?.();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
  assert.equal(released, 3);
  browser.dispatchEvent(new Event("resize"));
  assert.equal(frames.size, 0, "listeners removed on disposal");
});
