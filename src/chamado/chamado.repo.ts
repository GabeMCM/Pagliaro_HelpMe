import type * as T from "../global/structure.ts";
import { success } from "../global/result.ts";

export class ChamadoRepository {
  constructor(
    private db: T.DBAdapter,
    private message_db: T.DBAdapter,
    private log_db: T.DBAdapter,
  ) {}

  async create(
    chamado: T.NewChamado,
  ): Promise<T.Result<T.VersionData>> {
    return await this.db.save({
      codigo: chamado.codigo,
      user_resp_id: chamado.user_resp?.id ?? null,
      client_name: chamado.client.name,
      client_cpf: chamado.client.cpf,
      client_contact: chamado.client.contact,
      status: chamado.status,
      active: chamado.active,
      feedback: chamado.feedback,
      details: chamado.details,
      created: chamado.created,
      updated: chamado.updated,
    });
  }

  async findById(id: T.Id): Promise<T.Result<T.Chamado>> {
    const chamado = await this.findSummaryById(id);

    if (!chamado.success) {
      return chamado;
    }

    return await this.withMessages(chamado.data);
  }

  async findByCode(codigo: string): Promise<T.Result<T.Chamado>> {
    const result = await this.db.findOne({ codigo });

    if (!result.success) {
      return result;
    }

    return await this.withMessages(this.toSummary(result.data));
  }

  async findSummaryById(id: T.Id): Promise<T.Result<T.ChamadoSummary>> {
    const result = await this.db.findById(id);

    if (!result.success) {
      return result;
    }

    return success(result.message, this.toSummary(result.data));
  }

  async findAll(
    filters: T.FindFilters = {},
    limit = 50,
    offset = 0,
    search?: string,
  ): Promise<T.Result<T.ChamadoSummary[]>> {
    const result = await this.db.findAll({ filters, limit, offset, search });

    if (!result.success) {
      return result;
    }

    return success(
      result.message,
      result.data.map((item) => this.toSummary(item)),
    );
  }

  async update(
    id: T.Id,
    chamado: T.UpdateChamado,
    expected_version: number,
  ): Promise<T.Result<T.VersionData>> {
    const data: T.DataBasic = {};

    if (chamado.status !== undefined) data.status = chamado.status;
    if (chamado.active !== undefined) data.active = chamado.active;
    if (chamado.feedback !== undefined) data.feedback = chamado.feedback;
    if (chamado.updated !== undefined) data.updated = chamado.updated;

    if (chamado.user_resp !== undefined) {
      data.user_resp_id = chamado.user_resp?.id ?? null;
    }

    return await this.db.update(id, data, expected_version);
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    return await this.db.delete(id);
  }

  async findLogs(
    limit = 100,
    offset = 0,
  ): Promise<T.Result<T.ChamadoLog[]>> {
    const result = await this.log_db.findAll({ limit, offset });

    if (!result.success) {
      return result;
    }

    return success(
      result.message,
      result.data.map((item) => ({
        id: item.id,
        ...item.data,
      } as T.ChamadoLog)),
    );
  }

  async createMessage(
    chamado_id: T.Id,
    message: string,
    user: T.Actor,
  ): Promise<T.Result<T.IdData>> {
    return await this.message_db.save({
      chamado_id,
      message,
      ...this.actorData(user),
      created: new Date(),
    });
  }

  async createLog(
    chamado_id: T.Id,
    action: T.LogAction,
    message: string,
    user: T.Actor,
  ): Promise<T.Result<T.IdData>> {
    return await this.log_db.save({
      chamado_id,
      action,
      message,
      ...this.actorData(user),
      created: new Date(),
    });
  }

  private actorData(user: T.Actor): T.DataBasic {
    return {
      actor_id: "id" in user ? user.id : null,
      actor_name: user.name,
      actor_contact: user.contact,
      actor_level: "level" in user ? user.level : null,
    };
  }

  private async withMessages(
    chamado: T.ChamadoSummary,
  ): Promise<T.Result<T.Chamado>> {
    const messages = await this.message_db.findAll({
      filters: { chamado_id: chamado.id },
      limit: null,
    });

    if (!messages.success) {
      return messages;
    }

    return success("Chamado encontrado", {
      ...chamado,
      messages: messages.data.map((item) => ({
        id: item.id,
        ...item.data,
      } as T.ChamadoMessage)),
    });
  }

  private toSummary(item: T.FindData): T.ChamadoSummary {
    return {
      id: item.id,
      ...item.data,
    } as T.ChamadoSummary;
  }
}
