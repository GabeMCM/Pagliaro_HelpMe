import { Pool, type PoolClient } from "@db/postgres";
import { fail, success } from "./result.ts";
import * as T from "./structure.ts";

export type TableName =
  | "users"
  | "chamados"
  | "chamado_messages"
  | "chamado_logs";

export class PostgresAdapter implements T.DBAdapter {
  private pool: Pool;

  constructor(
    private table: TableName,
    database_url = Deno.env.get("DATABASE_URL") ?? "",
  ) {
    this.pool = new Pool(database_url, 10, true);
  }

  async findById(id: T.Id): Promise<T.Result<T.FindData>> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.queryObject({
          text: `${this.selectSQL()} WHERE t.id = $1`,
          args: [id],
        });
        const row = result.rows[0];

        if (!row) {
          return fail("Registro não encontrado", 404);
        }

        return success("Registro encontrado", {
          id,
          data: this.rowToData(row),
        });
      });
    } catch (err) {
      return this.databaseError(err);
    }
  }

  async findOne(
    filters: Record<string, T.QueryValue>,
  ): Promise<T.Result<T.FindData>> {
    const result = await this.findAll({ filters, limit: 1, offset: 0 });

    if (!result.success) {
      return result;
    }

    const item = result.data[0];

    if (!item) {
      return fail("Registro não encontrado", 404);
    }

    return success("Registro encontrado", item);
  }

  async findAll(
    options: T.FindOptions = {},
  ): Promise<T.Result<T.FindAllData>> {
    try {
      return await this.withClient(async (client) => {
        const filters = options.filters ?? {};
        const limit = options.limit ?? 50;
        const offset = options.offset ?? 0;
        const query = this.buildFindAllQuery(filters, limit, offset);
        const result = await client.queryObject(query);

        return success(
          "Registros encontrados",
          result.rows.map((row) => {
            const item = row as { id: T.Id };

            return {
              id: item.id,
              data: this.rowToData(row),
            };
          }),
        );
      });
    } catch (err) {
      return this.databaseError(err);
    }
  }

  async save(data: T.DataBasic): Promise<T.Result<T.VersionData>> {
    try {
      return await this.withClient(async (client) => {
        const id = crypto.randomUUID();

        if (this.table === "users") {
          await this.saveUser(client, id, data);
        } else if (this.table === "chamados") {
          await this.saveChamado(client, id, data);
        } else if (this.table === "chamado_messages") {
          await this.saveMessage(client, id, data);
        } else {
          await this.saveLog(client, id, data);
        }

        return success("Registro criado", { id, version: 1 }, 201);
      });
    } catch (err) {
      return this.databaseError(err);
    }
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.queryObject<{ id: T.Id }>({
          text: `DELETE FROM ${this.table} WHERE id = $1 RETURNING id`,
          args: [id],
        });

        if (result.rows.length === 0) {
          return fail("Registro não encontrado", 404);
        }

        return success("Registro apagado", { id });
      });
    } catch (err) {
      return this.databaseError(err);
    }
  }

  async update(
    id: T.Id,
    data: T.DataBasic,
    expected_version: number,
  ): Promise<T.Result<T.VersionData>> {
    if (this.table === "chamado_messages" || this.table === "chamado_logs") {
      return fail("Este registro não pode ser alterado", 400);
    }

    try {
      return await this.withClient(async (client) => {
        const query = this.buildUpdateQuery(id, data, expected_version);

        if (!query.success) {
          return query;
        }

        const result = await client.queryObject<{ version: number }>(
          query.data,
        );
        const row = result.rows[0];

        if (row) {
          return success("Registro atualizado", { id, version: row.version });
        }

        const found = await client.queryObject<{ id: T.Id }>({
          text: `SELECT id FROM ${this.table} WHERE id = $1`,
          args: [id],
        });

        if (found.rows.length === 0) {
          return fail("Registro não encontrado", 404);
        }

        return fail("Registro alterado por outra operação", 409);
      });
    } catch (err) {
      return this.databaseError(err);
    }
  }

  private async saveUser(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    const user = data as Omit<T.User, "id" | "version">;

    await client.queryArray({
      text: `
        INSERT INTO users (
          id, name, contact, level, active, password_hash, version
        )
        VALUES ($1, $2, $3, $4, $5, $6, 1)
      `,
      args: [
        id,
        user.name,
        user.contact,
        user.level,
        user.active,
        user.password_hash,
      ],
    });
  }

  private async saveChamado(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    await client.queryArray({
      text: `
        INSERT INTO chamados (
          id,
          codigo,
          user_resp_id,
          client_name,
          client_contact,
          status,
          active,
          details,
          created,
          updated,
          version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, 1)
      `,
      args: [
        id,
        data.codigo,
        data.user_resp_id,
        data.client_name,
        data.client_contact,
        data.status,
        data.active,
        JSON.stringify(data.details),
        this.dateValue(data.created),
        this.dateValue(data.updated),
      ],
    });
  }

  private async saveMessage(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    await client.queryArray({
      text: `
        INSERT INTO chamado_messages (
          id,
          chamado_id,
          message,
          actor_id,
          actor_name,
          actor_contact,
          actor_level,
          created
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      args: [
        id,
        data.chamado_id,
        data.message,
        data.actor_id,
        data.actor_name,
        data.actor_contact,
        data.actor_level,
        this.dateValue(data.created),
      ],
    });
  }

  private async saveLog(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    await client.queryArray({
      text: `
        INSERT INTO chamado_logs (
          id,
          chamado_id,
          action,
          message,
          actor_id,
          actor_name,
          actor_contact,
          actor_level,
          created
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      args: [
        id,
        data.chamado_id,
        data.action,
        data.message,
        data.actor_id,
        data.actor_name,
        data.actor_contact,
        data.actor_level,
        this.dateValue(data.created),
      ],
    });
  }

  private buildFindAllQuery(
    filters: Record<string, T.QueryValue>,
    limit: number,
    offset: number,
  ): { text: string; args: T.QueryValue[] } {
    const allowed_columns = this.filterColumns();
    const clauses: string[] = [];
    const args: T.QueryValue[] = [];

    for (const [field, value] of Object.entries(filters)) {
      if (!allowed_columns.includes(field)) {
        throw new Error(`Filtro ${field} não permitido para ${this.table}`);
      }

      if (value === null) {
        clauses.push(`t.${field} IS NULL`);
      } else {
        args.push(value);
        clauses.push(`t.${field} = $${args.length}`);
      }
    }

    const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
    args.push(limit);
    const limit_position = args.length;
    args.push(offset);
    const offset_position = args.length;

    return {
      text:
        `${this.selectSQL()}${where}${this.orderSQL()} LIMIT $${limit_position} OFFSET $${offset_position}`,
      args,
    };
  }

  private buildUpdateQuery(
    id: T.Id,
    data: T.DataBasic,
    expected_version: number,
  ): T.Result<{ text: string; args: unknown[] }> {
    const allowed_columns = this.updateColumns();
    const entries = Object.entries(data);

    if (entries.length === 0) {
      return fail("Nenhum campo informado para atualização", 400);
    }

    const args: unknown[] = [];
    const sets: string[] = [];

    for (const [field, value] of entries) {
      if (!allowed_columns.includes(field)) {
        return fail(`Campo ${field} não pode ser alterado`, 400);
      }

      args.push(this.databaseValue(field, value));
      const cast = field === "details" ? "::jsonb" : "";
      sets.push(`${field} = $${args.length}${cast}`);
    }

    args.push(id, expected_version);

    return success("Atualização válida", {
      text: `
        UPDATE ${this.table}
        SET ${sets.join(", ")}, version = version + 1
        WHERE id = $${args.length - 1} AND version = $${args.length}
        RETURNING version
      `,
      args,
    });
  }

  private selectSQL(): string {
    if (this.table === "users") {
      return `
        SELECT
          t.id,
          t.name,
          t.contact,
          t.level,
          t.active,
          t.password_hash,
          t.version
        FROM users t
      `;
    }

    if (this.table === "chamados") {
      return `
        SELECT
          t.id,
          t.codigo,
          t.client_name,
          t.client_contact,
          t.status,
          t.active,
          t.details,
          t.created,
          t.updated,
          t.version,
          u.id AS user_resp_id,
          u.name AS user_resp_name,
          u.contact AS user_resp_contact,
          u.level AS user_resp_level,
          u.active AS user_resp_active,
          u.version AS user_resp_version
        FROM chamados t
        LEFT JOIN users u ON u.id = t.user_resp_id
      `;
    }

    if (this.table === "chamado_messages") {
      return `
        SELECT
          t.id,
          t.chamado_id,
          t.message,
          t.actor_id,
          t.actor_name,
          t.actor_contact,
          t.actor_level,
          t.created
        FROM chamado_messages t
      `;
    }

    return `
      SELECT
        t.id,
        t.chamado_id,
        t.action,
        t.message,
        t.actor_id,
        t.actor_name,
        t.actor_contact,
        t.actor_level,
        t.created
      FROM chamado_logs t
    `;
  }

  private rowToData(row_value: unknown): T.DataBasic {
    const row = row_value as Record<string, unknown>;
    const { id: _id, ...data } = row;

    if (this.table === "chamados") {
      return {
        codigo: data.codigo,
        user_resp: data.user_resp_id
          ? {
            id: data.user_resp_id,
            name: data.user_resp_name,
            contact: data.user_resp_contact,
            level: data.user_resp_level,
            active: data.user_resp_active,
            version: data.user_resp_version,
          }
          : null,
        client: {
          name: data.client_name,
          contact: data.client_contact,
        },
        status: data.status,
        active: data.active,
        details: data.details,
        created: this.toDate(data.created),
        updated: this.toDate(data.updated),
        version: data.version,
      };
    }

    if (this.table === "chamado_messages") {
      return {
        chamado_id: data.chamado_id,
        message: data.message,
        user: this.rowActor(data),
        created: this.toDate(data.created),
      };
    }

    if (this.table === "chamado_logs") {
      return {
        chamado_id: data.chamado_id,
        action: data.action,
        message: data.message,
        user: this.rowActor(data),
        created: this.toDate(data.created),
      };
    }

    return data;
  }

  private rowActor(row: T.DataBasic): T.Actor {
    if (row.actor_id) {
      return {
        id: String(row.actor_id),
        name: String(row.actor_name),
        contact: String(row.actor_contact),
        level: row.actor_level as T.UserLevel,
      };
    }

    return {
      name: String(row.actor_name),
      contact: String(row.actor_contact),
    };
  }

  private filterColumns(): string[] {
    if (this.table === "users") {
      return ["id", "contact", "level", "active"];
    }

    if (this.table === "chamados") {
      return ["id", "codigo", "user_resp_id", "status", "active"];
    }

    return ["id", "chamado_id", "actor_id"];
  }

  private updateColumns(): string[] {
    if (this.table === "users") {
      return ["name", "contact", "level", "active", "password_hash"];
    }

    return [
      "codigo",
      "user_resp_id",
      "client_name",
      "client_contact",
      "status",
      "active",
      "details",
      "created",
      "updated",
    ];
  }

  private orderSQL(): string {
    if (this.table === "users") {
      return " ORDER BY t.name, t.id";
    }

    if (this.table === "chamados") {
      return " ORDER BY t.created DESC, t.id";
    }

    return " ORDER BY t.created, t.id";
  }

  private databaseValue(field: string, value: unknown): unknown {
    if (field === "details") {
      return JSON.stringify(value);
    }

    if (field === "created" || field === "updated") {
      return this.dateValue(value);
    }

    return value;
  }

  private dateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "string") {
      return value;
    }

    throw new Error("Data inválida");
  }

  private toDate(value: unknown): Date {
    const date = value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      throw new Error("Data inválida recebida do banco");
    }

    return date;
  }

  private async withClient<TData>(
    action: (client: PoolClient) => Promise<TData>,
  ): Promise<TData> {
    const client = await this.pool.connect();

    try {
      return await action(client);
    } finally {
      client.release();
    }
  }

  private databaseError(err: unknown): T.Failure {
    console.error(err);

    const code = this.errorCode(err);

    if (code === "23505") {
      return fail("Registro já existe", 409);
    }

    if (code === "23502" || code === "23503" || code === "23514") {
      return fail("Dados inválidos para persistência", 400);
    }

    return fail(T.ResponseMessage[500], 500);
  }

  private errorCode(err: unknown): string | null {
    if (!err || typeof err !== "object") {
      return null;
    }

    const data = err as {
      code?: unknown;
      fields?: { code?: unknown };
    };
    const code = data.code ?? data.fields?.code;

    return typeof code === "string" ? code : null;
  }
}
