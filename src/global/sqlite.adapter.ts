import { Database } from "@db/sqlite";
import { fail, internalError, success } from "./result.ts";
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
    await Promise.resolve();

    try {
      const row = this.db
        .prepare(`SELECT id, data FROM ${this.table} WHERE id = ?`)
        .get<T.Row>(id);

      if (!row) {
        return fail("Registro não encontrado", 404);
      }

      return success("Registro encontrado", {
        id: row.id,
        data: JSON.parse(row.data),
      });
    } catch (err) {
      return internalError(err);
    }
  }

  async findOne(
    filters: Record<string, T.QueryValue>,
  ): Promise<T.Result<T.FindData>> {
    const result = await this.findAll({ filters, limit: 1 });

    if (!result.success) {
      return result;
    }

    const item = result.data[0];

    return item
      ? success("Registro encontrado", item)
      : fail("Registro não encontrado", 404);
  }

  async findAll(
    options: T.FindOptions = {},
  ): Promise<T.Result<T.FindAllData>> {
    await Promise.resolve();

    try {
      const filters = options.filters ?? {};
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;
      const rows = this.db
        .prepare(`SELECT id, data FROM ${this.table}`)
        .all<T.Row>();
      const data = rows
        .map((row) => ({
          id: row.id,
          data: JSON.parse(row.data) as T.DataBasic,
        }))
        .filter((item) =>
          Object.entries(filters).every(([key, value]) =>
            key === "id" ? item.id === value : item.data[key] === value
          )
        )
        .slice(offset, offset + limit);

      return success("Registros encontrados", data);
    } catch (err) {
      return internalError(err);
    }
  }

  async save(data: T.DataBasic): Promise<T.Result<T.VersionData>> {
    await Promise.resolve();

    try {
      const id = crypto.randomUUID();
      const version = 1;

      this.db
        .prepare(`INSERT INTO ${this.table} (id, data) VALUES (?, ?)`)
        .run(id, JSON.stringify({ ...data, version }));

      return success("Registro criado", { id, version }, 201);
    } catch (err) {
      return internalError(err);
    }
  }

  async delete(id: string): Promise<T.Result<T.IdData>> {
    const found = await this.findById(id);

    if (!found.success) {
      return found;
    }

    try {
      this.db
        .prepare(`DELETE FROM ${this.table} WHERE id = ?`)
        .run(id);

      return success("Registro apagado", { id });
    } catch (err) {
      return internalError(err);
    }
  }

  async update(
    id: string,
    data: T.DataBasic,
    expected_version: number,
  ): Promise<T.Result<T.VersionData>> {
    const found = await this.findById(id);

    if (!found.success) {
      return found;
    }

    const current_version = found.data.data.version;

    if (current_version !== expected_version) {
      return fail("Registro alterado por outra operação", 409);
    }

    try {
      const version = expected_version + 1;
      const next = { ...found.data.data, ...data, version };

      this.db
        .prepare(`UPDATE ${this.table} SET data = ? WHERE id = ?`)
        .run(JSON.stringify(next), id);

      return success("Registro atualizado", { id, version });
    } catch (err) {
      return internalError(err);
    }
  }

  private safeName(name: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error("Nome inválido");
    }

    return name;
  }
}
