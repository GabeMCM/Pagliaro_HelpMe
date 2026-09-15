import type { Context } from "@hono/hono";
import { fail, getCurrentUser, respond } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { asPagination } from "../../global/validation.ts";
import { UserRepository } from "../user.repo.ts";
import { UserService } from "../user.service.ts";

const user_repo = new UserRepository(
  new PostgresAdapter("users"),
);

const user_service = new UserService(user_repo);

export async function listUsers(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const pagination = asPagination(
    c.req.query("limit"),
    c.req.query("offset"),
  );

  if (!pagination.success) {
    return respond(c, pagination);
  }

  return respond(
    c,
    await user_service.findAll(
      current_user.data,
      pagination.data.limit,
      pagination.data.offset,
    ),
  );
}

export async function findUserById(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await user_service.findById(current_user.data, id));
}
