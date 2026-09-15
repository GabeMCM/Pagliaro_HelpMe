import type { Context } from "@hono/hono";
import { UserRepository } from "../user/user.repo.ts";
import { userIdFromAuthorization } from "./auth.ts";
import { fail, serializeData, success } from "./result.ts";
import * as T from "./structure.ts";

export { fail, requestError } from "./result.ts";

export async function getCurrentUser(
  c: Context,
  user_repo: UserRepository,
): Promise<T.Result<T.User>> {
  const auth_result = await userIdFromAuthorization(
    c.req.header("authorization"),
  );

  if (!auth_result.success) {
    return auth_result;
  }

  const user_result = await user_repo.findById(auth_result.data.user_id);

  if (!user_result.success) {
    return fail("Usuário autenticado não encontrado", 401);
  }

  if (!user_result.data.active) {
    return fail("Usuário desativado", 403);
  }

  return success(user_result.message, user_result.data);
}

export function respond<TData>(c: Context, result: T.Result<TData>) {
  return c.json(serializeData(result), result.status);
}
