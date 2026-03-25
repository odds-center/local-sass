import { Pool, PoolClient, types as pgTypes } from 'pg'

// Return dates as strings (matches existing code expectations)
pgTypes.setTypeParser(pgTypes.builtins.DATE, (val: string) => val)
pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMP, (val: string) => val)
pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMPTZ, (val: string) => val)
// Return numerics as numbers
pgTypes.setTypeParser(pgTypes.builtins.NUMERIC, (val: string) => parseFloat(val))

let pool: Pool

export function getPool(): Pool {
  if (!pool) throw new Error('DB not initialized. Call initDb() first.')
  return pool
}

export function createPool(): Pool {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
  })
  pool.on('error', (err) => console.error('[pg] Pool error:', err))
  return pool
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const result = await getPool().query(sql, params)
  return result.rows[0] as T | undefined
}

export async function execute(sql: string, params?: unknown[]): Promise<void> {
  await getPool().query(sql, params)
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
