import { Pool, type PoolClient } from "@db/postgres";
import type * as T from "./structure.ts";

type PostgresRow = {
  id: string;
  data: T.DataBasic | string;
};

export class PostgresAdapter implements T.DBAdapter {
  private pool: Pool;
  private table: string;
  private ready = false;

  constructor(
    table = "records",
    databaseUrl = Deno.env.get("DATABASE_URL") ?? "",
  ) {
    this.table = this.safeName(table);
    this.pool = new Pool(databaseUrl, 10, true);
  }

  async findById(id: T.Id): Promise<T.Result<T.FindData>> {
    try {
      return await this.withClient(async (client) => {
        const result = await client.queryObject<PostgresRow>({
          text: `SELECT id, data FROM ${this.table} WHERE id = $1`,
          args: [id],
          fields: ["id", "data"],
        });

        const row = result.rows[0];

        if (!row) {
          return {
            success: false,
            message: "id not found",
            data: null,
            error: new Error(`id ${id} not found`),
          };
        }

        return {
          success: true,
          message: "record found",
          data: {
            id: row.id,
            data: this.parseData(row.data),
          },
          error: null,
        };
      });
    } catch (err) {
      return this.error("findById error", err);
    }
  }

  async save(data: T.DataBasic): Promise<T.Result<T.IdData>> {
    try {
      return await this.withClient(async (client) => {
        const id = crypto.randomUUID();

        await client.queryArray({
          text: `INSERT INTO ${this.table} (id, data) VALUES ($1, $2::jsonb)`,
          args: [id, JSON.stringify(data)],
        });

        return {
          success: true,
          message: "record created",
          data: { id },
          error: null,
        };
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

        return {
          success: true,
          message: "record deleted",
          data: { id },
          error: null,
        };
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

        await client.queryArray({
          text: `UPDATE ${this.table} SET data = $1::jsonb WHERE id = $2`,
          args: [JSON.stringify(next), id],
        });

        return {
          success: true,
          message: "record updated",
          data: { id },
          error: null,
        };
      });
    } catch (err) {
      return this.error("update error", err);
    }
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

    await client.queryArray(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);

    this.ready = true;
  }

  private parseData(data: T.DataBasic | string): T.DataBasic {
    if (typeof data === "string") {
      return JSON.parse(data);
    }

    return data;
  }

  private safeName(name: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error("invalid name");
    }

    return name;
  }

  private error(message: string, err: unknown): T.Failure {
    return {
      success: false,
      message,
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
