import type { Context } from "@hono/hono";
import { getCurrentUser, requestError } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { ChamadoRepository } from "../chamado.repo.ts";
import { ChamadoService } from "../chamado.service.ts";

const chamado_service = new ChamadoService(
  new ChamadoRepository(new PostgresAdapter("chamados")),
);

const user_repo = new UserRepository(
  new PostgresAdapter("users"),
);

export async function createChamado(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return c.json(current_user, 403);
    }

    const chamado = await c.req.json<Omit<T.Chamado, "id">>();
    const result = await chamado_service.create(current_user.data, chamado);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[201] }, 201);
    }

    return c.json({ ...result, message: result.message }, 400);
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}
