import {
  type AccountInfo,
  type AuthenticationResult,
  PublicClientApplication,
} from '@azure/msal-browser'

const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID
const tenantId = import.meta.env.VITE_OUTLOOK_TENANT_ID || 'common'
const configuredRedirectUri = import.meta.env.VITE_OUTLOOK_REDIRECT_URI

const authority = `https://login.microsoftonline.com/${tenantId}`
const redirectUri = configuredRedirectUri || window.location.origin

const scopes = ['User.Read', 'Mail.Read', 'offline_access']

const msalConfig = clientId
  ? {
      auth: {
        clientId,
        authority,
        redirectUri,
      },
      cache: {
        cacheLocation: 'localStorage' as const,
      },
    }
  : null

const msalInstance = msalConfig ? new PublicClientApplication(msalConfig) : null

let initialized = false
let redirectHandled = false
let lastAuthResult: AuthenticationResult | null = null

const ensureInitialized = async () => {
  if (!msalInstance) throw new Error('Outlook sign-in is not configured.')
  if (!initialized) {
    await msalInstance.initialize()
    initialized = true
  }

  if (!redirectHandled) {
    const result = await msalInstance.handleRedirectPromise()
    if (result) {
      lastAuthResult = result
    }
    normalizeAuthResult(result)
    redirectHandled = true
  }
}

const normalizeAuthResult = (result: AuthenticationResult | null): AccountInfo | null => {
  if (!result?.account) return null
  msalInstance?.setActiveAccount(result.account)
  return result.account
}

export const isOutlookAuthConfigured = Boolean(clientId)

export const getOutlookSetupHint = () =>
  'Set VITE_OUTLOOK_CLIENT_ID (and optionally VITE_OUTLOOK_TENANT_ID, VITE_OUTLOOK_REDIRECT_URI) in your environment.' 

export const getSignedInAccount = async (): Promise<AccountInfo | null> => {
  await ensureInitialized()
  const active = msalInstance?.getActiveAccount()
  if (active) return active
  const first = msalInstance?.getAllAccounts()[0] ?? null
  if (first) {
    msalInstance?.setActiveAccount(first)
  }
  return first
}

export const getOutlookAccounts = async (): Promise<AccountInfo[]> => {
  await ensureInitialized()
  return msalInstance?.getAllAccounts() ?? []
}

export const setActiveOutlookAccount = async (homeAccountId: string): Promise<AccountInfo | null> => {
  await ensureInitialized()
  const account =
    msalInstance?.getAllAccounts().find((candidate) => candidate.homeAccountId === homeAccountId) ?? null
  if (account) {
    msalInstance?.setActiveAccount(account)
  }
  return account
}

export const signInToOutlook = async (): Promise<AccountInfo | null> => {
  await ensureInitialized()
  await msalInstance!.loginRedirect({
    scopes,
    prompt: 'select_account',
  })
  return null
}

export const signOutOfOutlook = async (homeAccountId?: string) => {
  await ensureInitialized()
  const account = homeAccountId ? await setActiveOutlookAccount(homeAccountId) : await getSignedInAccount()
  await msalInstance!.logoutRedirect({ account: account ?? undefined })
}

export const acquireOutlookAccessToken = async (homeAccountId?: string): Promise<string> => {
  await ensureInitialized()

  if (lastAuthResult?.accessToken) {
    const token = lastAuthResult.accessToken
    lastAuthResult = null
    return token
  }

  const account = homeAccountId ? await setActiveOutlookAccount(homeAccountId) : await getSignedInAccount()
  if (!account) {
    throw new Error('Not signed in. Use Sign in with Outlook first.')
  }

  try {
    const silent = await msalInstance!.acquireTokenSilent({ scopes, account })
    return silent.accessToken
  } catch {
    await msalInstance!.acquireTokenRedirect({ scopes, account })
    throw new Error('Continuing permission flow in this window. After return, click Sync Outlook again.')
  }
}
