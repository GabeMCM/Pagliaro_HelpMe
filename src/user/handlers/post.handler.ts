import type { Context } from "@hono/hono";
import { SQLiteAdapter } from "../../global/sqlite.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";

const user_repo = new UserRepository(
  new SQLiteAdapter("local.db", "users"),
);

const user_service = new UserService(user_repo);

export async function createUser(c: Context) {
  try {
    const current_user = await getCurrentUser(c);

    if (!current_user.success) {
      return c.json(current_user, 403);
    }

    const user = await c.req.json<Omit<T.User, "id">>();
    const result = await user_service.create(current_user.data, user);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[201] }, 201);
    }

    return c.json({ ...result, message: result.message }, 403);
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}

async function getCurrentUser(c: Context): Promise<T.Result<T.User>> {
  const user_id = c.req.header("x-user-id");

  if (!user_id) {
    return fail("Usuário não informado");
  }

  return await user_repo.findById(user_id);
}

function requestError(err: unknown): T.Failure {
  return {
    success: false,
    message: T.ResponseMessage[400],
    data: null,
    error: err instanceof Error ? err : new Error(String(err)),
  };
}

function fail(message: string): T.Failure {
  return {
    success: false,
    message,
    data: null,
    error: new Error(message),
  };
}
