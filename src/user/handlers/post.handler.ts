import type { Context } from "@hono/hono";
import { getCurrentUser, requestError, respond } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";
import { validateCreateUser } from "../user.validation.ts";

const user_repo = new UserRepository(
  new PostgresAdapter("users"),
);

const user_service = new UserService(user_repo);

export async function createUser(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return respond(c, current_user);
    }

    const user = validateCreateUser(await c.req.json<unknown>());

    if (!user.success) {
      return respond(c, user);
    }

    return respond(c, await user_service.create(current_user.data, user.data));
  } catch (err) {
    return respond(c, requestError(err));
  }
}
