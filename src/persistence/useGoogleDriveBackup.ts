import { useCallback, useRef, useState } from 'react'
import { downloadBackupFile, findBackupFile, uploadBackupFile } from './googleDrive'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

export type DriveBackupStatus =
  | 'unconfigured'
  | 'disconnected'
  | 'connecting'
  | 'pending-decision'
  | 'connected'
  | 'syncing'
  | 'error'

function requestToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) return reject(new Error('missing client id'))
    if (!window.google) return reject(new Error('google identity services not loaded'))
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'no access token'))
          return
        }
        resolve(response.access_token)
      },
      error_callback: (error) => reject(new Error(error.type)),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

export function useGoogleDriveBackup(getPayload: () => unknown) {
  const [status, setStatus] = useState<DriveBackupStatus>(CLIENT_ID ? 'disconnected' : 'unconfigured')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [remoteModifiedTime, setRemoteModifiedTime] = useState<string | null>(null)

  const tokenRef = useRef<string | null>(null)
  const fileIdRef = useRef<string | null>(null)
  const payloadRef = useRef(getPayload)
  payloadRef.current = getPayload

  const connect = useCallback(async () => {
    setStatus('connecting')
    try {
      const token = await requestToken()
      tokenRef.current = token
      const existing = await findBackupFile(token)
      if (existing) {
        fileIdRef.current = existing.id
        setRemoteModifiedTime(existing.modifiedTime)
        setStatus('pending-decision')
      } else {
        setStatus('connected')
      }
    } catch {
      setStatus('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    tokenRef.current = null
    fileIdRef.current = null
    setRemoteModifiedTime(null)
    setStatus(CLIENT_ID ? 'disconnected' : 'unconfigured')
  }, [])

  const loadRemote = useCallback(async (): Promise<unknown | null> => {
    if (!tokenRef.current || !fileIdRef.current) return null
    const text = await downloadBackupFile(tokenRef.current, fileIdRef.current)
    return JSON.parse(text)
  }, [])

  const keepLocal = useCallback(() => {
    setStatus('connected')
  }, [])

  const writeBackup = useCallback(async () => {
    if (!tokenRef.current || status === 'pending-decision' || status === 'connecting') return
    setStatus('syncing')
    try {
      const content = JSON.stringify(payloadRef.current(), null, 2)
      const meta = await uploadBackupFile(tokenRef.current, fileIdRef.current, content)
      fileIdRef.current = meta.id
      setLastSyncedAt(new Date().toISOString())
      setStatus('connected')
    } catch {
      setStatus('error')
    }
  }, [status])

  return {
    status,
    lastSyncedAt,
    remoteModifiedTime,
    connect,
    disconnect,
    loadRemote,
    keepLocal,
    writeBackup,
  }
}
