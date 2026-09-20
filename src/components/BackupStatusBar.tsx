import { useBackup, useDriveBackup } from '../context/AppDataContext'
import { formatDateTime, formatTime } from '../utils/format'

function FolderBackupRow() {
  const backup = useBackup()

  if (backup.status === 'unsupported') {
    return (
      <div className="backup-bar backup-bar--unsupported">
        Backup em pasta local não é suportado neste navegador — use Chrome ou Edge.
      </div>
    )
  }

  if (backup.status === 'disconnected') {
    return (
      <div className="backup-bar">
        <span>Sem backup em pasta local configurado.</span>
        <button type="button" className="btn btn--primary" onClick={backup.connect}>
          Conectar pasta de backup
        </button>
      </div>
    )
  }

  if (backup.status === 'needs-permission') {
    return (
      <div className="backup-bar backup-bar--warn">
        <span>Backup em pasta pausado — permissão de "{backup.folderName}" precisa ser renovada.</span>
        <button type="button" className="btn btn--primary" onClick={backup.reconnect}>
          Reconectar
        </button>
      </div>
    )
  }

  if (backup.status === 'error') {
    return (
      <div className="backup-bar backup-bar--warn">
        <span>Falha ao salvar backup em "{backup.folderName}".</span>
        <button type="button" className="btn btn--ghost" onClick={backup.disconnect}>
          Desconectar
        </button>
      </div>
    )
  }

  return (
    <div className="backup-bar backup-bar--ok">
      <span>
        {backup.status === 'saving' ? 'Salvando na pasta local…' : `Backup em pasta: "${backup.folderName}"`}
        {backup.status !== 'saving' && backup.lastSavedAt && ` · última vez às ${formatTime(backup.lastSavedAt)}`}
      </span>
      <button type="button" className="btn btn--ghost" onClick={backup.disconnect}>
        Desconectar
      </button>
    </div>
  )
}

function DriveBackupRow() {
  const drive = useDriveBackup()

  if (drive.status === 'unconfigured') {
    return (
      <div className="backup-bar backup-bar--unsupported">
        Backup Google Drive não configurado (falta VITE_GOOGLE_CLIENT_ID no .env.local).
      </div>
    )
  }

  if (drive.status === 'disconnected') {
    return (
      <div className="backup-bar">
        <span>Sem sincronização com Google Drive.</span>
        <button type="button" className="btn btn--primary" onClick={drive.connect}>
          Conectar Google Drive
        </button>
      </div>
    )
  }

  if (drive.status === 'connecting') {
    return (
      <div className="backup-bar">
        <span>Conectando ao Google Drive…</span>
      </div>
    )
  }

  if (drive.status === 'pending-decision') {
    return (
      <div className="backup-bar backup-bar--warn">
        <span>
          Encontramos um backup no Drive de {drive.remoteModifiedTime && formatDateTime(drive.remoteModifiedTime)}.
          Carregar ele (substitui os dados deste navegador) ou manter os dados daqui?
        </span>
        <div className="backup-bar__actions">
          <button type="button" className="btn btn--ghost" onClick={drive.keepLocal}>
            Manter daqui
          </button>
          <button type="button" className="btn btn--primary" onClick={drive.loadRemoteBackup}>
            Carregar do Drive
          </button>
        </div>
      </div>
    )
  }

  if (drive.status === 'error') {
    return (
      <div className="backup-bar backup-bar--warn">
        <span>Falha ao sincronizar com o Google Drive.</span>
        <button type="button" className="btn btn--ghost" onClick={drive.disconnect}>
          Desconectar
        </button>
      </div>
    )
  }

  return (
    <div className="backup-bar backup-bar--ok">
      <span>
        {drive.status === 'syncing' ? 'Sincronizando com o Drive…' : 'Sincronizado com o Google Drive'}
        {drive.status !== 'syncing' && drive.lastSyncedAt && ` · última vez às ${formatTime(drive.lastSyncedAt)}`}
      </span>
      <button type="button" className="btn btn--ghost" onClick={drive.disconnect}>
        Desconectar
      </button>
    </div>
  )
}

export function BackupStatusBar() {
  return (
    <div className="backup-bars">
      <FolderBackupRow />
      <DriveBackupRow />
    </div>
  )
}
