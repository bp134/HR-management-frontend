import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export type DatabaseAuth = 'entra' | 'password'

export interface EntraDatabaseConfig {
  auth: 'entra'
  host: string
  port: number
  name: string
  user: string
}

export interface PasswordDatabaseConfig {
  auth: 'password'
  url: string
}

export type DatabaseConfig = EntraDatabaseConfig | PasswordDatabaseConfig

function buildPasswordUrl(
  host: string,
  port: string,
  name: string,
  user: string,
  password: string
): string {
  const userEnc = encodeURIComponent(user)
  const passEnc = encodeURIComponent(password)
  return `postgresql://${userEnc}:${passEnc}@${host}:${port}/${name}?sslmode=require`
}

function loadDatabaseConfig(): DatabaseConfig {
  const auth = (process.env.DATABASE_AUTH ?? 'password').toLowerCase()
  if (auth === 'entra') {
    return {
      auth: 'entra',
      host: required('DATABASE_HOST'),
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      name: required('DATABASE_NAME'),
      user: required('DATABASE_USER'),
    }
  }

  // Prefer discrete vars on Render — Azure usernames often contain @ and break DATABASE_URL parsing.
  const host = process.env.DATABASE_HOST?.trim()
  const user = process.env.DATABASE_USER?.trim()
  const password = process.env.DATABASE_PASSWORD
  const name = process.env.DATABASE_NAME?.trim()
  const port = process.env.DATABASE_PORT ?? '5432'

  if (host && user && password && name) {
    return {
      auth: 'password',
      url: buildPasswordUrl(host, port, name, user, password),
    }
  }

  return {
    auth: 'password',
    url: required('DATABASE_URL'),
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  azureTenantId: required('AZURE_TENANT_ID'),
  azureApiClientId: required('AZURE_API_CLIENT_ID'),
  database: loadDatabaseConfig(),
}

export const azureIssuer = `https://login.microsoftonline.com/${config.azureTenantId}/v2.0`
export const azureJwksUrl = new URL(
  `https://login.microsoftonline.com/${config.azureTenantId}/discovery/v2.0/keys`
)
