import type { Context } from "@hono/hono";
import {
  fail,
  getCurrentUser,
  requestError,
  statusFromResult,
} from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";

const user_repo = new UserRepository(
  new PostgresAdapter("users"),
);

const user_service = new UserService(user_repo);

export async function updateUser(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return c.json(current_user, 403);
    }

    const id = c.req.param("id");

    if (!id) {
      return c.json(fail("Id não informado"), 400);
    }

    const user = await c.req.json<Partial<Omit<T.User, "id">>>();
    const result = await user_service.update(current_user.data, id, user);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
    }

    return c.json(
      { ...result, message: result.message },
      statusFromResult(result),
    );
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}

export async function deactivateUser(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return c.json(current_user, 403);
  }

  const id = c.req.param("id");

  if (!id) {
    return c.json(fail("Id não informado"), 400);
  }

  const result = await user_service.deactivate(current_user.data, id);

  if (result.success) {
    return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
  }

  return c.json(
    { ...result, message: result.message },
    statusFromResult(result),
  );
}
