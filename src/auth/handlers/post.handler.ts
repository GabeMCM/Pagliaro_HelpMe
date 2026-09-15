import type { Context } from "@hono/hono";
import { requestError, respond } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { AuthService } from "../auth.service.ts";
import { validateLogin } from "../auth.validation.ts";

const auth_service = new AuthService(
  new UserRepository(new PostgresAdapter("users")),
);

export async function login(c: Context) {
  try {
    const data = validateLogin(await c.req.json<unknown>());

    if (!data.success) {
      return respond(c, data);
    }

    return respond(c, await auth_service.login(data.data));
  } catch (err) {
    return respond(c, requestError(err));
  }
}
