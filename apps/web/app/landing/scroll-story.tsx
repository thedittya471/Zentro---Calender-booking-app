"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let initialAnchorHandled = false;

export function ScrollStory({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.to(scope.querySelector(".principle-flower"), {
          rotation: 100,
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: scope.querySelector(".landing-principle"),
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
        scope
          .querySelectorAll<HTMLElement>("[data-reveal]")
          .forEach((element) => {
            gsap.fromTo(
              element,
              { y: 32 },
              {
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: element,
                  start: "top 90%",
                  toggleActions: "play none none reverse",
                },
              },
            );
          });
      },
      scope,
    );
    media.add(
      "(min-width: 56.25rem) and (min-height: 40.625rem) and (prefers-reduced-motion: no-preference)",
      () => {
        gsap.fromTo(
          scope.querySelector(".hero-art .week-preview"),
          { rotationX: 10, rotationY: -16, rotationZ: -6, y: 0 },
          {
            rotationX: -3,
            rotationY: 12,
            rotationZ: 4,
            y: -60,
            ease: "none",
            scrollTrigger: {
              trigger: scope.querySelector(".landing-hero"),
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
        gsap.to(scope.querySelector(".floating-note"), {
          yPercent: -25,
          rotation: -7,
          ease: "none",
          scrollTrigger: {
            trigger: scope.querySelector(".landing-hero"),
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
        gsap.to(scope.querySelectorAll(".hero-art .week-cell"), {
          x: (index) => ((index % 5) - 2) * 30,
          y: (index) => (Math.floor(index / 5) - 1.5) * 25,
          rotationZ: (index) => (index % 2 ? -12 : 12),
          ease: "none",
          scrollTrigger: {
            trigger: scope.querySelector(".landing-hero"),
            start: "top 5%",
            end: "bottom top",
            scrub: 0.6,
          },
        });
        scope.querySelectorAll(".story-step").forEach((chapter) => {
          gsap.fromTo(
            chapter.querySelector(".story-art"),
            { y: 60, rotationY: 12 },
            {
              y: -20,
              rotationY: -5,
              ease: "none",
              scrollTrigger: {
                trigger: chapter,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            },
          );
        });
        for (const [selector, from] of [
          [".story-link .sample-avatar", { y: -50, scale: 0.75 }],
          [".story-link .sample-link", { x: 80, rotationZ: 8 }],
          [".story-meet .meeting-people > span:first-child", { x: -70 }],
          [".story-meet .meeting-people > span:last-child", { x: 70 }],
          [".story-meet .meeting-check", { scale: 0.3, rotationZ: -90 }],
        ] as const) {
          const element = scope.querySelector(selector);
          if (!element) continue;
          gsap.fromTo(element, from, {
            x: 0,
            y: 0,
            scale: 1,
            rotationZ: 0,
            ease: "none",
            scrollTrigger: {
              trigger: element.closest(".story-step"),
              start: "top 85%",
              end: "top 30%",
              scrub: 0.5,
            },
          });
        }
      },
      scope,
    );
    // Measure the finished layout before native history restores a position.
    ScrollTrigger.refresh();
    const frame = requestAnimationFrame(() => {
      // Later route returns retain native history restoration instead of jumping to old hashes.
      if (initialAnchorHandled) return;
      initialAnchorHandled = true;
      const anchor = window.location.hash.slice(1);
      if (["questions", "how-it-works", "main-content"].includes(anchor)) {
        document.getElementById(anchor)?.scrollIntoView({ block: "start" });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      media.revert();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
