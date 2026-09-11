import type { Context } from "@hono/hono";
import { SQLiteAdapter } from "../../global/sqlite.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { ChamadoRepository } from "../chamado.repo.ts";
import { ChamadoService } from "../chamado.service.ts";

const chamado_service = new ChamadoService(
  new ChamadoRepository(new SQLiteAdapter("local.db", "chamados")),
);

const user_repo = new UserRepository(
  new SQLiteAdapter("local.db", "users"),
);

export async function updateChamado(c: Context) {
  try {
    const current_user = await getCurrentUser(c);

    if (!current_user.success) {
      return c.json(current_user, 403);
    }

    const id = c.req.param("id");

    if (!id) {
      return c.json(fail("Id não informado"), 400);
    }

    const chamado = await c.req.json<Partial<Omit<T.Chamado, "id">>>();
    const result = await chamado_service.update(current_user.data, id, chamado);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
    }

    return c.json({ ...result, message: result.message }, statusFromResult(result));
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}

export async function finishChamado(c: Context) {
  const current_user = await getCurrentUser(c);

  if (!current_user.success) {
    return c.json(current_user, 403);
  }

  const id = c.req.param("id");

  if (!id) {
    return c.json(fail("Id não informado"), 400);
  }

  const result = await chamado_service.finish(current_user.data, id);

  if (result.success) {
    return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
  }

  return c.json({ ...result, message: result.message }, statusFromResult(result));
}

export async function deactivateChamado(c: Context) {
  const current_user = await getCurrentUser(c);

  if (!current_user.success) {
    return c.json(current_user, 403);
  }

  const id = c.req.param("id");

  if (!id) {
    return c.json(fail("Id não informado"), 400);
  }

  const result = await chamado_service.deactivate(current_user.data, id);

  if (result.success) {
    return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
  }

  return c.json({ ...result, message: result.message }, statusFromResult(result));
}

async function getCurrentUser(c: Context): Promise<T.Result<T.User>> {
  const user_id = c.req.header("x-user-id");

  if (!user_id) {
    return fail("Usuário não informado");
  }

  return await user_repo.findById(user_id);
}

function statusFromResult(result: T.Failure): keyof typeof T.ResponseMessage {
  if (result.message === "id not found") {
    return 404;
  }

  if (result.message === "Chamado em andamento não pode ser desativado") {
    return 400;
  }

  return 403;
}

function requestError(err: unknown): T.Failure {
  return {
    success: false,
    message: T.ResponseMessage[400],
    data: null,
    error: err instanceof Error ? err : new Error(String(err)),
  };
}

function fail(message: string): T.Failure {
  return {
    success: false,
    message,
    data: null,
    error: new Error(message),
  };
}
