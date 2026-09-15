import type * as T from "../global/structure.ts";
import { hashPassword } from "../global/auth.ts";
import { fail, success } from "../global/result.ts";
import { toPublicUser } from "./user.mapper.ts";
import { UserRepository } from "./user.repo.ts";

export class UserService {
  constructor(private user_repo: UserRepository) {}

  async create(
    current_user: T.User,
    user: T.CreateUser,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para criar usuário", 403);
    }

    if (this.isGestor(current_user) && user.level === "Dev") {
      return fail("Gestor não pode criar usuário Dev", 403);
    }

    const existing_user = await this.user_repo.findByContact(user.contact);

    if (existing_user.success) {
      return fail("Já existe um usuário com este contato", 409);
    }

    if (existing_user.status !== 404) {
      return existing_user;
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
  ): Promise<T.Result<T.PublicUser>> {
    if (
      !this.isDev(current_user) && !this.isGestor(current_user) &&
      current_user.id !== id
    ) {
      return fail("Usuário sem permissão para ver este usuário", 403);
    }

    const result = await this.user_repo.findById(id);

    if (!result.success) {
      return result;
    }

    return success(result.message, toPublicUser(result.data));
  }

  async findAll(
    current_user: T.User,
    limit = 50,
    offset = 0,
  ): Promise<T.Result<T.PublicUser[]>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para listar usuários", 403);
    }

    const result = await this.user_repo.findAll(limit, offset);

    if (!result.success) {
      return result;
    }

    return success(result.message, result.data.map(toPublicUser));
  }

  async update(
    current_user: T.User,
    id: T.Id,
    user: T.UpdateUser,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode editar usuário", 403);
    }

    const current_data = await this.user_repo.findById(id);

    if (!current_data.success) {
      return current_data;
    }

    const { password, ...update_data } = user;

    return await this.user_repo.update(
      id,
      {
        ...update_data,
        ...(password !== undefined && {
          password_hash: await hashPassword(password),
        }),
      },
      current_data.data.version,
    );
  }

  async delete(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!this.isDev(current_user)) {
      return fail("Somente Dev pode apagar usuário", 403);
    }

    return await this.user_repo.delete(id);
  }

  async deactivate(
    current_user: T.User,
    id: T.Id,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.isDev(current_user) && !this.isGestor(current_user)) {
      return fail("Usuário sem permissão para desativar usuário", 403);
    }

    const user = await this.user_repo.findById(id);

    if (!user.success) {
      return user;
    }

    return await this.user_repo.update(
      id,
      { active: false },
      user.data.version,
    );
  }

  private isDev(user: T.User): boolean {
    return user.active && user.level === "Dev";
  }

  private isGestor(user: T.User): boolean {
    return user.active && user.level === "Gestor";
  }
}
