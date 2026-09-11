import type { Context } from "@hono/hono";
import { SQLiteAdapter } from "../../global/sqlite.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";

const userRepo = new UserRepository(
  new SQLiteAdapter("local.db", "users"),
);

const userService = new UserService(userRepo);

export async function createUser(c: Context) {
  try {
    const currentUser = await getCurrentUser(c);

    if (!currentUser.success) {
      return c.json(currentUser, 403);
    }

    const user = await c.req.json<Omit<T.User, "id">>();
    const result = await userService.create(currentUser.data, user);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[201] }, 201);
    }

    return c.json({ ...result, message: result.message }, 403);
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}

async function getCurrentUser(c: Context): Promise<T.Result<T.User>> {
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return fail("Usuário não informado");
  }

  return await userRepo.findById(userId);
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
