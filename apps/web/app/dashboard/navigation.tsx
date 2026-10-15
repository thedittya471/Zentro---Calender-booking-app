"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { workspaceSections } from "./sections";
import { m } from "motion/react";

const links = [
  { href: "/dashboard", label: "Overview" },
  ...workspaceSections.map(({ slug, label }) => ({
    href: `/dashboard/${slug}`,
    label,
  })),
];

export function WorkspaceNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace">
      <ul className="workspace-nav">
        {links.map(({ href, label }, index) => (
          <m.li
            key={href}
            whileHover={{ x: 3 }}
            transition={{ duration: 0.18 }}
          >
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              <span className="nav-index" aria-hidden="true">
                0{index}
              </span>
              {label}
            </Link>
          </m.li>
        ))}
      </ul>
    </nav>
  );
}
