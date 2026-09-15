import type * as T from "../global/structure.ts";
import { fail, success } from "../global/result.ts";
import { toPublicUser } from "../user/user.mapper.ts";
import { ChamadoLogRepository } from "./chamado-log.repo.ts";
import { userActor } from "./chamado.mapper.ts";
import { ChamadoMessageRepository } from "./chamado-message.repo.ts";
import { ChamadoRepository } from "./chamado.repo.ts";

export class ChamadoService {
  constructor(
    private chamado_repo: ChamadoRepository,
    private message_repo: ChamadoMessageRepository,
    private log_repo: ChamadoLogRepository,
  ) {}

  async create(
    current_user: T.User,
    chamado: T.CreateChamado,
  ): Promise<T.Result<T.VersionData>> {
    const result = await this.chamado_repo.create(chamado);

    if (!result.success) {
      return result;
    }

    const chamado_id = result.data.id;
    const log_result = await this.log_repo.create(
      chamado_id,
      "CRIADO",
      "Chamado criado",
      userActor(current_user),
    );

    if (!log_result.success) {
      return log_result;
    }

    for (const message of chamado.messages) {
      const message_result = await this.addMessage(
        chamado_id,
        message.message,
        chamado.client,
      );

      if (!message_result.success) {
        return message_result;
      }
    }

    return result;
  }

  async findById(
    current_user: T.User,
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

  async findByCode(codigo: string): Promise<T.Result<T.Chamado>> {
    const chamado = await this.chamado_repo.findByCode(codigo);

    if (!chamado.success) {
      return chamado;
    }

    if (!chamado.data.active) {
      return fail("Chamado não encontrado", 404);
    }

    return chamado;
  }

  async findAll(
    current_user: T.User,
    limit = 50,
    offset = 0,
  ): Promise<T.Result<T.ChamadoSummary[]>> {
    if (this.isDev(current_user) || this.isGestor(current_user)) {
      return await this.chamado_repo.findAll({}, limit, offset);
    }

    const waiting = await this.chamado_repo.findAll(
      { status: "AGUARDANDO", active: true },
      limit,
      offset,
    );

    if (!waiting.success) {
      return waiting;
    }

    const assigned = await this.chamado_repo.findAll(
      { user_resp_id: current_user.id, active: true },
      limit,
      offset,
    );

    if (!assigned.success) {
      return assigned;
    }

    const chamados = new Map<T.Id, T.ChamadoSummary>();

    for (const chamado of [...waiting.data, ...assigned.data]) {
      chamados.set(chamado.id, chamado);
    }

    return success("Chamados encontrados", [...chamados.values()]);
  }

  async update(
    current_user: T.User,
    id: T.Id,
    chamado: T.UpdateChamado,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode editar chamado", 403);
    }

    const current_data = await this.chamado_repo.findSummaryById(id);

    if (!current_data.success) {
      return current_data;
    }

    const result = await this.chamado_repo.update(
      id,
      chamado,
      current_data.data.version,
    );

    if (!result.success) {
      return result;
    }

    const log_result = await this.log_repo.create(
      id,
      "ATUALIZADO",
      "Chamado atualizado",
      userActor(current_user),
    );

    return log_result.success ? result : log_result;
  }

  async delete(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode apagar chamado", 403);
    }

    const chamado = await this.chamado_repo.findSummaryById(id);

    if (!chamado.success) {
      return chamado;
    }

    const result = await this.chamado_repo.delete(id);

    if (!result.success) {
      return result;
    }

    const log_result = await this.log_repo.create(
      id,
      "APAGADO",
      `Chamado ${chamado.data.codigo} apagado`,
      userActor(current_user),
    );

    return log_result.success ? result : log_result;
  }

  async capture(
    current_user: T.User,
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
        user_resp: toPublicUser(current_user),
        status: "EM ANDAMENTO",
        updated: new Date(),
      },
      chamado.data.version,
    );

    if (!result.success) {
      return result;
    }

    const log_result = await this.log_repo.create(
      id,
      "CAPTURADO",
      "Chamado capturado",
      userActor(current_user),
    );

    return log_result.success ? result : log_result;
  }

  async finish(
    current_user: T.User,
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
      !this.isDev(current_user) && !this.isGestor(current_user) &&
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

    const log_result = await this.log_repo.create(
      id,
      "FINALIZADO",
      "Chamado finalizado",
      userActor(current_user),
    );

    return log_result.success ? result : log_result;
  }

  async deactivate(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para desativar chamado", 403);
    }

    const chamado = await this.chamado_repo.findSummaryById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (chamado.data.status === "EM ANDAMENTO") {
      return fail("Chamado em andamento não pode ser desativado", 400);
    }

    const result = await this.chamado_repo.update(
      id,
      { active: false, updated: new Date() },
      chamado.data.version,
    );

    if (!result.success) {
      return result;
    }

    const log_result = await this.log_repo.create(
      id,
      "DESATIVADO",
      "Chamado desativado",
      userActor(current_user),
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
      data.message,
      chamado.data.client,
    );
  }

  async sendUserMessage(
    current_user: T.User,
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
      !this.isDev(current_user) && !this.isGestor(current_user) &&
      chamado.data.user_resp?.id !== current_user.id
    ) {
      return fail("Usuário sem permissão para enviar mensagem", 403);
    }

    return await this.addMessage(id, data.message, userActor(current_user));
  }

  async findLogs(
    current_user: T.User,
    id: T.Id,
    limit = 100,
    offset = 0,
  ): Promise<T.Result<T.ChamadoLog[]>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para visualizar logs", 403);
    }

    return await this.log_repo.findByChamadoId(id, limit, offset);
  }

  private async addMessage(
    chamado_id: T.Id,
    message: string,
    user: T.Actor,
  ): Promise<T.Result<T.IdData>> {
    const result = await this.message_repo.create(chamado_id, message, user);

    if (!result.success) {
      return result;
    }

    const log_result = await this.log_repo.create(
      chamado_id,
      "MENSAGEM ENVIADA",
      "Mensagem enviada",
      user,
    );

    return log_result.success ? result : log_result;
  }

  private canView(user: T.User, chamado: T.Chamado): boolean {
    if (this.isDev(user) || this.isGestor(user)) {
      return true;
    }

    return chamado.active &&
      (chamado.status === "AGUARDANDO" || chamado.user_resp?.id === user.id);
  }

  private isDev(user: T.User): boolean {
    return user.active && user.level === "Dev";
  }

  private isGestor(user: T.User): boolean {
    return user.active && user.level === "Gestor";
  }
}
