import type { Context } from "@hono/hono";
import { getCurrentUser, requestError } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";

const user_repo = new UserRepository(
  new PostgresAdapter("users"),
);

const user_service = new UserService(user_repo);

export async function createUser(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return c.json(current_user, 403);
    }

    const user = await c.req.json<T.CreateUser>();
    const result = await user_service.create(current_user.data, user);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[201] }, 201);
    }

    return c.json({ ...result, message: result.message }, 403);
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}
