export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("The service is unavailable. Please try again.");
    this.name = "ApiError";
    this.status = status;
  }
}

export function parseReadiness(value: unknown): { status: "ready" } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("status" in value) ||
    value.status !== "ready"
  ) {
    throw new Error("Unexpected service response. Please try again.");
  }
  return { status: "ready" };
}

export async function getReadiness(signal?: AbortSignal) {
  const response = await fetch("/api/health/ready", {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new ApiError(response.status);
  return parseReadiness(await response.json());
}
