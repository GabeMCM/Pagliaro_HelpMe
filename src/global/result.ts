import * as T from "./structure.ts";

export function success<TData>(
  message: string,
  data: TData,
  status: T.SuccessStatus = 200,
): T.Success<TData> {
  return {
    success: true,
    status,
    message,
    data,
    error: null,
  };
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
    error: serializeError(err),
  };
}

export function requestError(err: unknown): T.Failure {
  if (err instanceof SyntaxError) {
    return fail("JSON inválido", 400, err);
  }

  return internalError(err);
}

export function internalError(err: unknown): T.Failure {
  console.error(err);
  return fail(T.ResponseMessage[500], 500);
}

export function serializeError(err: unknown): T.SerializedError {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
    };
  }

  return {
    name: "Error",
    message: String(err),
  };
}

export function serializeData(data: unknown): unknown {
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof Error) {
    return serializeError(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item));
  }

  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeData(value);
    }

    return result;
  }

  return data;
}
