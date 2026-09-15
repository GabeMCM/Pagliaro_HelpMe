import { fail, success } from "../global/result.ts";
import * as T from "../global/structure.ts";
import {
  asDate,
  asObject,
  hasOnlyKeys,
  isNonEmptyString,
} from "../global/validation.ts";

const statuses: T.Status[] = ["EM ANDAMENTO", "AGUARDANDO", "FINALIZADO"];

export function validateCreateChamado(
  value: unknown,
): T.Result<T.CreateChamado> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return object_result;
  }

  const data = object_result.data;
  const allowed_keys = [
    "codigo",
    "user_resp",
    "client",
    "status",
    "active",
    "details",
    "messages",
    "created",
    "updated",
  ];

  if (!hasOnlyKeys(data, allowed_keys)) {
    return fail("A requisição possui campos não permitidos", 400);
  }

  if (!isNonEmptyString(data.codigo)) {
    return fail("Campo codigo é obrigatório", 400);
  }

  const client_result = validateClient(data.client);

  if (!client_result.success) {
    return client_result;
  }

  const user_result = validatePublicUserOrNull(data.user_resp);

  if (!user_result.success) {
    return user_result;
  }

  if (!isStatus(data.status)) {
    return fail("Campo status possui valor inválido", 400);
  }

  if (typeof data.active !== "boolean") {
    return fail("Campo active deve ser boolean", 400);
  }

  const details_result = validateDetails(data.details);

  if (!details_result.success) {
    return details_result;
  }

  if (!Array.isArray(data.messages)) {
    return fail("Campo messages deve ser uma lista", 400);
  }

  const messages: T.CreateMessage[] = [];

  for (const message of data.messages) {
    const message_result = validateMessage(message);

    if (!message_result.success) {
      return message_result;
    }

    messages.push(message_result.data);
  }

  const created_result = asDate(data.created, "created");

  if (!created_result.success) {
    return created_result;
  }

  const updated_result = asDate(data.updated, "updated");

  if (!updated_result.success) {
    return updated_result;
  }

  return success("Chamado válido", {
    codigo: data.codigo.trim(),
    user_resp: user_result.data,
    client: client_result.data,
    status: data.status,
    active: data.active,
    details: details_result.data,
    messages,
    created: created_result.data,
    updated: updated_result.data,
  });
}

export function validateUpdateChamado(
  value: unknown,
): T.Result<T.UpdateChamado> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return object_result;
  }

  const data = object_result.data;
  const allowed_keys = [
    "codigo",
    "user_resp",
    "client",
    "status",
    "active",
    "details",
    "created",
    "updated",
  ];

  if (!hasOnlyKeys(data, allowed_keys)) {
    return fail("A requisição possui campos não permitidos", 400);
  }

  if (Object.keys(data).length === 0) {
    return fail("Nenhum campo informado para atualização", 400);
  }

  const result: T.UpdateChamado = {};

  if (data.codigo !== undefined) {
    if (!isNonEmptyString(data.codigo)) {
      return fail("Campo codigo deve ser uma string não vazia", 400);
    }
    result.codigo = data.codigo.trim();
  }

  if (data.user_resp !== undefined) {
    const user_result = validatePublicUserOrNull(data.user_resp);
    if (!user_result.success) return user_result;
    result.user_resp = user_result.data;
  }

  if (data.client !== undefined) {
    const client_result = validateClient(data.client);
    if (!client_result.success) return client_result;
    result.client = client_result.data;
  }

  if (data.status !== undefined) {
    if (!isStatus(data.status)) {
      return fail("Campo status possui valor inválido", 400);
    }
    result.status = data.status;
  }

  if (data.active !== undefined) {
    if (typeof data.active !== "boolean") {
      return fail("Campo active deve ser boolean", 400);
    }
    result.active = data.active;
  }

  if (data.details !== undefined) {
    const details_result = validateDetails(data.details);
    if (!details_result.success) return details_result;
    result.details = details_result.data;
  }

  if (data.created !== undefined) {
    const date_result = asDate(data.created, "created");
    if (!date_result.success) return date_result;
    result.created = date_result.data;
  }

  if (data.updated !== undefined) {
    const date_result = asDate(data.updated, "updated");
    if (!date_result.success) return date_result;
    result.updated = date_result.data;
  }

  return success("Atualização válida", result);
}

export function validateMessage(value: unknown): T.Result<T.CreateMessage> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return object_result;
  }

  if (!hasOnlyKeys(object_result.data, ["message"])) {
    return fail("A mensagem possui campos não permitidos", 400);
  }

  if (!isNonEmptyString(object_result.data.message)) {
    return fail("Campo message é obrigatório", 400);
  }

  return success("Mensagem válida", {
    message: object_result.data.message.trim(),
  });
}

function validateClient(value: unknown): T.Result<T.ClientInfo> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return fail("Campo client deve ser um objeto", 400);
  }

  const data = object_result.data;

  if (!hasOnlyKeys(data, ["name", "contact"])) {
    return fail("Campo client possui campos não permitidos", 400);
  }

  if (!isNonEmptyString(data.name) || !isNonEmptyString(data.contact)) {
    return fail("Cliente deve possuir name e contact", 400);
  }

  return success("Cliente válido", {
    name: data.name.trim(),
    contact: data.contact.trim(),
  });
}

function validatePublicUserOrNull(
  value: unknown,
): T.Result<T.PublicUser | null> {
  if (value === null) {
    return success("Responsável válido", null);
  }

  const object_result = asObject(value);

  if (!object_result.success) {
    return fail("Campo user_resp deve ser usuário ou null", 400);
  }

  const data = object_result.data;

  if (
    !hasOnlyKeys(data, ["id", "name", "contact", "level", "active", "version"])
  ) {
    return fail("Campo user_resp possui campos não permitidos", 400);
  }

  if (
    !isNonEmptyString(data.id) ||
    !isNonEmptyString(data.name) ||
    !isNonEmptyString(data.contact) ||
    !isLevel(data.level) ||
    typeof data.active !== "boolean" ||
    !Number.isInteger(data.version) ||
    Number(data.version) < 1
  ) {
    return fail("Campo user_resp possui dados inválidos", 400);
  }

  return success("Responsável válido", {
    id: data.id,
    name: data.name,
    contact: data.contact,
    level: data.level,
    active: data.active,
    version: Number(data.version),
  });
}

function validateDetails(value: unknown): T.Result<string[] | null> {
  if (value === null) {
    return success("Detalhes válidos", null);
  }

  if (
    !Array.isArray(value) ||
    !value.every((item) => isNonEmptyString(item))
  ) {
    return fail("Campo details deve ser uma lista de strings", 400);
  }

  return success("Detalhes válidos", value.map((item) => item.trim()));
}

function isStatus(value: unknown): value is T.Status {
  return typeof value === "string" && statuses.includes(value as T.Status);
}

function isLevel(value: unknown): value is T.UserLevel {
  return value === "Dev" || value === "Gestor" || value === "Basic";
}
