"use client";

import { useStore } from "zustand";
import { useNavigationStore } from "./workspace-shell";
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
  const store = useNavigationStore();
  const compact = useStore(store, (state) => state.compact);
  return (
    <nav aria-label="Workspace">
      <button
        className="navigation-toggle secondary-button"
        type="button"
        aria-label="Compact navigation"
        aria-pressed={compact}
        title={compact ? "Expand navigation" : "Compact navigation"}
        aria-controls="workspace-navigation"
        onClick={() => store.getState().toggle()}
      >
        <span aria-hidden="true">{compact ? "→" : "←"}</span>
        <span className="navigation-label">Compact navigation</span>
      </button>
      <ul className="workspace-nav" id="workspace-navigation">
        {links.map(({ href, label }, index) => (
          <m.li
            key={href}
            whileHover={{ x: 3 }}
            transition={{ duration: 0.18 }}
          >
            <Link
              href={href}
              title={compact ? label : undefined}
              aria-current={pathname === href ? "page" : undefined}
            >
              <span className="nav-index" aria-hidden="true">
                0{index}
              </span>
              <span className="navigation-label">{label}</span>
            </Link>
          </m.li>
        ))}
      </ul>
    </nav>
  );
}
