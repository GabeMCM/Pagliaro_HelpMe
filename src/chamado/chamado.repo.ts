import type * as T from "../global/structure.ts";
import { success } from "../global/result.ts";
import { ChamadoMessageRepository } from "./chamado-message.repo.ts";

export class ChamadoRepository {
  constructor(
    private db: T.DBAdapter,
    private message_repo: ChamadoMessageRepository,
  ) {}

  async create(
    chamado: T.CreateChamado,
  ): Promise<T.Result<T.VersionData>> {
    return await this.db.save({
      codigo: chamado.codigo,
      user_resp_id: chamado.user_resp?.id ?? null,
      client_name: chamado.client.name,
      client_contact: chamado.client.contact,
      status: chamado.status,
      active: chamado.active,
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
    filters: Record<string, T.QueryValue> = {},
    limit = 50,
    offset = 0,
  ): Promise<T.Result<T.ChamadoSummary[]>> {
    const result = await this.db.findAll({ filters, limit, offset });

    if (!result.success) {
      return result;
    }

    return success(
      result.message,
      result.data.map((item) => this.toSummary(item)),
    );
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    return await this.db.delete(id);
  }

  async update(
    id: T.Id,
    chamado: T.UpdateChamado,
    expected_version: number,
  ): Promise<T.Result<T.VersionData>> {
    const data: T.DataBasic = {};

    if (chamado.codigo !== undefined) data.codigo = chamado.codigo;
    if (chamado.status !== undefined) data.status = chamado.status;
    if (chamado.active !== undefined) data.active = chamado.active;
    if (chamado.details !== undefined) data.details = chamado.details;
    if (chamado.created !== undefined) data.created = chamado.created;
    if (chamado.updated !== undefined) data.updated = chamado.updated;

    if (chamado.user_resp !== undefined) {
      data.user_resp_id = chamado.user_resp?.id ?? null;
    }

    if (chamado.client !== undefined) {
      data.client_name = chamado.client.name;
      data.client_contact = chamado.client.contact;
    }

    return await this.db.update(id, data, expected_version);
  }

  private async withMessages(
    chamado: T.ChamadoSummary,
  ): Promise<T.Result<T.Chamado>> {
    const messages = await this.message_repo.findByChamadoId(chamado.id);

    if (!messages.success) {
      return messages;
    }

    return success("Chamado encontrado", {
      ...chamado,
      messages: messages.data,
    });
  }

  private toSummary(item: T.FindData): T.ChamadoSummary {
    return {
      id: item.id,
      ...item.data,
    } as T.ChamadoSummary;
  }
}
