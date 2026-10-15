import { parseReadiness } from "../../../lib/api.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    // This exact public probe forwards no browser cookies or authorization.
    const origin = new URL(
      process.env.API_ORIGIN ??
        (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3001" : ""),
    );
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/"
    )
      throw new Error("Invalid API_ORIGIN");
    const upstream = await fetch(new URL("/health/ready", origin), {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(6_000)]),
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) throw new Error("Service unavailable");
    return Response.json(parseReadiness(await upstream.json()), { headers });
  } catch {
    return Response.json(
      { error: { code: "NOT_READY", message: "Service not ready" } },
      { status: 503, headers },
    );
  }
}
