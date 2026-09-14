import type * as T from "../global/structure.ts";
import { fail, success } from "../global/result.ts";
import { ChamadoRepository } from "./chamado.repo.ts";

export class ChamadoService {
  constructor(private chamado_repo: ChamadoRepository) {}

  async create(
    current_user: T.User,
    chamado: Omit<T.Chamado, "id">,
  ): Promise<T.Result<T.IdData>> {
    if (!current_user.active) {
      return fail("Usuário desativado");
    }

    return await this.chamado_repo.create(chamado);
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
      return fail("Usuário sem permissão para ver este chamado");
    }

    return chamado;
  }

  async findAll(current_user: T.User): Promise<T.Result<T.Chamado[]>> {
    const chamados = await this.chamado_repo.findAll();

    if (!chamados.success) {
      return chamados;
    }

    if (this.isDev(current_user) || this.isGestor(current_user)) {
      return chamados;
    }

    return success(
      chamados.message,
      chamados.data.filter((chamado) => this.canView(current_user, chamado)),
    );
  }

  async update(
    current_user: T.User,
    id: T.Id,
    chamado: Partial<Omit<T.Chamado, "id">>,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode editar chamado");
    }

    return await this.chamado_repo.update(id, chamado);
  }

  async delete(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode apagar chamado");
    }

    return await this.chamado_repo.delete(id);
  }

  async finish(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    const chamado = await this.findById(current_user, id);

    if (!chamado.success) {
      return chamado;
    }

    return await this.chamado_repo.update(id, {
      status: "FINALIZADO",
      updated: new Date(),
    });
  }

  async deactivate(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para desativar chamado");
    }

    const chamado = await this.chamado_repo.findById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (chamado.data.status === "EM ANDAMENTO") {
      return fail("Chamado em andamento não pode ser desativado");
    }

    return await this.chamado_repo.update(id, {
      active: false,
      updated: new Date(),
    });
  }

  private canView(user: T.User, chamado: T.Chamado): boolean {
    if (!user.active) {
      return false;
    }

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
