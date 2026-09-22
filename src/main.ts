import { Hono } from "@hono/hono";
import { cors } from "@hono/cors";
import { serveStatic } from "@hono/hono/deno";
import { runMigrations } from "./adapters/migrations.ts";
import { pool } from "./adapters/postgres.adapter.ts";
import { authRoute } from "./auth/auth.route.ts";
import { chamadoRoute } from "./chamado/chamado.route.ts";
import { fail, requestError, respond } from "./global/result.ts";
import type * as T from "./global/structure.ts";
import { userRoute } from "./user/user.route.ts";

const app = new Hono<T.AppEnv>();

app.use(
  "*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.onError((err, c) => respond(c, requestError(err)));
app.notFound((c) => respond(c, fail("Rota não encontrada", 404)));
app.route("/auth", authRoute);
app.route("/chamado", chamadoRoute);
app.route("/user", userRoute);
app.get("/", serveStatic({ path: "./frontend/index.html" }));
app.get("/styles.css", serveStatic({ path: "./frontend/styles.css" }));
app.get("/app.js", serveStatic({ path: "./frontend/app.js" }));

await runMigrations();

const server = Deno.serve(
  { port: Number(Deno.env.get("PORT") ?? 8000) },
  app.fetch,
);

Deno.addSignalListener("SIGTERM", () => {
  void server.shutdown();
});
Deno.addSignalListener("SIGINT", () => {
  void server.shutdown();
});
await server.finished;
await pool.end();
