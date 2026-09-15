import type { Context } from "@hono/hono";
import { fail, getCurrentUser, respond } from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { asPagination } from "../../global/validation.ts";
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

export async function listChamados(c: Context) {
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
    await chamado_service.findAll(
      current_user.data,
      pagination.data.limit,
      pagination.data.offset,
    ),
  );
}

export async function findChamadoById(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await chamado_service.findById(current_user.data, id));
}

export async function findChamadoByCode(c: Context) {
  const codigo = c.req.param("codigo");

  if (!codigo) {
    return respond(c, fail("Código não informado", 400));
  }

  return respond(c, await chamado_service.findByCode(codigo));
}

export async function listChamadoLogs(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
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
    await chamado_service.findLogs(
      current_user.data,
      id,
      pagination.data.limit,
      pagination.data.offset,
    ),
  );
}
