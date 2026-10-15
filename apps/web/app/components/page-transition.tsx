"use client";

import { m, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  return (
    <m.div
      className="page-transition"
      key={pathname}
      initial={reducedMotion ? false : { y: 12 }}
      animate={{ y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
