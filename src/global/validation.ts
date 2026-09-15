import { fail, success } from "./result.ts";
import * as T from "./structure.ts";

export function asObject(value: unknown): T.Result<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail("O corpo da requisição deve ser um objeto", 400);
  }

  return success("Objeto válido", value as Record<string, unknown>);
}

export function asDate(value: unknown, field: string): T.Result<Date> {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return success("Data válida", value);
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return success("Data válida", date);
    }
  }

  return fail(`Campo ${field} deve ser uma data válida`, 400);
}

export function asPagination(
  limit_value: string | undefined,
  offset_value: string | undefined,
): T.Result<{ limit: number; offset: number }> {
  const limit = limit_value === undefined ? 50 : Number(limit_value);
  const offset = offset_value === undefined ? 0 : Number(offset_value);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return fail("Limit deve ser um inteiro entre 1 e 100", 400);
  }

  if (!Number.isInteger(offset) || offset < 0) {
    return fail("Offset deve ser um inteiro maior ou igual a zero", 400);
  }

  return success("Paginação válida", { limit, offset });
}

export function hasOnlyKeys(
  data: Record<string, unknown>,
  allowed_keys: string[],
): boolean {
  return Object.keys(data).every((key) => allowed_keys.includes(key));
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
