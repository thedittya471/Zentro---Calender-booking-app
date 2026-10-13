import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Better Auth must be mounted here before a parser consumes its request stream.
  app.use(express.json({ limit: 100 * 1024, strict: true, inflate: false }));
  app.use(
    (
      error: { status?: number },
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (
        error.status !== 400 &&
        error.status !== 413 &&
        error.status !== 415
      ) {
        return next(error);
      }
      response.status(error.status).json({ error: "Invalid request body" });
    },
  );
  return app;
}
