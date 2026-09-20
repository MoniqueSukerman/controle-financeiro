import { useCallback, useEffect, useRef, useState } from 'react'
import { clearStoredFolderHandle, getStoredFolderHandle, storeFolderHandle } from './backupFolder'

export type BackupStatus = 'unsupported' | 'disconnected' | 'needs-permission' | 'connected' | 'saving' | 'error'

const BACKUP_FILE_NAME = 'controle-financeiro-backup.json'

export function useBackupFolder(getPayload: () => unknown) {
  const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const [status, setStatus] = useState<BackupStatus>(supported ? 'disconnected' : 'unsupported')
  const [folderName, setFolderName] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const payloadRef = useRef(getPayload)
  payloadRef.current = getPayload

  useEffect(() => {
    if (!supported) return
    getStoredFolderHandle().then(async (handle) => {
      if (!handle) return
      const permission = await handle.queryPermission({ mode: 'readwrite' })
      handleRef.current = handle
      setFolderName(handle.name)
      setStatus(permission === 'granted' ? 'connected' : 'needs-permission')
    })
  }, [supported])

  const connect = useCallback(async () => {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    await storeFolderHandle(handle)
    handleRef.current = handle
    setFolderName(handle.name)
    setStatus('connected')
  }, [])

  const reconnect = useCallback(async () => {
    if (!handleRef.current) return
    const permission = await handleRef.current.requestPermission({ mode: 'readwrite' })
    setStatus(permission === 'granted' ? 'connected' : 'needs-permission')
  }, [])

  const disconnect = useCallback(async () => {
    await clearStoredFolderHandle()
    handleRef.current = null
    setFolderName(null)
    setStatus('disconnected')
  }, [])

  const writeBackup = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    setStatus('saving')
    try {
      const fileHandle = await handle.getFileHandle(BACKUP_FILE_NAME, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(payloadRef.current(), null, 2))
      await writable.close()
      setLastSavedAt(new Date().toISOString())
      setStatus('connected')
    } catch {
      setStatus('error')
    }
  }, [])

  return { supported, status, folderName, lastSavedAt, connect, reconnect, disconnect, writeBackup }
}
