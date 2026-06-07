import pg from 'pg'
import { config } from './config.js'
import { clearPostgresTokenCache, getPostgresAccessToken } from './db/entraToken.js'

const { Pool } = pg

let pool: pg.Pool | null = null
let poolTokenExpiresAt = 0

function buildPasswordPool(url: string): pg.Pool {
  let connectionString = url
  if (!connectionString.includes('sslmode=')) {
    const sep = connectionString.includes('?') ? '&' : '?'
    connectionString += `${sep}sslmode=require`
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
}

async function buildEntraPool(): Promise<pg.Pool> {
  const token = await getPostgresAccessToken()
  poolTokenExpiresAt = Date.now() + 50 * 60 * 1000

  if (config.database.auth !== 'entra') {
    throw new Error('Internal error: expected Entra database config')
  }

  return new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: token,
    ssl: { rejectUnauthorized: true },
    max: 10,
    idleTimeoutMillis: 30_000,
  })
}

async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

async function getPool(): Promise<pg.Pool> {
  if (config.database.auth === 'password') {
    if (!pool) {
      pool = buildPasswordPool(config.database.url)
    }
    return pool
  }

  const needsRefresh = !pool || Date.now() >= poolTokenExpiresAt
  if (needsRefresh) {
    await closePool()
    clearPostgresTokenCache()
    pool = await buildEntraPool()
  }
  return pool!
}

function isAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('password authentication failed') ||
    msg.includes('invalid authorization specification') ||
    msg.includes('authentication failed')
  )
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  try {
    const activePool = await getPool()
    return await activePool.query<T>(text, params)
  } catch (err) {
    if (config.database.auth === 'entra' && isAuthError(err)) {
      await closePool()
      clearPostgresTokenCache()
      const activePool = await getPool()
      return activePool.query<T>(text, params)
    }
    throw err
  }
}

export async function testDatabaseConnection(): Promise<void> {
  await query('SELECT 1')
}
