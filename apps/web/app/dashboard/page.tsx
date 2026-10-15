import type { Metadata } from "next";
import Link from "next/link";
import { ServiceStatus } from "./service-status";
import { FormPreview } from "./form-preview";
import { workspaceSections } from "./sections";

export const metadata: Metadata = { title: "Overview" };

export default function WorkspacePage() {
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Your workspace</p>
        <h1>Your scheduling workspace</h1>
        <p>Meetings, availability and calendar connections, in one place.</p>
      </header>
      <ul className="section-list" aria-label="Explore your workspace">
        {workspaceSections.map(({ slug, label, description }) => (
          <li key={slug}>
            <Link href={`/dashboard/${slug}`}>
              <span>
                <strong>{label}</strong>
                <span className="muted">{description}</span>
              </span>
              <span className="section-action">
                Explore <span aria-hidden="true">↗</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <FormPreview />
      <ServiceStatus />
    </>
  );
}
