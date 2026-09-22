import type * as T from "../global/structure.ts";
import { fail, success } from "../global/result.ts";
import { ChamadoRepository } from "./chamado.repo.ts";

export class ChamadoService {
  constructor(private chamado_repo: ChamadoRepository) {}

  async create(
    chamado: T.CreateChamado,
  ): Promise<T.Result<T.CreatedChamadoData>> {
    if (
      typeof chamado?.client?.name !== "string" ||
      !chamado.client.name.trim() ||
      typeof chamado.client.cpf !== "string" ||
      !chamado.client.cpf.trim() ||
      typeof chamado.client.contact !== "string" ||
      !chamado.client.contact.trim() ||
      typeof chamado.message !== "string" || !chamado.message.trim()
    ) {
      return fail(
        "Informe client.name, client.cpf, client.contact e message",
        400,
      );
    }

    if (
      chamado.details !== undefined &&
      (!Array.isArray(chamado.details) ||
        !chamado.details.every((item) =>
          typeof item === "string" && item.trim()
        ))
    ) {
      return fail("Campo details deve ser uma lista de textos", 400);
    }

    const client = {
      name: chamado.client.name.trim(),
      cpf: chamado.client.cpf.replace(/\D/g, ""),
      contact: chamado.client.contact.trim(),
    };

    if (client.cpf.length !== 11) {
      return fail("CPF deve conter 11 números", 400);
    }
    const parts = crypto.getRandomValues(new Uint32Array(2));
    const codigo = [...parts].map((part) => part.toString().padStart(10, "0"))
      .join("");
    const created = new Date();
    const result = await this.chamado_repo.create({
      codigo,
      user_resp: null,
      client,
      status: "AGUARDANDO",
      active: true,
      feedback: null,
      details: chamado.details?.map((item) => item.trim()) ?? null,
      created,
      updated: created,
    });

    if (!result.success) {
      return result;
    }

    const chamado_id = result.data.id;
    const log_result = await this.chamado_repo.createLog(
      chamado_id,
      "CRIADO",
      "Chamado criado",
      client,
    );

    if (!log_result.success) {
      return log_result;
    }

    const message_result = await this.addMessage(
      chamado_id,
      chamado.message,
      client,
    );

    if (!message_result.success) {
      return message_result;
    }

    return success("Chamado criado", { codigo }, 201);
  }

  async findById(
    current_user: T.PublicUser,
    id: T.Id,
  ): Promise<T.Result<T.Chamado>> {
    const chamado = await this.chamado_repo.findById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (!this.canView(current_user, chamado.data)) {
      return fail("Usuário sem permissão para ver este chamado", 403);
    }

    return chamado;
  }

  async findByCode(codigo: string): Promise<T.Result<T.PublicChamado>> {
    const chamado = await this.chamado_repo.findByCode(codigo);

    if (!chamado.success) {
      return chamado;
    }

    if (!chamado.data.active) {
      return fail("Chamado não encontrado", 404);
    }

    const { cpf: _cpf, ...client } = chamado.data.client;
    return success(chamado.message, { ...chamado.data, client });
  }

  async findAll(
    current_user: T.PublicUser,
    limit = 50,
    offset = 0,
  ): Promise<T.Result<T.ChamadoSummary[]>> {
    if (this.canManage(current_user)) {
      return await this.chamado_repo.findAll({}, limit, offset);
    }

    return await this.chamado_repo.findAll(
      [
        { status: "AGUARDANDO", active: true },
        { user_resp_id: current_user.id, active: true },
      ],
      limit,
      offset,
    );
  }

  async search(
    current_user: T.PublicUser,
    query: string,
    limit = 50,
    offset = 0,
  ): Promise<T.Result<T.ChamadoSummary[]>> {
    if (!query.trim()) {
      return fail("Informe um texto para pesquisar", 400);
    }

    const normalized_query = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(
        query.trim(),
      )
      ? query.replace(/\D/g, "")
      : query.trim();

    if (this.canManage(current_user)) {
      return await this.chamado_repo.findAll(
        {},
        limit,
        offset,
        normalized_query,
      );
    }

    return await this.chamado_repo.findAll(
      [
        { status: "AGUARDANDO", active: true },
        { user_resp_id: current_user.id, active: true },
      ],
      limit,
      offset,
      normalized_query,
    );
  }

  async capture(
    current_user: T.PublicUser,
    id: T.Id,
  ): Promise<T.Result<T.VersionData>> {
    const chamado = await this.chamado_repo.findSummaryById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (!chamado.data.active || chamado.data.status !== "AGUARDANDO") {
      return fail("Somente chamado aguardando pode ser capturado", 400);
    }

    if (chamado.data.user_resp) {
      return fail("Chamado já possui responsável", 409);
    }

    const result = await this.chamado_repo.update(
      id,
      {
        user_resp: current_user,
        status: "EM ANDAMENTO",
        updated: new Date(),
      },
      chamado.data.version,
    );

    if (!result.success) {
      return result;
    }

    const log_result = await this.chamado_repo.createLog(
      id,
      "CAPTURADO",
      "Chamado capturado",
      current_user,
    );

    return log_result.success ? result : log_result;
  }

