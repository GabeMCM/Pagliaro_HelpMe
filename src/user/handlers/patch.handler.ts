import type { Context } from "@hono/hono";
import {
  fail,
  getCurrentUser,
  requestError,
  respond,
} from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";
import { validateUpdateUser } from "../user.validation.ts";

const user_repo = new UserRepository(
  new PostgresAdapter("users"),
);

const user_service = new UserService(user_repo);

export async function updateUser(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return respond(c, current_user);
    }

    const id = c.req.param("id");

    if (!id) {
      return respond(c, fail("Id não informado", 400));
    }

    const user = validateUpdateUser(await c.req.json<unknown>());

    if (!user.success) {
      return respond(c, user);
    }

    return respond(
      c,
      await user_service.update(current_user.data, id, user.data),
    );
  } catch (err) {
    return respond(c, requestError(err));
  }
}

export async function deactivateUser(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await user_service.deactivate(current_user.data, id));
}
