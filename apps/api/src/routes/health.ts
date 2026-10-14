import { Router } from "express";

export function healthRoutes(checkReadiness?: () => Promise<unknown>) {
  const router = Router();
  router.get("/health/live", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({ status: "alive" });
  });
  router.get("/health/ready", async (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    try {
      if (!checkReadiness) throw new Error("Readiness check not configured");
      await checkReadiness();
      response.json({ status: "ready" });
    } catch {
      console.error(
        JSON.stringify({
          event: "readiness_failed",
          requestId: response.locals.requestId,
          code: "NOT_READY",
        }),
      );
      response.status(503).json({
        error: { code: "NOT_READY", message: "Service not ready" },
        requestId: response.locals.requestId,
      });
    }
  });
  return router;
}
