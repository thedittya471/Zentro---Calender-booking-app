"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { createScene } from "./webgl-scene";

export function AmbientScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const element = canvas.current;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () =>
      createScene(element),
    );
    return () => media.revert();
  }, []);
  return (
    <div className="ambient-scene" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
