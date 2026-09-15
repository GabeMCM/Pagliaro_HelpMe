import type * as T from "../global/structure.ts";

export function actorData(user: T.Actor): T.DataBasic {
  return {
    actor_id: "id" in user ? user.id : null,
    actor_name: user.name,
    actor_contact: user.contact,
    actor_level: "level" in user ? user.level : null,
  };
}

export function userActor(user: T.User): T.UserActor {
  return {
    id: user.id,
    name: user.name,
    contact: user.contact,
    level: user.level,
  };
}
