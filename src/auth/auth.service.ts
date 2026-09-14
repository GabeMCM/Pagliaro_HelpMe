import { createToken, hashPassword } from "../global/auth.ts";
import { fail, success } from "../global/result.ts";
import * as T from "../global/structure.ts";
import { UserRepository } from "../user/user.repo.ts";

export class AuthService {
  constructor(private user_repo: UserRepository) {}

  async login(data: T.LoginData): Promise<T.Result<T.AuthData>> {
    const users = await this.user_repo.findAll();

    if (!users.success) {
      return users;
    }

    const password_hash = await hashPassword(data.password);
    const user = users.data.find((item) =>
      item.contact === data.contact &&
      item.password_hash === password_hash &&
      item.active
    );

    if (!user) {
      return fail("Credenciais inválidas");
    }

    return success(T.ResponseMessage[200], {
      token: await createToken(user.id),
      user: publicUser(user),
    });
  }
}

function publicUser(user: T.User): T.PublicUser {
  const { password_hash: _password_hash, ...data } = user;

  return data;
}
