import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './index.css'
import csvText from './data/archisnapper.csv?raw'
import BottomNav, { NavKey } from './components/BottomNav'
import ConfigPanel from './components/ConfigPanel'
import Home from './screens/Home'
import Inspection from './screens/Inspection'
import Handover from './screens/Handover'
import AiValidation from './screens/AIValidation'
import SyncCenter from './screens/SyncCenter'
import Workboard from './screens/Workboard'
import SignalisatieScan from './screens/SignalisatieScan'
import { parseArchisnapperCSV } from './lib/schema'
import { APP_VERSION } from './version'
import {
  Config,
  InspectionMeta,
  InspectionRecord,
  SyncSettings,
  loadConfig,
  saveConfig,
  loadInspections,
  saveInspections,
  loadSyncQueue,
  enqueueSync,
  saveSyncQueue,
  loadSyncSettings,
  saveSyncSettings
} from './lib/storage'
import { runSyncBatch } from './lib/sync'
import { extractWorkPartiesFromSchema } from './lib/workParties'

const DEFAULT_RESPONSIBLE = [
  { value: 'aannemer', label: 'Aannemer' },
  { value: 'nutsmaatschappij', label: 'Nutsmaatschappij' },
  { value: 'stad', label: 'Stad Antwerpen' },
  { value: 'signalisatiebedrijf', label: 'Signalisatiebedrijf' }
]

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  endpoint: '/api/inspecties/sync',
  autoSyncOnOnline: true,
  requestTimeoutMs: 15000
}

const DEVICE_ID_KEY = 'dn_device_id_2026_02'

const getOrCreateDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}

const createInspection = (): InspectionRecord => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  data: {},
  meta: {
    inspector: '',
    location: '',
    gps: ''
  }
})

