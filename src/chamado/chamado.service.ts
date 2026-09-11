import type * as T from "../global/structure.ts";
import { ChamadoRepository } from "./chamado.repo.ts";

export class ChamadoService {
  constructor(private chamadoRepo: ChamadoRepository) {}

  async create(
    currentUser: T.User,
    chamado: Omit<T.Chamado, "id">,
  ): Promise<T.Result<T.IdData>> {
    if (!currentUser.active) {
      return this.fail("Usuário desativado");
    }

    return await this.chamadoRepo.create(chamado);
  }

  async findById(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.Chamado>> {
    const chamado = await this.chamadoRepo.findById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (!this.canView(currentUser, chamado.data)) {
      return this.fail("Usuário sem permissão para ver este chamado");
    }

    return chamado;
  }

  async update(
    currentUser: T.User,
    id: T.Id,
    chamado: Partial<Omit<T.Chamado, "id">>,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser)) {
      return this.fail("Somente Dev pode editar chamado");
    }

    return await this.chamadoRepo.update(id, chamado);
  }

  async delete(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser)) {
      return this.fail("Somente Dev pode apagar chamado");
    }

    return await this.chamadoRepo.delete(id);
  }

  async finish(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    const chamado = await this.findById(currentUser, id);

    if (!chamado.success) {
      return chamado;
    }

    return await this.chamadoRepo.update(id, {
      status: "FINALIZADO",
      updated: new Date(),
    });
  }

  async deactivate(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser) && !this.isGestor(currentUser)) {
      return this.fail("Usuário sem permissão para desativar chamado");
    }

    const chamado = await this.chamadoRepo.findById(id);

    if (!chamado.success) {
      return chamado;
    }

    if (chamado.data.status === "EM ANDAMENTO") {
      return this.fail("Chamado em andamento não pode ser desativado");
    }

    return await this.chamadoRepo.update(id, {
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
      (chamado.status === "AGUARDANDO" || chamado.userResp?.id === user.id);
  }

  private isDev(user: T.User): boolean {
    return user.active && user.level === "Dev";
  }

  private isGestor(user: T.User): boolean {
    return user.active && user.level === "Gestor";
  }

  private fail(message: string): T.Failure {
    return {
      success: false,
      message,
      data: null,
      error: new Error(message),
    };
  }
}
