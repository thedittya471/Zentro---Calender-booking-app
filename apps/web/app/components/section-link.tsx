"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function SectionLink({
  href,
  className,
  children,
}: {
  href: `#${string}`;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={className}
      href={href}
      onNavigate={() => {
        const target = document.getElementById(href.slice(1));
        target?.focus({ preventScroll: true });
        // Next.js deduplicates navigation to the current fragment.
        if (window.location.hash === href) {
          target?.scrollIntoView({ block: "start" });
        }
      }}
    >
      {children}
    </Link>
  );
}
