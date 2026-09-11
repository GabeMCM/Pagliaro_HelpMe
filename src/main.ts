import { Hono } from "@hono/hono";
import { chamadoRoute } from "./chamado/chamado.route.ts";
import { userRoute } from "./user/user.route.ts";

const app = new Hono();

app.get("/", (c) => c.text("Hello"));
app.route("/chamado", chamadoRoute);
app.route("/user", userRoute);

Deno.serve(app.fetch);
