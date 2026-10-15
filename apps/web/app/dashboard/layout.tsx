import Link from "next/link";
import type { ReactNode } from "react";
import { WorkspaceNavigation } from "./navigation";
import { Brand } from "../components/brand";
import { PageTransition } from "../components/page-transition";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Workspace sidebar">
        <div className="sidebar-header">
          <Brand />
          <span className="preview-label">Workspace preview</span>
        </div>
        <WorkspaceNavigation />
        <p className="sidebar-note">
          A little room
          <br />
          for what matters.
        </p>
      </aside>
      <main className="workspace-content" id="main-content" tabIndex={-1}>
        <header className="workspace-topbar">
          <span>YOUR PERSONAL WORKSPACE</span>
          <Link href="/">Visit the website ↗</Link>
        </header>
        <p className="preview-note">
          Scheduling and account features aren’t available yet.
        </p>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
