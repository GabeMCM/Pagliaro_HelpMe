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

  async findAll(
    limit = 50,
    offset = 0,
  ): Promise<T.Result<T.User[]>> {
    const result = await this.db.findAll({ limit, offset });

    if (!result.success) {
      return result;
    }

    return success(
      result.message,
      result.data.map((item) => ({
        id: item.id,
        ...item.data,
      } as T.User)),
    );
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    return await this.db.delete(id);
  }

  async update(
    id: T.Id,
    user: Partial<Omit<T.User, "id" | "version">>,
    expected_version: number,
  ): Promise<T.Result<T.VersionData>> {
    return await this.db.update(
      id,
      user as T.DataBasic,
      expected_version,
    );
  }
}
