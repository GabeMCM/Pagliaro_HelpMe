import { Hono } from "@hono/hono";
import { POST } from "./auth.handler.ts";

export const authRoute = new Hono();

authRoute.post("/login", POST.login);
