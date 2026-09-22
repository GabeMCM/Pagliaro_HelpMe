import type { Context } from "@hono/hono";
import { PostgresAdapter } from "../adapters/postgres.adapter.ts";
import { fail, respond } from "../global/result.ts";
import type * as T from "../global/structure.ts";
import { ChamadoRepository } from "./chamado.repo.ts";
import { ChamadoService } from "./chamado.service.ts";

const chamado_service = new ChamadoService(
  new ChamadoRepository(
    new PostgresAdapter("chamados"),
    new PostgresAdapter("chamado_messages"),
    new PostgresAdapter("chamado_logs"),
  ),
);

export async function createChamado(c: Context<T.AppEnv>) {
  const data = await c.req.json<T.CreateChamado>();
  return respond(c, await chamado_service.create(data));
}

export async function listChamados(c: Context<T.AppEnv>) {
  const limit = Number(c.req.query("limit") ?? 50);
  const offset = Number(c.req.query("offset") ?? 0);

  if (
    !Number.isInteger(limit) || limit < 1 || limit > 100 ||
    !Number.isInteger(offset) || offset < 0
  ) {
    return respond(
      c,
      fail("Informe limit entre 1 e 100 e offset a partir de 0", 400),
    );
  }

  return respond(
    c,
    await chamado_service.findAll(c.get("current_user"), limit, offset),
  );
}

export async function searchChamados(c: Context<T.AppEnv>) {
  const limit = Number(c.req.query("limit") ?? 50);
  const offset = Number(c.req.query("offset") ?? 0);

  if (
    !Number.isInteger(limit) || limit < 1 || limit > 100 ||
    !Number.isInteger(offset) || offset < 0
  ) {
    return respond(
      c,
      fail("Informe limit entre 1 e 100 e offset a partir de 0", 400),
    );
  }

  return respond(
    c,
    await chamado_service.search(
      c.get("current_user"),
      c.req.query("q") ?? "",
      limit,
      offset,
    ),
  );
}

export async function findChamadoById(c: Context<T.AppEnv>) {
  return respond(
    c,
    await chamado_service.findById(
      c.get("current_user"),
      c.req.param("id") ?? "",
    ),
  );
}

export async function findChamadoByCode(c: Context<T.AppEnv>) {
  return respond(
    c,
    await chamado_service.findByCode(c.req.param("codigo") ?? ""),
  );
}

export async function sendClientMessage(c: Context<T.AppEnv>) {
  const data = await c.req.json<T.CreateMessage>();
  return respond(
    c,
    await chamado_service.sendClientMessage(c.req.param("codigo") ?? "", data),
  );
}

export async function sendFeedback(c: Context<T.AppEnv>) {
  const data = await c.req.json<T.CreateFeedback>();
  return respond(
    c,
    await chamado_service.sendFeedback(c.req.param("codigo") ?? "", data),
  );
}

export async function sendUserMessage(c: Context<T.AppEnv>) {
  const data = await c.req.json<T.CreateMessage>();
  return respond(
    c,
    await chamado_service.sendUserMessage(
      c.get("current_user"),
      c.req.param("id") ?? "",
      data,
    ),
  );
}

export async function captureChamado(c: Context<T.AppEnv>) {
  return respond(
    c,
    await chamado_service.capture(
      c.get("current_user"),
      c.req.param("id") ?? "",
    ),
  );
}

export async function finishChamado(c: Context<T.AppEnv>) {
  return respond(
    c,
    await chamado_service.finish(
      c.get("current_user"),
      c.req.param("id") ?? "",
    ),
  );
}

export async function listLogs(c: Context<T.AppEnv>) {
  const limit = Number(c.req.query("limit") ?? 100);
  const offset = Number(c.req.query("offset") ?? 0);

  if (
    !Number.isInteger(limit) || limit < 1 || limit > 200 ||
    !Number.isInteger(offset) || offset < 0
  ) {
    return respond(
      c,
      fail("Informe limit entre 1 e 200 e offset a partir de 0", 400),
    );
  }

  return respond(
    c,
    await chamado_service.findLogs(c.get("current_user"), limit, offset),
  );
}

export async function deactivateChamado(c: Context<T.AppEnv>) {
  return respond(
    c,
    await chamado_service.deactivate(
      c.get("current_user"),
      c.req.param("id") ?? "",
    ),
  );
}

export async function deleteChamado(c: Context<T.AppEnv>) {
  return respond(
    c,
    await chamado_service.delete(
      c.get("current_user"),
      c.req.param("id") ?? "",
    ),
  );
}
