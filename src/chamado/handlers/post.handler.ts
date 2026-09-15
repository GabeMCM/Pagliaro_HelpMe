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
import {
  validateCreateChamado,
  validateMessage,
} from "../chamado.validation.ts";

const message_repo = new ChamadoMessageRepository(
  new PostgresAdapter("chamado_messages"),
);
const chamado_service = new ChamadoService(
  new ChamadoRepository(new PostgresAdapter("chamados"), message_repo),
  message_repo,
  new ChamadoLogRepository(new PostgresAdapter("chamado_logs")),
);
const user_repo = new UserRepository(new PostgresAdapter("users"));

export async function createChamado(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return respond(c, current_user);
    }

    const chamado = validateCreateChamado(await c.req.json<unknown>());

    if (!chamado.success) {
      return respond(c, chamado);
    }

    return respond(
      c,
      await chamado_service.create(current_user.data, chamado.data),
    );
  } catch (err) {
    return respond(c, requestError(err));
  }
}

export async function sendClientMessage(c: Context) {
  try {
    const codigo = c.req.param("codigo");

    if (!codigo) {
      return respond(c, fail("Código não informado", 400));
    }

    const message = validateMessage(await c.req.json<unknown>());

    if (!message.success) {
      return respond(c, message);
    }

    return respond(
      c,
      await chamado_service.sendClientMessage(codigo, message.data),
    );
  } catch (err) {
    return respond(c, requestError(err));
  }
}

export async function sendUserMessage(c: Context) {
  try {
    const current_user = await getCurrentUser(c, user_repo);

    if (!current_user.success) {
      return respond(c, current_user);
    }

    const id = c.req.param("id");

    if (!id) {
      return respond(c, fail("Id não informado", 400));
    }

    const message = validateMessage(await c.req.json<unknown>());

    if (!message.success) {
      return respond(c, message);
    }

    return respond(
      c,
      await chamado_service.sendUserMessage(
        current_user.data,
        id,
        message.data,
      ),
    );
  } catch (err) {
    return respond(c, requestError(err));
  }
}
