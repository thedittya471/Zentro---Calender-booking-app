import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const requestId: RequestHandler = (_request, response, next) => {
  response.locals.requestId = randomUUID();
  response.setHeader("X-Request-ID", response.locals.requestId);
  next();
};

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
    requestId: response.locals.requestId,
  });
};

export function handleError(
  error: unknown,
  _request: Request,
  response: Response<unknown, { requestId: string }>,
  next: NextFunction,
) {
  void next; // Express recognizes error middleware by its four-argument arity.
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Internal server error";
  if (error instanceof Error && "type" in error) {
    switch (error.type) {
      case "entity.too.large":
        status = 413;
        code = "PAYLOAD_TOO_LARGE";
        message = "Request body too large";
        break;
      case "encoding.unsupported":
      case "charset.unsupported":
        status = 415;
        code = "UNSUPPORTED_MEDIA_TYPE";
        message = "Unsupported request body encoding";
        break;
      case "entity.parse.failed":
      case "request.aborted":
      case "request.size.invalid":
        status = 400;
        code = "INVALID_REQUEST_BODY";
        message = "Invalid request body";
    }
  }
  if (status === 500) {
    console.error(
      JSON.stringify({
        event: "request_failed",
        requestId: response.locals.requestId,
        code,
      }),
    );
  }
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.status(status).json({
    error: { code, message },
    requestId: response.locals.requestId,
  });
}
