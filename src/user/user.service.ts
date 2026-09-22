import type * as T from "../global/structure.ts";
import { hashPassword } from "../auth/auth.service.ts";
import { fail } from "../global/result.ts";
import { UserRepository } from "./user.repo.ts";

export class UserService {
  constructor(private user_repo: UserRepository) {}

  async create(
    current_user: T.PublicUser,
    user: T.CreateUser,
  ): Promise<T.Result<T.VersionData>> {
    if (
      !current_user.active ||
      (current_user.level !== "Dev" && current_user.level !== "Gestor")
    ) {
      return fail("Usuário sem permissão para criar usuário", 403);
    }

    if (
      typeof user?.name !== "string" || !user.name.trim() ||
      typeof user.contact !== "string" || !user.contact.trim() ||
      typeof user.password !== "string" || !user.password.trim()
    ) {
      return fail("Informe name, contact e password", 400);
    }

    if (
      user.level !== "Dev" && user.level !== "Gestor" && user.level !== "Basic"
    ) {
      return fail("Campo level deve ser Dev, Gestor ou Basic", 400);
    }

    if (typeof user.active !== "boolean") {
      return fail("Campo active deve ser boolean", 400);
    }

    if (current_user.level === "Gestor" && user.level === "Dev") {
      return fail("Gestor não pode criar usuário Dev", 403);
    }

    const contact = user.contact.trim();
    const existing_user = await this.user_repo.findByContact(contact);

    if (existing_user.success) {
      return fail("Já existe um usuário com este contato", 409);
    }

    if (existing_user.status !== 404) {
      return existing_user;
    }

    return await this.user_repo.create({
      name: user.name.trim(),
      contact,
      level: user.level,
      active: user.active,
      password_hash: await hashPassword(user.password),
    });
  }

  async findAll(
    current_user: T.PublicUser,
  ): Promise<T.Result<T.PublicUser[]>> {
    if (!this.canManage(current_user)) {
      return fail("Usuário sem permissão para consultar usuários", 403);
    }

    const users = await this.user_repo.findAll();
    if (!users.success) return users;

    return {
      ...users,
      data: users.data.map((user) => {
        const { password_hash: _password_hash, ...public_user } = user;
        return public_user;
      }),
    };
  }

  async updateActive(
    current_user: T.PublicUser,
    id: T.Id,
    data: T.UpdateUserActive,
  ): Promise<T.Result<T.VersionData>> {
    if (!this.canManage(current_user)) {
      return fail("Usuário sem permissão para alterar usuários", 403);
    }

    if (typeof data?.active !== "boolean") {
      return fail("Campo active deve ser boolean", 400);
    }

    if (current_user.id === id && !data.active) {
      return fail("Usuário não pode desativar a própria conta", 400);
    }

    const user = await this.user_repo.findById(id);
    if (!user.success) return user;

    if (current_user.level === "Gestor" && user.data.level === "Dev") {
      return fail("Gestor não pode alterar usuário Dev", 403);
    }

    return await this.user_repo.updateActive(user.data, data.active);
  }

  async delete(
    current_user: T.PublicUser,
    id: T.Id,
  ): Promise<T.Result<T.IdData>> {
    if (!current_user.active || current_user.level !== "Dev") {
      return fail("Somente Dev pode apagar usuários", 403);
    }

    if (current_user.id === id) {
      return fail("Usuário não pode apagar a própria conta", 400);
    }

    return await this.user_repo.delete(id);
  }

  private canManage(user: T.PublicUser): boolean {
    return user.active && (user.level === "Dev" || user.level === "Gestor");
  }
}
