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

export async function deleteChamado(c: Context) {
  const currentUser = await getCurrentUser(c);

  if (!currentUser.success) {
    return c.json(currentUser, 403);
  }

  const id = c.req.param("id");
  const result = await chamadoService.delete(currentUser.data, id);

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

  return 403;
}

function fail(message: string): T.Failure {
  return {
    success: false,
    message,
    data: null,
    error: new Error(message),
  };
}
