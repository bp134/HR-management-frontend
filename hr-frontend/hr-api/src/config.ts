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
