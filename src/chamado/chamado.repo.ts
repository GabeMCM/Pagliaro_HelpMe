import type * as T from "../global/structure.ts";
import { success } from "../global/result.ts";

export class ChamadoRepository {
  constructor(private db: T.DBAdapter) {}

  async create(chamado: Omit<T.Chamado, "id">): Promise<T.Result<T.IdData>> {
    return await this.db.save(chamado as T.DataBasic);
  }

  async findById(id: T.Id): Promise<T.Result<T.Chamado>> {
    const result = await this.db.findById(id);

    if (!result.success) {
      return result;
    }

    return success(result.message, {
      id: result.data.id,
      ...result.data.data,
    } as T.Chamado);
  }

  async findAll(): Promise<T.Result<T.Chamado[]>> {
    const result = await this.db.findAll();

    if (!result.success) {
      return result;
    }

    return success(
      result.message,
      result.data.map((item) => ({
        id: item.id,
        ...item.data,
      } as T.Chamado)),
    );
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    return await this.db.delete(id);
  }

  async update(
    id: T.Id,
    chamado: Partial<Omit<T.Chamado, "id">>,
  ): Promise<T.Result<T.IdData>> {
    return await this.db.update(id, chamado as T.DataBasic);
  }
}
