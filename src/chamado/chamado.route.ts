import { Hono } from "@hono/hono";
import { authenticate } from "../auth/auth.handler.ts";
import type * as T from "../global/structure.ts";
import * as Handler from "./chamado.handler.ts";

export const chamadoRoute = new Hono<T.AppEnv>();

chamadoRoute.post("/", Handler.createChamado);
chamadoRoute.get("/public/:codigo", Handler.findChamadoByCode);
chamadoRoute.post("/public/:codigo/mensagem", Handler.sendClientMessage);
chamadoRoute.get("/", authenticate, Handler.listChamados);
chamadoRoute.get("/:id", authenticate, Handler.findChamadoById);
chamadoRoute.post("/:id/mensagem", authenticate, Handler.sendUserMessage);
chamadoRoute.patch("/:id/capturar", authenticate, Handler.captureChamado);
chamadoRoute.patch("/:id/finalizar", authenticate, Handler.finishChamado);
