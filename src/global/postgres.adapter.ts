import { Pool, type PoolClient } from "@db/postgres";
import { fail, success } from "./result.ts";
import type * as T from "./structure.ts";

type ChamadoRow = Omit<T.Chamado, "created" | "updated"> & {
  created: Date | string;
  updated: Date | string;
};

export class PostgresAdapter implements T.DBAdapter {
  private pool: Pool;
  private table: string;
  private ready = false;

  constructor(
    table = "records",
    database_url = Deno.env.get("DATABASE_URL") ?? "",
  ) {
    this.table = this.safeName(table);
    this.pool = new Pool(database_url, 10, true);
  }

  async findById(id: T.Id): Promise<T.Result<T.FindData>> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.queryObject({
          text: this.findByIdSQL(),
          args: [id],
        });

        const row = result.rows[0];

        if (!row) {
          return fail("id not found", `id ${id} not found`);
        }

        return success("record found", {
          id,
          data: this.rowToData(row),
        });
      });
    } catch (err) {
      return this.error("findById error", err);
    }
  }

  async findAll(): Promise<T.Result<T.FindAllData>> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.queryObject({
          text: this.findAllSQL(),
        });

        return success(
          "records found",
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
      return this.error("findAll error", err);
    }
  }

  async save(data: T.DataBasic): Promise<T.Result<T.IdData>> {
    try {
      return await this.withClient(async (client) => {
        const id = crypto.randomUUID();

        if (this.table === "users") {
          await this.saveUser(client, id, data);
        }

        if (this.table === "chamados") {
          await this.saveChamado(client, id, data);
        }

        return success("record created", { id });
      });
    } catch (err) {
      return this.error("save error", err);
    }
  }

  async delete(id: T.Id): Promise<T.Result<T.IdData>> {
    try {
      const found = await this.findById(id);

      if (!found.success) {
        return found;
      }

      return await this.withClient(async (client) => {
        await client.queryArray({
          text: `DELETE FROM ${this.table} WHERE id = $1`,
          args: [id],
        });

        return success("record deleted", { id });
      });
    } catch (err) {
      return this.error("delete error", err);
    }
  }

  async update(id: T.Id, data: T.DataBasic): Promise<T.Result<T.IdData>> {
    try {
      const found = await this.findById(id);

      if (!found.success) {
        return found;
      }

      return await this.withClient(async (client) => {
        const next = { ...found.data.data, ...data };

        if (this.table === "users") {
          await this.updateUser(client, id, next);
        }

        if (this.table === "chamados") {
          await this.updateChamado(client, id, next);
        }

        return success("record updated", { id });
      });
    } catch (err) {
      return this.error("update error", err);
    }
  }

  private async saveUser(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    const user = data as Omit<T.User, "id">;

    await client.queryArray({
      text: `
        INSERT INTO users (id, name, contact, level, active, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
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
    const chamado = data as Omit<T.Chamado, "id">;

    await client.queryArray({
      text: `
        INSERT INTO chamados (
          id,
          codigo,
          user_resp_id,
          user_resp,
          client,
          status,
          active,
          details,
          messages,
          created,
          updated
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8::jsonb, $9::jsonb, $10, $11)
      `,
      args: [
        id,
        chamado.codigo,
        chamado.user_resp?.id ?? null,
        JSON.stringify(chamado.user_resp),
        JSON.stringify(chamado.client),
        chamado.status,
        chamado.active,
        JSON.stringify(chamado.details),
        JSON.stringify(chamado.messages),
        this.dateValue(chamado.created),
        this.dateValue(chamado.updated),
      ],
    });
  }

  private async updateUser(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    const user = data as T.User;

    await client.queryArray({
      text: `
        UPDATE users
        SET name = $1, contact = $2, level = $3, active = $4, password_hash = $5
        WHERE id = $6
      `,
      args: [
        user.name,
        user.contact,
        user.level,
        user.active,
        user.password_hash,
        id,
      ],
    });
  }

  private async updateChamado(
    client: PoolClient,
    id: T.Id,
    data: T.DataBasic,
  ): Promise<void> {
    const chamado = data as T.Chamado;

    await client.queryArray({
      text: `
        UPDATE chamados
        SET
          codigo = $1,
          user_resp_id = $2,
          user_resp = $3::jsonb,
          client = $4::jsonb,
          status = $5,
          active = $6,
          details = $7::jsonb,
          messages = $8::jsonb,
          created = $9,
          updated = $10
        WHERE id = $11
      `,
      args: [
        chamado.codigo,
        chamado.user_resp?.id ?? null,
        JSON.stringify(chamado.user_resp),
        JSON.stringify(chamado.client),
        chamado.status,
        chamado.active,
        JSON.stringify(chamado.details),
        JSON.stringify(chamado.messages),
        this.dateValue(chamado.created),
        this.dateValue(chamado.updated),
        id,
      ],
    });
  }

  private rowToData(row: unknown): T.DataBasic {
    if (this.table === "users") {
      return this.userRowToData(row as T.User);
    }

    if (this.table === "chamados") {
      return this.chamadoRowToData(row as ChamadoRow);
    }

    return {};
  }

  private userRowToData(row: T.User): T.DataBasic {
    const { id: _id, ...data } = row;

    return data;
  }

  private chamadoRowToData(row: ChamadoRow): T.DataBasic {
    const { id: _id, created, updated, ...data } = row;

    return {
      ...data,
      created: new Date(created),
      updated: new Date(updated),
    };
  }

  private findByIdSQL(): string {
    if (this.table === "chamados") {
      return `
        SELECT
          id,
          codigo,
          user_resp,
          client,
          status,
          active,
          details,
          messages,
          created,
          updated
        FROM chamados
        WHERE id = $1
      `;
    }

    return `SELECT * FROM ${this.table} WHERE id = $1`;
  }

  private findAllSQL(): string {
    if (this.table === "chamados") {
      return `
        SELECT
          id,
          codigo,
          user_resp,
          client,
          status,
          active,
          details,
          messages,
          created,
          updated
        FROM chamados
      `;
    }

    return `SELECT * FROM ${this.table}`;
  }

  private async withClient<TData>(
    action: (client: PoolClient) => Promise<TData>,
  ): Promise<TData> {
    const client = await this.pool.connect();

    try {
      await this.createTable(client);
      return await action(client);
    } finally {
      client.release();
    }
  }

  private async createTable(client: PoolClient): Promise<void> {
    if (this.ready) {
      return;
    }

    if (this.table === "users") {
      await client.queryArray(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          contact TEXT NOT NULL,
          level TEXT NOT NULL,
          active BOOLEAN NOT NULL,
          password_hash TEXT NOT NULL
        )
      `);
    }

    if (this.table === "chamados") {
      await client.queryArray(`
        CREATE TABLE IF NOT EXISTS chamados (
          id TEXT PRIMARY KEY,
          codigo TEXT NOT NULL UNIQUE,
          user_resp_id TEXT,
          user_resp JSONB,
          client JSONB NOT NULL,
          status TEXT NOT NULL,
          active BOOLEAN NOT NULL,
          details JSONB,
          messages JSONB NOT NULL,
          created TIMESTAMP NOT NULL,
          updated TIMESTAMP NOT NULL
        )
      `);
    }

    this.ready = true;
  }

  private dateValue(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString();
    }

    return date;
  }

  private safeName(name: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error("invalid name");
    }

    return name;
  }

  private error(message: string, err: unknown): T.Failure {
    return fail(message, err);
  }
}
