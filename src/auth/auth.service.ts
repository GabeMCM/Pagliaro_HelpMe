import type * as T from "../global/structure.ts";
import { fail, success } from "../global/result.ts";
import { toPublicUser, UserRepository } from "../user/user.repo.ts";

export class AuthService {
  constructor(private user_repo: UserRepository) {}

  async login(data: T.LoginData): Promise<T.Result<T.AuthData>> {
    if (
      typeof data?.contact !== "string" || !data.contact.trim() ||
      typeof data.password !== "string" || !data.password.trim()
    ) {
      return fail("Informe contact e password", 400);
    }

    const user = await this.user_repo.findByContact(data.contact.trim());

    if (!user.success) {
      return user.status === 404 ? fail("Credenciais inválidas", 401) : user;
    }

    const password_hash = await hashPassword(data.password);

    if (user.data.password_hash !== password_hash || !user.data.active) {
      return fail("Credenciais inválidas", 401);
    }

    return success("Operação realizada com sucesso", {
      token: await createToken(user.data.id),
      user: toPublicUser(user.data),
    });
  }

  async getCurrentUser(
    authorization: string | undefined,
  ): Promise<T.Result<T.PublicUser>> {
    const auth_result = await userIdFromAuthorization(authorization);
    if (!auth_result.success) return auth_result;

    const user = await this.user_repo.findById(auth_result.data.user_id);
    if (!user.success) {
      return user.status === 404
        ? fail("Usuário autenticado não encontrado", 401)
        : user;
    }

    if (!user.data.active) return fail("Usuário desativado", 403);
    return success(user.message, toPublicUser(user.data));
  }
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createToken(user_id: T.Id): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    user_id,
    exp: Date.now() + 1000 * 60 * 60 * 8,
  }));
  const signature = await sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

async function userIdFromAuthorization(
  authorization: string | undefined,
): Promise<T.Result<{ user_id: T.Id }>> {
  if (!authorization?.startsWith("Bearer ")) {
    return fail("Token não informado", 401);
  }

  return await verifyToken(authorization.replace("Bearer ", ""));
}

async function verifyToken(
  token: string,
): Promise<T.Result<{ user_id: T.Id }>> {
  try {
    const parts = token.split(".");
    const [header, payload, signature] = parts;

    if (parts.length !== 3 || !header || !payload || !signature) {
      return fail("Token inválido", 401);
    }

    const expected_signature = await sign(`${header}.${payload}`);

    if (signature !== expected_signature) {
      return fail("Token inválido", 401);
    }

    const data = JSON.parse(base64UrlDecode(payload)) as T.TokenPayload;

    if (typeof data.user_id !== "string" || typeof data.exp !== "number") {
      return fail("Token inválido", 401);
    }

    if (data.exp < Date.now()) {
      return fail("Token expirado", 401);
    }

    return success("Token válido", { user_id: data.user_id });
  } catch (err) {
    console.error(err);
    return fail("Token inválido", 401);
  }
}

async function sign(data: string): Promise<string> {
  const secret = Deno.env.get("AUTH_SECRET") ?? "dev-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}
