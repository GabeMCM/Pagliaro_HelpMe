import { Hono } from "@hono/hono";
import { authenticate } from "../auth/auth.handler.ts";
import type * as T from "../global/structure.ts";
import * as Handler from "./user.handler.ts";

export const userRoute = new Hono<T.AppEnv>();

userRoute.post("/", authenticate, Handler.createUser);
