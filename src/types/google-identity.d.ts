interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
}

interface GoogleTokenClientConfig {
  client_id: string
  scope: string
  callback: (response: GoogleTokenResponse) => void
  error_callback?: (error: { type: string; message?: string }) => void
}

interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void
}

interface GoogleAccountsOauth2 {
  initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOauth2
}

interface GoogleGlobal {
  accounts: GoogleAccounts
}

interface Window {
  google?: GoogleGlobal
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