const App: React.FC = () => {
  const schema = useMemo(() => parseArchisnapperCSV(csvText), [])
  const deviceId = useMemo(() => getOrCreateDeviceId(), [])

const defaultConfig: Config = {
  inspectors: schema.defaults.inspectors.map((name) => ({
    id: crypto.randomUUID(),
    name,
    assignedPostcodes: []
  })),
  responsibleParties: DEFAULT_RESPONSIBLE,
  workParties: extractWorkPartiesFromSchema(schema),
  postcodes: schema.defaults.postcodes.map((option) => ({
    value: option.value || option.label,
    label: option.label
  }))
}

  const [config, setConfig] = useState<Config>(() => loadConfig(defaultConfig))
  const [inspections, setInspections] = useState<InspectionRecord[]>(() => loadInspections())
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(
    () => inspections[0]?.id ?? null
  )
  const [view, setView] = useState<NavKey>('home')
  const [syncQueue, setSyncQueue] = useState(() => loadSyncQueue())
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => loadSyncSettings(DEFAULT_SYNC_SETTINGS))
  const [syncRunning, setSyncRunning] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined)
  const [showConfigPanel, setShowConfigPanel] = useState(false)

  const activeInspection = inspections.find((item) => item.id === activeInspectionId) || null

  const persistConfig = useCallback((next: Config) => {
    setConfig(next)
    saveConfig(next)
  }, [])

  const persistSyncSettings = useCallback((next: SyncSettings) => {
    setSyncSettings(next)
    saveSyncSettings(next)
  }, [])

  const persistInspectionUpdate = useCallback(
    (inspectionId: string, data: Record<string, any>, metaUpdates?: Partial<InspectionMeta>) => {
      setInspections((previous) => {
        const updated = previous.map((item) =>
          item.id === inspectionId
            ? {
                ...item,
                data,
                meta: { ...item.meta, ...metaUpdates },
                updatedAt: new Date().toISOString()
              }
            : item
        )
        saveInspections(updated)
        return updated
      })
    },
    []
  )

  useEffect(() => {
    if (inspections.length === 0) {
      setActiveInspectionId(null)
      return
    }

    if (!activeInspectionId) {
      setActiveInspectionId(inspections[0].id)
      return
    }

    const exists = inspections.some((item) => item.id === activeInspectionId)
    if (!exists) {
      setActiveInspectionId(inspections[0].id)
    }
  }, [inspections, activeInspectionId])

  const handleStartInspection = () => {
    const inspection = createInspection()
    setInspections((previous) => {
      const updated = [inspection, ...previous]
      saveInspections(updated)
      return updated
    })
    setActiveInspectionId(inspection.id)
    setView('inspect')
  }

  const handleSelectInspection = (id: string) => {
    setActiveInspectionId(id)
    setView('inspect')
  }

  const handleUpdateInspection = (data: Record<string, any>, metaUpdates?: Partial<InspectionRecord['meta']>) => {
    if (!activeInspection) return
    persistInspectionUpdate(activeInspection.id, data, metaUpdates)
  }

  const handleQueueSync = useCallback((type: string, payload: any) => {
    const updatedQueue = enqueueSync({ type, payload })
    setSyncQueue(updatedQueue)
  }, [])

  const handleSyncAll = useCallback(async () => {
    if (syncRunning) return

    setSyncRunning(true)
    setSyncMessage('Sync gestart...')

    try {
      const result = await runSyncBatch(syncQueue, syncSettings, { deviceId })
      setSyncQueue(result.updatedQueue)
      saveSyncQueue(result.updatedQueue)
      setSyncMessage(result.message)
      setLastSyncAt(new Date().toISOString())
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync mislukt.')
      setLastSyncAt(new Date().toISOString())
    } finally {
      setSyncRunning(false)
    }
  }, [deviceId, syncQueue, syncSettings, syncRunning])

  useEffect(() => {
    if (!syncSettings.autoSyncOnOnline) return

    const onOnline = () => {
      void handleSyncAll()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [handleSyncAll, syncSettings.autoSyncOnOnline])

  const renderScreen = () => {
    switch (view) {
      case 'home':
        return (
          <Home
            inspections={inspections}
            onStartInspection={handleStartInspection}
            onSelectInspection={handleSelectInspection}
          />
        )
      case 'inspect':
        return (
          <Inspection
            schema={schema}
            inspection={activeInspection}
            config={config}
            onUpdate={handleUpdateInspection}
            onQueueSync={handleQueueSync}
          />
        )
      case 'handover':
        return (
          <Handover
            schema={schema}
            inspection={activeInspection}
            onUpdateMeta={(metaUpdates) => {
              if (!activeInspection) return
              persistInspectionUpdate(activeInspection.id, activeInspection.data, metaUpdates)
            }}
            onQueueSync={handleQueueSync}
          />
        )
      case 'ai':
        return <AiValidation schema={schema} inspection={activeInspection} onQueueSync={handleQueueSync} />
      case 'sync':
        return (
          <SyncCenter
            queue={syncQueue}
            syncSettings={syncSettings}
            syncRunning={syncRunning}
            syncMessage={syncMessage}
            lastSyncAt={lastSyncAt}
            onSyncAll={() => {
              void handleSyncAll()
            }}
          />
        )
      case 'workboard':
        return <Workboard onStartInspection={handleStartInspection} />
      case 'scan':
        return (
          <SignalisatieScan
            inspection={activeInspection}
            onUpdateInspectionData={(nextData) => handleUpdateInspection(nextData)}
            onQueueSync={handleQueueSync}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="dn-shell">
      <header className="dn-header">
        <div>
          <div className="dn-brand">Digitale Nuts · v{APP_VERSION}</div>
          <div className="dn-subtitle">Zorgende AI assistent voor nutsinspecties · build 2026_02</div>
        </div>
        <div className="dn-header-actions">
          <button
            type="button"
            className="dn-secondary-btn"
            onClick={() => setShowConfigPanel(true)}
            title="Beheer inspecteurs, verantwoordelijke partijen en sync"
          >
            Configuratie
          </button>
        </div>
      </header>

      <main className="dn-content">{renderScreen()}</main>

      <BottomNav active={view} onChange={setView} />

      <ConfigPanel
        isOpen={showConfigPanel}
        config={config}
        syncSettings={syncSettings}
        onClose={() => setShowConfigPanel(false)}
        onSave={(nextConfig, nextSyncSettings) => {
          persistConfig(nextConfig)
          persistSyncSettings(nextSyncSettings)
          setSyncMessage('Configuratie opgeslagen.')
        }}
      />
    </div>
  )
}

export default App
