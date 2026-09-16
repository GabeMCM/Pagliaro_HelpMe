import type { Context, Next } from "@hono/hono";
import { PostgresAdapter } from "../adapters/postgres.adapter.ts";
import { respond } from "../global/result.ts";
import type * as T from "../global/structure.ts";
import { UserRepository } from "../user/user.repo.ts";
import { AuthService } from "./auth.service.ts";

const auth_service = new AuthService(
  new UserRepository(new PostgresAdapter("users")),
);

export async function login(c: Context) {
  const data = await c.req.json<T.LoginData>();
  return respond(c, await auth_service.login(data));
}

export async function authenticate(c: Context<T.AppEnv>, next: Next) {
  const result = await auth_service.getCurrentUser(
    c.req.header("authorization"),
  );

  if (!result.success) {
    return respond(c, result);
  }

  c.set("current_user", result.data);
  await next();
}