  async finish(
    current_user: T.PublicUser,
    id: T.Id,
  ): Promise<T.Result<T.VersionData>> {
    const chamado = await this.chamado_repo.findSummaryById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (!chamado.data.active || chamado.data.status !== "EM ANDAMENTO") {
      return fail("Somente chamado em andamento pode ser finalizado", 400);
    }

    if (
      !this.canManage(current_user) &&
      chamado.data.user_resp?.id !== current_user.id
    ) {
      return fail("Somente o responsável pode finalizar o chamado", 403);
    }

    const result = await this.chamado_repo.update(
      id,
      { status: "FINALIZADO", updated: new Date() },
      chamado.data.version,
    );

    if (!result.success) {
      return result;
    }

    const log_result = await this.chamado_repo.createLog(
      id,
      "FINALIZADO",
      "Chamado finalizado",
      current_user,
    );

    return log_result.success ? result : log_result;
  }

  async sendClientMessage(
    codigo: string,
    data: T.CreateMessage,
  ): Promise<T.Result<T.IdData>> {
    const chamado = await this.findByCode(codigo);

    if (!chamado.success) {
      return chamado;
    }

    if (chamado.data.status === "FINALIZADO") {
      return fail("Chamado finalizado não aceita mensagens", 400);
    }

    return await this.addMessage(
      chamado.data.id,
      data?.message,
      chamado.data.client,
    );
  }

  async sendUserMessage(
    current_user: T.PublicUser,
    id: T.Id,
    data: T.CreateMessage,
  ): Promise<T.Result<T.IdData>> {
    const chamado = await this.chamado_repo.findSummaryById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (!chamado.data.active || chamado.data.status === "FINALIZADO") {
      return fail("Este chamado não aceita mensagens", 400);
    }

    if (
      !this.canManage(current_user) &&
      chamado.data.user_resp?.id !== current_user.id
    ) {
      return fail("Usuário sem permissão para enviar mensagem", 403);
    }

    return await this.addMessage(id, data?.message, current_user);
  }

  async sendFeedback(
    codigo: string,
    data: T.CreateFeedback,
  ): Promise<T.Result<T.VersionData>> {
    if (!Number.isInteger(data?.note) || data.note < 0 || data.note > 5) {
      return fail("A nota deve ser um número inteiro entre 0 e 5", 400);
    }

    const chamado = await this.chamado_repo.findByCode(codigo);
    if (!chamado.success) return chamado;

    if (!chamado.data.active || chamado.data.status !== "FINALIZADO") {
      return fail("Somente chamado finalizado aceita feedback", 400);
    }

    if (chamado.data.feedback !== null) {
      return fail("Feedback já enviado", 409);
    }

    const result = await this.chamado_repo.update(
      chamado.data.id,
      { feedback: data.note, updated: new Date() },
      chamado.data.version,
    );

    if (!result.success) return result;

    const log_result = await this.chamado_repo.createLog(
      chamado.data.id,
      "FEEDBACK ENVIADO",
      `Nota ${data.note} enviada pelo cliente`,
      chamado.data.client,
    );

    return log_result.success ? result : log_result;
  }

  async findLogs(
    current_user: T.PublicUser,
    limit = 100,
    offset = 0,
  ): Promise<T.Result<T.ChamadoLog[]>> {
    if (!this.canManage(current_user)) {
      return fail("Usuário sem permissão para consultar logs", 403);
    }

    return await this.chamado_repo.findLogs(limit, offset);
  }

  async deactivate(
    current_user: T.PublicUser,
    id: T.Id,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.canManage(current_user)) {
      return fail("Usuário sem permissão para desativar chamado", 403);
    }

    const chamado = await this.chamado_repo.findSummaryById(id);
    if (!chamado.success) return chamado;

    if (!chamado.data.active) {
      return fail("Chamado já está desativado", 400);
    }

    const result = await this.chamado_repo.update(
      id,
      { active: false, updated: new Date() },
      chamado.data.version,
    );

    if (!result.success) return result;

    const log_result = await this.chamado_repo.createLog(
      id,
      "DESATIVADO",
      "Chamado desativado",
      current_user,
    );

    return log_result.success ? result : log_result;
  }

  async delete(
    current_user: T.PublicUser,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!current_user.active || current_user.level !== "Dev") {
      return fail("Somente Dev pode apagar chamado", 403);
    }

    const chamado = await this.chamado_repo.findSummaryById(id);
    if (!chamado.success) return chamado;

    const result = await this.chamado_repo.delete(id);
    if (!result.success) return result;

    const log_result = await this.chamado_repo.createLog(
      id,
      "APAGADO",
      `Chamado ${chamado.data.codigo} apagado`,
      current_user,
    );

    return log_result.success ? result : log_result;
  }

  private async addMessage(
    chamado_id: T.Id,
    message: string,
    user: T.Actor,
  ): Promise<T.Result<T.IdData>> {
    if (typeof message !== "string" || !message.trim()) {
      return fail("Campo message é obrigatório", 400);
    }

    const result = await this.chamado_repo.createMessage(
      chamado_id,
      message.trim(),
      user,
    );

    if (!result.success) {
      return result;
    }

    const log_result = await this.chamado_repo.createLog(
      chamado_id,
      "MENSAGEM ENVIADA",
      "Mensagem enviada",
      user,
    );

    return log_result.success ? result : log_result;
  }

  private canView(user: T.PublicUser, chamado: T.Chamado): boolean {
    if (this.canManage(user)) {
      return true;
    }

    return chamado.active &&
      (chamado.status === "AGUARDANDO" || chamado.user_resp?.id === user.id);
  }

  private canManage(user: T.PublicUser): boolean {
    return user.active && (user.level === "Dev" || user.level === "Gestor");
  }
}
