import type { Context } from "@hono/hono";
import { SQLiteAdapter } from "../../global/sqlite.adapter.ts";
import * as T from "../../global/structure.ts";
import { UserRepository } from "../../user/user.repo.ts";
import { ChamadoRepository } from "../chamado.repo.ts";
import { ChamadoService } from "../chamado.service.ts";

const chamadoService = new ChamadoService(
  new ChamadoRepository(new SQLiteAdapter("local.db", "chamados")),
);

const userRepo = new UserRepository(
  new SQLiteAdapter("local.db", "users"),
);

export async function updateChamado(c: Context) {
  try {
    const currentUser = await getCurrentUser(c);

    if (!currentUser.success) {
      return c.json(currentUser, 403);
    }

    const id = c.req.param("id");
    const chamado = await c.req.json<Partial<Omit<T.Chamado, "id">>>();
    const result = await chamadoService.update(currentUser.data, id, chamado);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
    }

    return c.json({ ...result, message: result.message }, statusFromResult(result));
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}

export async function finishChamado(c: Context) {
  const currentUser = await getCurrentUser(c);

  if (!currentUser.success) {
    return c.json(currentUser, 403);
  }

  const id = c.req.param("id");
  const result = await chamadoService.finish(currentUser.data, id);

  if (result.success) {
    return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
  }

  return c.json({ ...result, message: result.message }, statusFromResult(result));
}

export async function deactivateChamado(c: Context) {
  const currentUser = await getCurrentUser(c);

  if (!currentUser.success) {
    return c.json(currentUser, 403);
  }

  const id = c.req.param("id");
  const result = await chamadoService.deactivate(currentUser.data, id);

  if (result.success) {
    return c.json({ ...result, message: T.ResponseMessage[200] }, 200);
  }

  return c.json({ ...result, message: result.message }, statusFromResult(result));
}

async function getCurrentUser(c: Context): Promise<T.Result<T.User>> {
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return fail("Usuário não informado");
  }

  return await userRepo.findById(userId);
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
