import { fail, success } from "../global/result.ts";
import * as T from "../global/structure.ts";
import {
  asObject,
  hasOnlyKeys,
  isNonEmptyString,
} from "../global/validation.ts";

const levels: T.UserLevel[] = ["Dev", "Gestor", "Basic"];

export function validateCreateUser(value: unknown): T.Result<T.CreateUser> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return object_result;
  }

  const data = object_result.data;

  if (
    !hasOnlyKeys(data, ["name", "contact", "level", "active", "password"])
  ) {
    return fail("A requisição possui campos não permitidos", 400);
  }

  if (!isNonEmptyString(data.name)) {
    return fail("Campo name é obrigatório", 400);
  }

  if (!isNonEmptyString(data.contact)) {
    return fail("Campo contact é obrigatório", 400);
  }

  if (!isLevel(data.level)) {
    return fail("Campo level deve ser Dev, Gestor ou Basic", 400);
  }

  if (typeof data.active !== "boolean") {
    return fail("Campo active deve ser boolean", 400);
  }

  if (!isNonEmptyString(data.password)) {
    return fail("Campo password é obrigatório", 400);
  }

  return success("Usuário válido", {
    name: data.name.trim(),
    contact: data.contact.trim(),
    level: data.level,
    active: data.active,
    password: data.password,
  });
}

export function validateUpdateUser(value: unknown): T.Result<T.UpdateUser> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return object_result;
  }

  const data = object_result.data;
  const allowed_keys = ["name", "contact", "level", "active", "password"];

  if (!hasOnlyKeys(data, allowed_keys)) {
    return fail("A requisição possui campos não permitidos", 400);
  }

  if (Object.keys(data).length === 0) {
    return fail("Nenhum campo informado para atualização", 400);
  }

  if (data.name !== undefined && !isNonEmptyString(data.name)) {
    return fail("Campo name deve ser uma string não vazia", 400);
  }

  if (data.contact !== undefined && !isNonEmptyString(data.contact)) {
    return fail("Campo contact deve ser uma string não vazia", 400);
  }

  if (data.level !== undefined && !isLevel(data.level)) {
    return fail("Campo level deve ser Dev, Gestor ou Basic", 400);
  }

  if (data.active !== undefined && typeof data.active !== "boolean") {
    return fail("Campo active deve ser boolean", 400);
  }

  if (data.password !== undefined && !isNonEmptyString(data.password)) {
    return fail("Campo password deve ser uma string não vazia", 400);
  }

  return success("Atualização válida", {
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.contact !== undefined && { contact: data.contact.trim() }),
    ...(data.level !== undefined && { level: data.level }),
    ...(data.active !== undefined && { active: data.active }),
    ...(data.password !== undefined && { password: data.password }),
  });
}

function isLevel(value: unknown): value is T.UserLevel {
  return typeof value === "string" && levels.includes(value as T.UserLevel);
}
