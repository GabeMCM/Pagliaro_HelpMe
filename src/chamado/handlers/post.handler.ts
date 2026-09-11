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

export async function createChamado(c: Context) {
  try {
    const currentUser = await getCurrentUser(c);

    if (!currentUser.success) {
      return c.json(currentUser, 403);
    }

    const chamado = await c.req.json<Omit<T.Chamado, "id">>();
    const result = await chamadoService.create(currentUser.data, chamado);

    if (result.success) {
      return c.json({ ...result, message: T.ResponseMessage[201] }, 201);
    }

    return c.json({ ...result, message: result.message }, 400);
  } catch (err) {
    return c.json(requestError(err), 400);
  }
}

async function getCurrentUser(c: Context): Promise<T.Result<T.User>> {
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return fail("Usuário não informado");
  }

  return await userRepo.findById(userId);
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
