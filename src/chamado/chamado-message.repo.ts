import type * as T from "../global/structure.ts";
import { success } from "../global/result.ts";
import { actorData } from "./chamado.mapper.ts";

export class ChamadoMessageRepository {
  constructor(private db: T.DBAdapter) {}

  async create(
    chamado_id: T.Id,
    message: string,
    user: T.Actor,
  ): Promise<T.Result<T.IdData>> {
    return await this.db.save({
      chamado_id,
      message,
      ...actorData(user),
      created: new Date(),
    });
  }

  async findByChamadoId(
    chamado_id: T.Id,
    limit = 100,
    offset = 0,
  ): Promise<T.Result<T.ChamadoMessage[]>> {
    const result = await this.db.findAll({
      filters: { chamado_id },
      limit,
      offset,
    });

    if (!result.success) {
      return result;
    }

    return success(
      result.message,
      result.data.map((item) => ({
        id: item.id,
        ...item.data,
      } as T.ChamadoMessage)),
    );
  }
}
