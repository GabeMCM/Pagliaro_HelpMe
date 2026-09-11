import type * as T from "../global/structure.ts";
import { UserRepository } from "./user.repo.ts";

export class UserService {
  constructor(private user_repo: UserRepository) {}

  async create(
    current_user: T.User,
    user: Omit<T.User, "id">,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return this.fail("Usuário sem permissão para criar usuário");
    }

    return await this.user_repo.create(user);
  }

  async findById(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.User>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user) && current_user.id !== id) {
      return this.fail("Usuário sem permissão para ver este usuário");
    }

    return await this.user_repo.findById(id);
  }

  async update(
    current_user: T.User,
    id: T.Id,
    user: Partial<Omit<T.User, "id">>,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return this.fail("Somente Dev pode editar usuário");
    }

    return await this.user_repo.update(id, user);
  }

  async delete(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return this.fail("Somente Dev pode apagar usuário");
    }

    return await this.user_repo.delete(id);
  }

  async deactivate(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return this.fail("Usuário sem permissão para desativar usuário");
    }

    return await this.user_repo.update(id, { active: false });
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
