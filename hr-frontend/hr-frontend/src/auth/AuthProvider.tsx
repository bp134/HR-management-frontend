import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { apiTokenRequest } from '../lib/authConfig'
import { setApiTokenGetter } from '../lib/api'
import { ensureMsalInitialized, msalInstance } from './msalInstance'

const MsalReadyContext = createContext(false)

export function useMsalReady(): boolean {
  return useContext(MsalReadyContext)
}

function TokenBridge({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()

  useLayoutEffect(() => {
    setApiTokenGetter(async () => {
      const account = instance.getActiveAccount() ?? accounts[0]
      if (!account) return null
      try {
        const result = await instance.acquireTokenSilent({
          ...apiTokenRequest,
          account,
        })
        return result.accessToken
      } catch (silentErr) {
        if (import.meta.env.DEV) {
          console.warn('acquireTokenSilent failed:', silentErr)
        }
        try {
          const result = await instance.acquireTokenPopup(apiTokenRequest)
          return result.accessToken
        } catch (popupErr) {
          if (import.meta.env.DEV) {
            console.warn('acquireTokenPopup failed:', popupErr)
          }
          if (popupErr instanceof InteractionRequiredAuthError) {
            await instance.acquireTokenRedirect({ ...apiTokenRequest, account })
          }
          return null
        }
      }
    })
  }, [instance, accounts])

  return <>{children}</>
}

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureMsalInitialized()
      .then(() => msalInstance.handleRedirectPromise())
      .then(result => {
        const account = result?.account ?? msalInstance.getAllAccounts()[0]
        if (account) {
          msalInstance.setActiveAccount(account)
        }
      })
      .catch(console.error)
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Signing in…</p>
        </div>
      </div>
    )
  }

  return (
    <MsalReadyContext.Provider value={ready}>
      <MsalProvider instance={msalInstance}>
        <TokenBridge>{children}</TokenBridge>
      </MsalProvider>
    </MsalReadyContext.Provider>
  )
}

export async function signOut() {
  await ensureMsalInitialized()
  await msalInstance.logoutRedirect()
}
