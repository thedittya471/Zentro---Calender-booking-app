import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { workspaceSections } from "../sections";

type PageProps = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return workspaceSections.map(({ slug }) => ({ section: slug }));
}

function findSection(slug: string) {
  const section = workspaceSections.find((entry) => entry.slug === slug);
  if (!section) notFound();
  return section;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return { title: findSection((await params).section).label };
}

export default async function WorkspaceSectionPage({ params }: PageProps) {
  const { label, description } = findSection((await params).section);
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Your workspace</p>
        <h1>{label}</h1>
        <p>{description}</p>
      </header>
      <section className="empty-state" aria-label={`${label} preview`}>
        <span className="empty-icon" aria-hidden="true">
          ↗
        </span>
        <p className="eyebrow">Coming soon</p>
        <h2>This section isn’t available yet</h2>
        <p className="muted">
          You can explore the workspace, but you can’t manage your scheduling
          here yet.
        </p>
        <Link href="/dashboard">Back to overview</Link>
      </section>
    </>
  );
}
