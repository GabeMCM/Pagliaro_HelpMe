import { Hono } from "@hono/hono";
import { authenticate } from "../auth/auth.handler.ts";
import type * as T from "../global/structure.ts";
import * as Handler from "./chamado.handler.ts";

export const chamadoRoute = new Hono<T.AppEnv>();

chamadoRoute.post("/", Handler.createChamado);
chamadoRoute.get("/public/:codigo", Handler.findChamadoByCode);
chamadoRoute.post("/public/:codigo/mensagem", Handler.sendClientMessage);
chamadoRoute.post("/public/:codigo/feedback", Handler.sendFeedback);
chamadoRoute.get("/", authenticate, Handler.listChamados);
chamadoRoute.get("/search", authenticate, Handler.searchChamados);
chamadoRoute.get("/logs", authenticate, Handler.listLogs);
chamadoRoute.get("/:id", authenticate, Handler.findChamadoById);
chamadoRoute.post("/:id/mensagem", authenticate, Handler.sendUserMessage);
chamadoRoute.patch("/:id/capturar", authenticate, Handler.captureChamado);
chamadoRoute.patch("/:id/finalizar", authenticate, Handler.finishChamado);
chamadoRoute.patch("/:id/desativar", authenticate, Handler.deactivateChamado);
chamadoRoute.delete("/:id", authenticate, Handler.deleteChamado);
