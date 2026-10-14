import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (_request, response, next) => {
  response.locals.requestId = randomUUID();
  response.setHeader("X-Request-ID", response.locals.requestId);
  next();
};
