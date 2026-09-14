import type * as T from "../global/structure.ts";
import { hashPassword } from "../global/auth.ts";
import { fail } from "../global/result.ts";
import { UserRepository } from "./user.repo.ts";

export class UserService {
  constructor(private user_repo: UserRepository) {}

  async create(
    current_user: T.User,
    user: T.CreateUser,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para criar usuário");
    }

    return await this.user_repo.create({
      name: user.name,
      contact: user.contact,
      level: user.level,
      active: user.active,
      password_hash: await hashPassword(user.password),
    });
  }

  async findById(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.User>> {
    if (
      !this.isDev(current_user) && !this.isGestor(current_user) &&
      current_user.id !== id
    ) {
      return fail("Usuário sem permissão para ver este usuário");
    }

    return await this.user_repo.findById(id);
  }

  async findAll(current_user: T.User): Promise<T.Result<T.User[]>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para listar usuários");
    }

    return await this.user_repo.findAll();
  }

  async update(
    current_user: T.User,
    id: T.Id,
    user: Partial<Omit<T.User, "id">>,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode editar usuário");
    }

    return await this.user_repo.update(id, user);
  }

  async delete(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode apagar usuário");
    }

    return await this.user_repo.delete(id);
  }

  async deactivate(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para desativar usuário");
    }

    return await this.user_repo.update(id, { active: false });
  }

  private isDev(user: T.User): boolean {
    return user.active && user.level === "Dev";
  }

  private isGestor(user: T.User): boolean {
    return user.active && user.level === "Gestor";
  }
}
