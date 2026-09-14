import { Hono } from "@hono/hono";
import { DELETE, GET, PATCH, POST } from "./user.handler.ts";

export const userRoute = new Hono();

userRoute.get("/", GET.listUsers);
userRoute.post("/", POST.createUser);
userRoute.get("/:id", GET.findUserById);
userRoute.delete("/:id", DELETE.deleteUser);
userRoute.patch("/:id", PATCH.updateUser);
userRoute.patch("/:id/desativar", PATCH.deactivateUser);
