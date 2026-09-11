import { Database } from "@db/sqlite";
import type * as T from "./structure.ts";



export class SQLiteAdapter implements T.DBAdapter {
  private db: Database;
  private table: string;

  constructor(db_path = "local.db", table = "records") {
    this.db = new Database(db_path);
    this.table = this.safeName(table);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
  }

  async findById(id: string): Promise<T.Result<T.FindData>> {
    try {
      const row = this.db
        .prepare(`SELECT id, data FROM ${this.table} WHERE id = ?`)
        .get<T.Row>(id);

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
        data: { id: row.id, data: JSON.parse(row.data) },
        error: null,
      };
    } catch (err) {
      return this.error("findById error", err);
    }
  }

  async save(data: T.DataBasic): Promise<T.Result<T.IdData>> {
    try {
      const id = crypto.randomUUID();

      this.db
        .prepare(`INSERT INTO ${this.table} (id, data) VALUES (?, ?)`)
        .run(id, JSON.stringify(data));

      return {
        success: true,
        message: "record created",
        data: { id },
        error: null,
      };
    } catch (err) {
      return this.error("save error", err);
    }
  }

  async delete(id: string): Promise<T.Result<T.IdData>> {
    try {
      const found = await this.findById(id);

      if (!found.success) {
        return found;
      }

      this.db
        .prepare(`DELETE FROM ${this.table} WHERE id = ?`)
        .run(id);

      return {
        success: true,
        message: "record deleted",
        data: { id },
        error: null,
      };
    } catch (err) {
      return this.error("delete error", err);
    }
  }

  async update(id: string, data: T.DataBasic): Promise<T.Result<T.IdData>> {
    try {
      const found = await this.findById(id);

      if (!found.success) {
        return found;
      }

      const current = found.data.data;
      const next = { ...current, ...data };

      this.db
        .prepare(`UPDATE ${this.table} SET data = ? WHERE id = ?`)
        .run(JSON.stringify(next), id);

      return {
        success: true,
        message: "record updated",
        data: { id },
        error: null,
      };
    } catch (err) {
      return this.error("update error", err);
    }
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
