import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from '../lib/authConfig'

export const msalInstance = new PublicClientApplication(msalConfig)

let initPromise: Promise<void> | null = null

export function ensureMsalInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = msalInstance.initialize()
  }
  return initPromise
}
