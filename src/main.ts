import { Hono } from "@hono/hono";
import { cors } from "@hono/cors";
import { authRoute } from "./auth/auth.route.ts";
import { chamadoRoute } from "./chamado/chamado.route.ts";
import { userRoute } from "./user/user.route.ts";

const app = new Hono();

app.use(
  "*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/", (c) => c.text("Hello"));
app.route("/auth", authRoute);
app.route("/chamado", chamadoRoute);
app.route("/user", userRoute);

Deno.serve(app.fetch);
