import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="entry-page" id="main-content" tabIndex={-1}>
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>This page doesn’t exist or its address has changed.</p>
      <Link className="primary-link" href="/dashboard">
        Back to overview
      </Link>
    </main>
  );
}
