import type { Context } from "@hono/hono";
import { SQLiteAdapter } from "../../global/sqlite.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";

const user_repo = new UserRepository(
  new SQLiteAdapter("local.db", "users"),
);

const user_service = new UserService(user_repo);

export async function deleteUser(c: Context) {
  const current_user = await getCurrentUser(c);

  if (!current_user.success) {
    return c.json(current_user, 403);
  }

  const id = c.req.param("id");

  if (!id) {
    return c.json(fail("Id não informado"), 400);
  }

  const result = await user_service.delete(current_user.data, id);

  if (result.success) {
    return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
  }

  return c.json({ ...result, message: result.message }, statusFromResult(result));
}

async function getCurrentUser(c: Context): Promise<T.Result<T.User>> {
  const user_id = c.req.header("x-user-id");

  if (!user_id) {
    return fail("Usuário não informado");
  }

  return await user_repo.findById(user_id);
}

function statusFromResult(result: T.Failure): keyof typeof T.ResponseMessage {
  if (result.message === "id not found") {
    return 404;
  }

  return 403;
}

function fail(message: string): T.Failure {
  return {
    success: false,
    message,
    data: null,
    error: new Error(message),
  };
}
