import type * as T from "../global/structure.ts";

export class UserRepository {
  constructor(private db: T.DBAdapter) {}

  async create(user: Omit<T.User, "id">): Promise<T.Result<T.IdData>> {
    return await this.db.save(user as T.DataBasic);
  }

  async findById(id: T.Id): Promise<T.Result<T.User>> {
    const result = await this.db.findById(id);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      message: result.message,
      data: {
        id: result.data.id,
        ...result.data.data,
      } as T.User,
      error: null,
    };
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    return await this.db.delete(id);
  }

  async update(
    id: T.Id,
    user: Partial<Omit<T.User, "id">>,
  ): Promise<T.Result<T.IdData>> {
    return await this.db.update(id, user as T.DataBasic);
  }
}
