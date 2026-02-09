import React, { useMemo } from 'react'
import { SyncItem, SyncSettings } from '../lib/storage'

interface SyncCenterProps {
  queue: SyncItem[]
  syncSettings: SyncSettings
  syncRunning: boolean
  lastSyncAt?: string
  syncMessage?: string
  onSyncAll: () => void
}

const SyncCenter: React.FC<SyncCenterProps> = ({
  queue,
  syncSettings,
  syncRunning,
  lastSyncAt,
  syncMessage,
  onSyncAll
}) => {
  const stats = useMemo(() => {
    const queued = queue.filter((item) => item.status === 'queued').length
    const failed = queue.filter((item) => item.status === 'failed').length
    const synced = queue.filter((item) => item.status === 'synced').length
    return { queued, failed, synced }
  }, [queue])

  return (
    <section className="dn-screen">
      <div className="dn-card">
        <div className="dn-card-title">Sync Center</div>
        <p className="dn-muted">
          Endpoint: <code>{syncSettings.endpoint}</code>
        </p>
        <p className="dn-muted">
          Online auto-sync: {syncSettings.autoSyncOnOnline ? 'aan' : 'uit'} - Timeout: {syncSettings.requestTimeoutMs}ms
        </p>

        <div className="dn-chip-row">
          <span className="dn-chip">Queued: {stats.queued}</span>
          <span className={`dn-chip ${stats.failed > 0 ? 'is-nok' : ''}`}>Failed: {stats.failed}</span>
          <span className="dn-chip is-ok">Synced: {stats.synced}</span>
        </div>

        <button className="dn-primary-btn dn-block" type="button" onClick={onSyncAll} disabled={syncRunning}>
          {syncRunning ? 'Sync bezig...' : 'Sync nu'}
        </button>

        {syncMessage && <p className="dn-muted">{syncMessage}</p>}
        {lastSyncAt && <p className="dn-muted">Laatste syncpoging: {new Date(lastSyncAt).toLocaleString('nl-BE')}</p>}
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Wachtrij ({queue.length})</div>
        {queue.length === 0 && <p className="dn-muted">Geen items in wachtrij.</p>}
        <div className="dn-list">
          {queue.map((item) => (
            <div key={item.id} className="dn-list-item">
              <div>
                <div className="dn-list-title">{item.type}</div>
                <div className="dn-list-sub">Aangemaakt: {new Date(item.createdAt).toLocaleString('nl-BE')}</div>
                <div className="dn-list-sub">Pogingen: {item.attempts}</div>
                {item.lastAttemptAt && (
                  <div className="dn-list-sub">Laatste poging: {new Date(item.lastAttemptAt).toLocaleString('nl-BE')}</div>
                )}
                {item.lastError && <div className="dn-list-sub dn-text-danger">Fout: {item.lastError}</div>}
              </div>
              <span className={`dn-chip ${item.status === 'synced' ? 'is-ok' : item.status === 'failed' ? 'is-nok' : ''}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SyncCenter
