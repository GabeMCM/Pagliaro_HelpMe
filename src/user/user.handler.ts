import type { Context } from "@hono/hono";
import { PostgresAdapter } from "../adapters/postgres.adapter.ts";
import { respond } from "../global/result.ts";
import type * as T from "../global/structure.ts";
import { UserRepository } from "./user.repo.ts";
import { UserService } from "./user.service.ts";

const user_service = new UserService(
  new UserRepository(new PostgresAdapter("users")),
);

export async function createUser(c: Context<T.AppEnv>) {
  const data = await c.req.json<T.CreateUser>();
  return respond(c, await user_service.create(c.get("current_user"), data));
}

export async function listUsers(c: Context<T.AppEnv>) {
  return respond(c, await user_service.findAll(c.get("current_user")));
}

export async function updateUserActive(c: Context<T.AppEnv>) {
  const data = await c.req.json<T.UpdateUserActive>();
  return respond(
    c,
    await user_service.updateActive(
      c.get("current_user"),
      c.req.param("id") ?? "",
      data,
    ),
  );
}

export async function deleteUser(c: Context<T.AppEnv>) {
  return respond(
    c,
    await user_service.delete(
      c.get("current_user"),
      c.req.param("id") ?? "",
    ),
  );
}
