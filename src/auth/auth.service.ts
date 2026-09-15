import { createToken, hashPassword } from "../global/auth.ts";
import { fail, success } from "../global/result.ts";
import * as T from "../global/structure.ts";
import { toPublicUser } from "../user/user.mapper.ts";
import { UserRepository } from "../user/user.repo.ts";

export class AuthService {
  constructor(private user_repo: UserRepository) {}

  async login(data: T.LoginData): Promise<T.Result<T.AuthData>> {
    const user = await this.user_repo.findByContact(data.contact);

    if (!user.success) {
      if (user.status === 404) {
        return fail("Credenciais inválidas", 401);
      }

      return user;
    }

    const password_hash = await hashPassword(data.password);

    if (user.data.password_hash !== password_hash || !user.data.active) {
      return fail("Credenciais inválidas", 401);
    }

    return success(T.ResponseMessage[200], {
      token: await createToken(user.data.id),
      user: toPublicUser(user.data),
    });
  }
}
