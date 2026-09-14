import type { Context } from "@hono/hono";
import { UserRepository } from "../user/user.repo.ts";
import { userIdFromAuthorization } from "./auth.ts";
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

  return await user_repo.findById(auth_result.data.user_id);
}

export function statusFromResult(
  result: T.Failure,
): keyof typeof T.ResponseMessage {
  if (result.message === "id not found") {
    return 404;
  }

  if (result.message === "Chamado em andamento não pode ser desativado") {
    return 400;
  }

  return 403;
}
