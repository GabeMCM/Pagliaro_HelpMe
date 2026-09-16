import { Hono } from "@hono/hono";
import * as Handler from "./auth.handler.ts";

export const authRoute = new Hono();

authRoute.post("/login", Handler.login);
