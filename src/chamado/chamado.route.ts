import { Hono } from "@hono/hono";
import { DELETE, GET, PATCH, POST } from "./chamado.handler.ts";

export const chamadoRoute = new Hono();

chamadoRoute.get("/", GET.listChamados);
chamadoRoute.post("/", POST.createChamado);
chamadoRoute.get("/:id", GET.findChamadoById);
chamadoRoute.delete("/:id", DELETE.deleteChamado);
chamadoRoute.patch("/:id", PATCH.updateChamado);
chamadoRoute.patch("/:id/finalizar", PATCH.finishChamado);
chamadoRoute.patch("/:id/desativar", PATCH.deactivateChamado);
