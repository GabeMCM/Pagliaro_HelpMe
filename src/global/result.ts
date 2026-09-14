import * as T from "./structure.ts";

export function success<TData>(
  message: T.MessageResult,
  data: TData,
): T.Success<TData> {
  return {
    success: true,
    message,
    data: serializeData(data) as TData,
    error: null,
  };
}

export function fail(
  message: T.MessageResult,
  err: unknown = new Error(message),
): T.Failure {
  return {
    success: false,
    message,
    data: null,
    error: serializeError(err),
  };
}

export function requestError(err: unknown): T.Failure {
  return fail(T.ResponseMessage[400], err);
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



