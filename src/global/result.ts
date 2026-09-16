import type { Context } from "@hono/hono";
import type * as T from "./structure.ts";

export function success<TData>(
  message: string,
  data: TData,
  status: T.SuccessStatus = 200,
): T.Success<TData> {
  return { success: true, status, message, data, error: null };
}

export function fail(
  message: string,
  status: T.FailureStatus = 400,
  err: unknown = new Error(message),
): T.Failure {
  return {
    success: false,
    status,
    message,
    data: null,
    error: {
      name: err instanceof Error ? err.name : "Error",
      message: err instanceof Error ? err.message : String(err),
    },
  };
}

export function requestError(err: unknown): T.Failure {
  if (err instanceof SyntaxError) {
    return fail("JSON inválido", 400);
  }

  return internalError(err);
}

export function internalError(err: unknown): T.Failure {
  console.error(err);
  return fail("Erro interno", 500);
}

export function respond<TData>(c: Context, result: T.Result<TData>) {
  return c.json(result, result.status);
}
