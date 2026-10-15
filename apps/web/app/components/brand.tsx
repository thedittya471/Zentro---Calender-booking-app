import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        z
      </span>
      <span>
        Zentro
        <span className="brand-period" aria-hidden="true">
          .
        </span>
      </span>
    </Link>
  );
}
