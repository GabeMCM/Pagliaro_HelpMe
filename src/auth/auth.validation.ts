import { fail, success } from "../global/result.ts";
import * as T from "../global/structure.ts";
import {
  asObject,
  hasOnlyKeys,
  isNonEmptyString,
} from "../global/validation.ts";

export function validateLogin(value: unknown): T.Result<T.LoginData> {
  const object_result = asObject(value);

  if (!object_result.success) {
    return object_result;
  }

  const data = object_result.data;

  if (!hasOnlyKeys(data, ["contact", "password"])) {
    return fail("A requisição possui campos não permitidos", 400);
  }

  if (!isNonEmptyString(data.contact)) {
    return fail("Campo contact é obrigatório", 400);
  }

  if (!isNonEmptyString(data.password)) {
    return fail("Campo password é obrigatório", 400);
  }

  return success("Login válido", {
    contact: data.contact.trim(),
    password: data.password,
  });
}
