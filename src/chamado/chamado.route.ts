import { Hono } from "@hono/hono";
import { DELETE, GET, PATCH, POST } from "./chamado.handler.ts";

export const chamadoRoute = new Hono();

chamadoRoute.get("/", GET.listChamados);
chamadoRoute.post("/", POST.createChamado);
chamadoRoute.get("/public/:codigo", GET.findChamadoByCode);
chamadoRoute.post("/public/:codigo/mensagem", POST.sendClientMessage);
chamadoRoute.get("/:id", GET.findChamadoById);
chamadoRoute.get("/:id/logs", GET.listChamadoLogs);
chamadoRoute.post("/:id/mensagem", POST.sendUserMessage);
chamadoRoute.delete("/:id", DELETE.deleteChamado);
chamadoRoute.patch("/:id", PATCH.updateChamado);
chamadoRoute.patch("/:id/capturar", PATCH.captureChamado);
chamadoRoute.patch("/:id/finalizar", PATCH.finishChamado);
chamadoRoute.patch("/:id/desativar", PATCH.deactivateChamado);
