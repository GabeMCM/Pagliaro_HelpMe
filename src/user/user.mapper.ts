import type * as T from "../global/structure.ts";

export function toPublicUser(user: T.User): T.PublicUser {
  const { password_hash: _password_hash, ...public_user } = user;

  return public_user;
}
