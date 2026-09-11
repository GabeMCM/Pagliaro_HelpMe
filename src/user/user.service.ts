import type * as T from "../global/structure.ts";
import { UserRepository } from "./user.repo.ts";

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async create(
    currentUser: T.User,
    user: Omit<T.User, "id">,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser) && !this.isGestor(currentUser)) {
      return this.fail("Usuário sem permissão para criar usuário");
    }

    return await this.userRepo.create(user);
  }

  async findById(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.User>> {
    if (!this.isDev(currentUser) && !this.isGestor(currentUser) && currentUser.id !== id) {
      return this.fail("Usuário sem permissão para ver este usuário");
    }

    return await this.userRepo.findById(id);
  }

  async update(
    currentUser: T.User,
    id: T.Id,
    user: Partial<Omit<T.User, "id">>,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser)) {
      return this.fail("Somente Dev pode editar usuário");
    }

    return await this.userRepo.update(id, user);
  }

  async delete(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser)) {
      return this.fail("Somente Dev pode apagar usuário");
    }

    return await this.userRepo.delete(id);
  }

  async deactivate(
    currentUser: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(currentUser) && !this.isGestor(currentUser)) {
      return this.fail("Usuário sem permissão para desativar usuário");
    }

    return await this.userRepo.update(id, { active: false });
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
