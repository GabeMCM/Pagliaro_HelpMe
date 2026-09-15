import type { Context } from "@hono/hono";
import {
  fail,
  getCurrentUser,
  requestError,
  respond,
} from "../../global/http.ts";
import { PostgresAdapter } from "../../global/postgres.adapter.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { ChamadoLogRepository } from "../chamado-log.repo.ts";
import { ChamadoMessageRepository } from "../chamado-message.repo.ts";
import { ChamadoRepository } from "../chamado.repo.ts";
import { ChamadoService } from "../chamado.service.ts";
import { validateUpdateChamado } from "../chamado.validation.ts";

const message_repo = new ChamadoMessageRepository(
  new PostgresAdapter("chamado_messages"),
);
const chamado_service = new ChamadoService(
  new ChamadoRepository(new PostgresAdapter("chamados"), message_repo),
  message_repo,
  new ChamadoLogRepository(new PostgresAdapter("chamado_logs")),
);
const user_repo = new UserRepository(new PostgresAdapter("users"));

export async function updateChamado(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return respond(c, current_user);
    }

    const id = c.req.param("id");

    if (!id) {
      return respond(c, fail("Id não informado", 400));
    }

    const chamado = validateUpdateChamado(await c.req.json<unknown>());

    if (!chamado.success) {
      return respond(c, chamado);
    }

    return respond(
      c,
      await chamado_service.update(current_user.data, id, chamado.data),
    );
  } catch (err) {
    return respond(c, requestError(err));
  }
}

export async function captureChamado(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await chamado_service.capture(current_user.data, id));
}

export async function finishChamado(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await chamado_service.finish(current_user.data, id));
}

export async function deactivateChamado(c: Context) {
  const current_user = await getCurrentUser(c, user_repo);

  if (!current_user.success) {
    return respond(c, current_user);
  }

  const id = c.req.param("id");

  if (!id) {
    return respond(c, fail("Id não informado", 400));
  }

  return respond(c, await chamado_service.deactivate(current_user.data, id));
}
