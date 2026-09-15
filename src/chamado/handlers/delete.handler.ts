import type { Context } from "@hono/hono";
import { fail, getCurrentUser, respond } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { ChamadoLogRepository } from "../chamado-log.repo.ts";
import { ChamadoMessageRepository } from "../chamado-message.repo.ts";
import { ChamadoRepository } from "../chamado.repo.ts";
import { ChamadoService } from "../chamado.service.ts";

const message_repo = new ChamadoMessageRepository(
  new PostgresAdapter("chamado_messages"),
);
const chamado_service = new ChamadoService(
  new ChamadoRepository(new PostgresAdapter("chamados"), message_repo),
  message_repo,
  new ChamadoLogRepository(new PostgresAdapter("chamado_logs")),
);
const user_repo = new UserRepository(new PostgresAdapter("users"));

export async function deleteChamado(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await chamado_service.delete(current_user.data, id));
}
