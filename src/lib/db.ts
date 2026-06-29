import { Pool, type QueryResultRow } from "pg";
import { config } from "./config";

// ───────────────────────────────────────────────────────────────────────────
// Conexão com o PostgreSQL (driver pg).
// Usa a string de conexão do config: dev = localhost, prod = produção.
// Em dev, guarda o pool num global pra não abrir vários no hot-reload do Next.
// ───────────────────────────────────────────────────────────────────────────

const globalForPg = globalThis as unknown as { _pgPool?: Pool };

function makePool(): Pool {
  // SSL só quando o banco é remoto; localhost (container/dev) não usa SSL.
  const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: local ? undefined : { rejectUnauthorized: false },
    max: 5,
  });
}

export const pool: Pool = globalForPg._pgPool ?? makePool();
if (config.isDev) globalForPg._pgPool = pool;

/** Roda um SQL e devolve as linhas. Ex.: query("select * from companies"). */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query<T>(text, params as unknown[]);
  return res.rows;
}
