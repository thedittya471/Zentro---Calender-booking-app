import express, { type Router } from "express";
import { handleError } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestId } from "./middleware/request-id.js";
import { healthRoutes } from "./routes/health.js";

export function createApp(
  routes: Router = express.Router(),
  checkReadiness?: () => Promise<unknown>,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(healthRoutes(checkReadiness));
  // Better Auth must be mounted here before a parser consumes its request stream.
  app.use(express.json({ limit: 100 * 1024, strict: true, inflate: false }));
  app.use(routes);
  app.use(notFound);
  app.use(handleError);
  return app;
}
