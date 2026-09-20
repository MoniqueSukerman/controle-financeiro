const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const BACKUP_FILE_NAME = 'controle-financeiro-backup.json'
const BOUNDARY = 'cf-backup-boundary'

export interface DriveFileMeta {
  id: string
  modifiedTime: string
}

export async function findBackupFile(token: string): Promise<DriveFileMeta | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`)
  const res = await fetch(`${DRIVE_FILES_URL}?q=${query}&fields=files(id,modifiedTime)&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('drive-list-failed')
  const data = await res.json()
  return data.files?.[0] ?? null
}

export async function downloadBackupFile(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('drive-download-failed')
  return res.text()
}

export async function uploadBackupFile(
  token: string,
  fileId: string | null,
  content: string,
): Promise<DriveFileMeta> {
  const metadata = fileId ? {} : { name: BACKUP_FILE_NAME, mimeType: 'application/json' }
  const body =
    `--${BOUNDARY}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${BOUNDARY}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${BOUNDARY}--`

  const url = fileId
    ? `${UPLOAD_URL}/${fileId}?uploadType=multipart&fields=id,modifiedTime`
    : `${UPLOAD_URL}?uploadType=multipart&fields=id,modifiedTime`

  const res = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
    },
    body,
  })
  if (!res.ok) throw new Error('drive-upload-failed')
  return res.json()
}
