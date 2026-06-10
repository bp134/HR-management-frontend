import { Configuration, LogLevel } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID

/** Strip accidental "VITE_AZURE_API_SCOPE=api://..." pasted into the GitHub secret value. */
function readApiScope(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let value = raw.trim()
  if (value.includes('VITE_AZURE_API_SCOPE=')) {
    value = value.split('VITE_AZURE_API_SCOPE=').pop()?.trim() ?? value
  } else if (value.includes('=') && value.includes('api://')) {
    value = value.split('=').pop()?.trim() ?? value
  }
  return value.startsWith('api://') ? value : undefined
}

const apiScope = readApiScope(import.meta.env.VITE_AZURE_API_SCOPE)

if (!clientId || !tenantId || !apiScope) {
  console.warn('Missing VITE_AZURE_CLIENT_ID, VITE_AZURE_TENANT_ID, or VITE_AZURE_API_SCOPE')
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? '',
    authority: `https://login.microsoftonline.com/${tenantId ?? 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
    postLogoutRedirectUri: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      logLevel: import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error,
    },
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', apiScope].filter(Boolean) as string[],
}

export const apiTokenRequest = {
  scopes: [apiScope ?? ''].filter(Boolean),
}
