import type * as T from "../global/structure.ts";
import { success } from "../global/result.ts";

export class UserRepository {
  constructor(private db: T.DBAdapter) {}

  async create(
    user: Omit<T.User, "id" | "version">,
  ): Promise<T.Result<T.VersionData>> {
    return await this.db.save(user as T.DataBasic);
  }

  async findById(id: T.Id): Promise<T.Result<T.User>> {
    const result = await this.db.findById(id);

    if (!result.success) {
      return result;
    }

    return success(result.message, {
      id: result.data.id,
      ...result.data.data,
    } as T.User);
  }

  async findByContact(contact: string): Promise<T.Result<T.User>> {
    const result = await this.db.findOne({ contact });

    if (!result.success) {
      return result;
    }

    return success(result.message, {
      id: result.data.id,
      ...result.data.data,
    } as T.User);
  }
}

export function toPublicUser(user: T.User): T.PublicUser {
  const { password_hash: _password_hash, ...public_user } = user;
  return public_user;
}
