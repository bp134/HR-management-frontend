import { DefaultAzureCredential } from '@azure/identity'

const POSTGRES_AAD_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default'

let cachedToken: { token: string; expiresOnTimestamp: number } | null = null

export async function getPostgresAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresOnTimestamp > now + 60_000) {
    return cachedToken.token
  }

  const credential = new DefaultAzureCredential()
  const result = await credential.getToken(POSTGRES_AAD_SCOPE)
  if (!result?.token) {
    throw new Error(
      'Failed to acquire Microsoft Entra token for PostgreSQL. ' +
      'Locally: run "az login". On Azure App Service: enable managed identity and add it as a PostgreSQL Entra admin.'
    )
  }

  cachedToken = {
    token: result.token,
    expiresOnTimestamp: result.expiresOnTimestamp,
  }
  return result.token
}

export function clearPostgresTokenCache(): void {
  cachedToken = null
}
