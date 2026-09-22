import { pool } from "./postgres.adapter.ts";

const migrations = [
  {
    version: 1,
    name: "initial",
    path: new URL("./migrations/001_initial.sql", import.meta.url),
  },
  {
    version: 2,
    name: "persistent_logs",
    path: new URL("./migrations/002_persistent_logs.sql", import.meta.url),
  },
  {
    version: 3,
    name: "chamado_client_cpf",
    path: new URL("./migrations/003_chamado_client_cpf.sql", import.meta.url),
  },
  {
    version: 4,
    name: "chamado_feedback",
    path: new URL("./migrations/004_chamado_feedback.sql", import.meta.url),
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.queryArray(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of migrations) {
      const applied = await client.queryObject<{ version: number }>({
        text: "SELECT version FROM schema_migrations WHERE version = $1",
        args: [migration.version],
      });

      if (applied.rows.length > 0) {
        continue;
      }

      const sql = await Deno.readTextFile(migration.path);

      await client.queryArray("BEGIN");

      try {
        await client.queryArray(sql);
        await client.queryArray({
          text: `
            INSERT INTO schema_migrations (version, name)
            VALUES ($1, $2)
          `,
          args: [migration.version, migration.name],
        });
        await client.queryArray("COMMIT");
      } catch (err) {
        await client.queryArray("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
