import type { ReactNode } from "react";

export function FormFeedback({
  children,
  tone = "status",
}: {
  children?: ReactNode;
  tone?: "status" | "error";
}) {
  return (
    <div
      className="form-feedback"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
      aria-atomic="true"
    >
      {children}
    </div>
  );
}
