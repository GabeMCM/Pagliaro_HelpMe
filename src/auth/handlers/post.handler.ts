import type { Context } from "@hono/hono";
import { requestError } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { AuthService } from "../auth.service.ts";

const auth_service = new AuthService(
  new UserRepository(new PostgresAdapter("users")),
);

export async function login(c: Context) {
  try {
    const data = await c.req.json<T.LoginData>();
    const result = await auth_service.login(data);

    if (result.success) {
      return c.json(result, 200);
    }

    return c.json(result, 403);
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}
