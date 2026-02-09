export interface Inspector {
  id: string
  name: string
  phone?: string
  assignedPostcodes: string[]
}

export interface ConfigOption {
  value: string
  label: string
}

export interface WorkPartiesConfig {
  aannemers: ConfigOption[]
  signalisatiebedrijven: ConfigOption[]
  nutsbedrijven: ConfigOption[]
}

export interface Config {
  inspectors: Inspector[]
  responsibleParties: ConfigOption[]
  workParties: WorkPartiesConfig
  postcodes: ConfigOption[]
}

export interface InspectionMeta {
  inspector: string
  location: string
  gps?: string
  gpsCapturedAt?: string
  gpsAccuracyMeters?: number
  handoverDecision?: 'BLOCK' | 'REQUEST_FIX' | 'APPROVE'
  handoverDecisionNote?: string
  handoverDecidedAt?: string
}

export interface InspectionRecord {
  id: string
  createdAt: string
  updatedAt: string
  data: Record<string, any>
  meta: InspectionMeta
}

export interface SyncItem {
  id: string
  type: string
  status: 'queued' | 'synced' | 'failed'
  createdAt: string
  payload: any
  attempts: number
  lastAttemptAt?: string
  syncedAt?: string
  lastError?: string
  responseCode?: number
}

export interface SyncSettings {
  endpoint: string
  autoSyncOnOnline: boolean
  requestTimeoutMs: number
}

const CONFIG_KEY = 'dn_config_2026_02'
const CONFIG_BACKUP_KEY = 'dn_config_2026_02_backup'
const CONFIG_LEGACY_KEY = 'inspectie-app-config'
const CONFIG_LEGACY_FALLBACK_KEY = 'inspectionConfig'
const INSPECTIONS_KEY = 'dn_inspections_2026_02'
const SYNC_KEY = 'dn_sync_queue_2026_02'
const SYNC_SETTINGS_KEY = 'dn_sync_settings_2026_02'

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  endpoint: '/api/inspecties/sync',
  autoSyncOnOnline: true,
  requestTimeoutMs: 15000
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeConfigOptions = (raw: unknown, fallback: ConfigOption[]) => {
  if (!Array.isArray(raw)) return fallback

  const options = raw
    .filter(
      (item): item is ConfigOption =>
        isObject(item) && typeof item.value === 'string' && typeof item.label === 'string'
    )
    .map((item) => ({ value: item.value, label: item.label }))

  return options.length > 0 ? options : fallback
}

const normalizeConfig = (raw: unknown, defaults: Config): Config => {
  if (!isObject(raw)) return defaults

  const legacyInspectors = Array.isArray(raw.inspecteurs) ? raw.inspecteurs : []
  const rawInspectors = Array.isArray(raw.inspectors) ? raw.inspectors : legacyInspectors

  const inspectors = Array.isArray(rawInspectors)
    ? rawInspectors
        .filter(
          (item): item is { id: string; name: string; phone?: string; assignedPostcodes?: unknown } =>
            isObject(item) && typeof item.id === 'string' && typeof item.name === 'string'
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          phone: typeof item.phone === 'string' ? item.phone : undefined,
          assignedPostcodes: Array.isArray(item.assignedPostcodes)
            ? item.assignedPostcodes.filter((entry): entry is string => typeof entry === 'string')
            : Array.isArray((item as any).assignedPostcodes)
            ? ((item as any).assignedPostcodes as string[])
            : []
        }))
    : defaults.inspectors

  const responsibleParties = normalizeConfigOptions(
    raw.responsibleParties ?? raw.verantwoordelijkePartijen,
    defaults.responsibleParties
  )

  const workPartiesRaw = isObject(raw.workParties) ? raw.workParties : {}
  const workParties: WorkPartiesConfig = {
    aannemers: normalizeConfigOptions(
      workPartiesRaw.aannemers ?? raw.aannemers,
      defaults.workParties.aannemers
    ),
    signalisatiebedrijven: normalizeConfigOptions(
      workPartiesRaw.signalisatiebedrijven ?? raw.signalisatiebedrijven,
      defaults.workParties.signalisatiebedrijven
    ),
    nutsbedrijven: normalizeConfigOptions(
      workPartiesRaw.nutsbedrijven ?? raw.nutsbedrijven ?? raw.nutsmaatschappijen,
      defaults.workParties.nutsbedrijven
    )
  }

  const postcodes = normalizeConfigOptions(raw.postcodes, defaults.postcodes)

  return {
    inspectors:
      inspectors.length > 0
        ? inspectors.map((inspector) => ({
            ...inspector,
            assignedPostcodes: inspector.assignedPostcodes ?? []
          }))
        : defaults.inspectors,
    responsibleParties,
    workParties,
    postcodes
  }
}

const normalizeInspectionMeta = (raw: unknown): InspectionMeta => {
  const meta = isObject(raw) ? raw : {}

  return {
    inspector: typeof meta.inspector === 'string' ? meta.inspector : '',
    location: typeof meta.location === 'string' ? meta.location : '',
    gps: typeof meta.gps === 'string' ? meta.gps : undefined,
    gpsCapturedAt: typeof meta.gpsCapturedAt === 'string' ? meta.gpsCapturedAt : undefined,
    gpsAccuracyMeters: typeof meta.gpsAccuracyMeters === 'number' ? meta.gpsAccuracyMeters : undefined,
    handoverDecision:
      meta.handoverDecision === 'BLOCK' || meta.handoverDecision === 'REQUEST_FIX' || meta.handoverDecision === 'APPROVE'
        ? meta.handoverDecision
        : undefined,
    handoverDecisionNote: typeof meta.handoverDecisionNote === 'string' ? meta.handoverDecisionNote : undefined,
    handoverDecidedAt: typeof meta.handoverDecidedAt === 'string' ? meta.handoverDecidedAt : undefined
  }
}

const normalizeInspectionRecord = (raw: unknown): InspectionRecord | null => {
  if (!isObject(raw)) return null
  if (typeof raw.id !== 'string') return null

  return {
    id: raw.id,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    data: isObject(raw.data) ? (raw.data as Record<string, any>) : {},
    meta: normalizeInspectionMeta(raw.meta)
  }
}

const normalizeSyncItem = (raw: unknown): SyncItem | null => {
  if (!isObject(raw)) return null
  if (typeof raw.id !== 'string' || typeof raw.type !== 'string') return null

  const status = raw.status === 'queued' || raw.status === 'synced' || raw.status === 'failed' ? raw.status : 'queued'

  return {
    id: raw.id,
    type: raw.type,
    status,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    payload: raw.payload,
    attempts: typeof raw.attempts === 'number' && Number.isFinite(raw.attempts) ? raw.attempts : 0,
    lastAttemptAt: typeof raw.lastAttemptAt === 'string' ? raw.lastAttemptAt : undefined,
    syncedAt: typeof raw.syncedAt === 'string' ? raw.syncedAt : undefined,
    lastError: typeof raw.lastError === 'string' ? raw.lastError : undefined,
    responseCode: typeof raw.responseCode === 'number' ? raw.responseCode : undefined
  }
}

export const loadConfig = (defaults: Config): Config => {
  const keys = [CONFIG_KEY, CONFIG_BACKUP_KEY, CONFIG_LEGACY_KEY, CONFIG_LEGACY_FALLBACK_KEY]

  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        return normalizeConfig(JSON.parse(saved), defaults)
      }
    } catch (error) {
      console.warn(`Config load failed from key ${key}:`, error)
    }
  }

  return defaults
}

export const saveConfig = (config: Config) => {
  const serialized = JSON.stringify(config)
  localStorage.setItem(CONFIG_KEY, serialized)
  localStorage.setItem(CONFIG_BACKUP_KEY, serialized)
  localStorage.setItem(CONFIG_LEGACY_KEY, serialized)
}

export const loadInspections = (): InspectionRecord[] => {
  try {
    const saved = localStorage.getItem(INSPECTIONS_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => normalizeInspectionRecord(item))
      .filter((item): item is InspectionRecord => item !== null)
  } catch (error) {
    console.warn('Inspection load failed:', error)
  }
  return []
}

export const saveInspections = (records: InspectionRecord[]) => {
  localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(records))
}

export const loadSyncQueue = (): SyncItem[] => {
  try {
    const saved = localStorage.getItem(SYNC_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed.map((item) => normalizeSyncItem(item)).filter((item): item is SyncItem => item !== null)
  } catch (error) {
    console.warn('Sync queue load failed:', error)
  }
  return []
}

export const saveSyncQueue = (items: SyncItem[]) => {
  localStorage.setItem(SYNC_KEY, JSON.stringify(items))
}

export const loadSyncSettings = (defaults: SyncSettings = DEFAULT_SYNC_SETTINGS): SyncSettings => {
  try {
    const saved = localStorage.getItem(SYNC_SETTINGS_KEY)
    if (!saved) return defaults

    const parsed = JSON.parse(saved)
    if (!isObject(parsed)) return defaults

    return {
      endpoint: typeof parsed.endpoint === 'string' && parsed.endpoint.trim() ? parsed.endpoint : defaults.endpoint,
      autoSyncOnOnline:
        typeof parsed.autoSyncOnOnline === 'boolean' ? parsed.autoSyncOnOnline : defaults.autoSyncOnOnline,
      requestTimeoutMs:
        typeof parsed.requestTimeoutMs === 'number' && parsed.requestTimeoutMs >= 1000
          ? parsed.requestTimeoutMs
          : defaults.requestTimeoutMs
    }
  } catch (error) {
    console.warn('Sync settings load failed:', error)
  }

  return defaults
}

export const saveSyncSettings = (settings: SyncSettings) => {
  localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings))
}

const buildDedupeSignature = (type: string, payload: any) => {
  if (typeof payload?.syncDedupeKey === 'string' && payload.syncDedupeKey) {
    return `${type}::${payload.syncDedupeKey}`
  }

  if (typeof payload?.evidenceId === 'string' && payload.evidenceId) {
    const inspectionId = typeof payload?.inspectionId === 'string' ? payload.inspectionId : ''
    return `${type}::${inspectionId}::${payload.evidenceId}`
  }

  const entityId =
    type === 'inspection_saved' && typeof payload?.inspectionId === 'string'
      ? payload.inspectionId
      : typeof payload?.id === 'string'
      ? payload.id
      : ''

  return `${type}::${entityId}`
}

export const enqueueSync = (item: Omit<SyncItem, 'id' | 'createdAt' | 'status' | 'attempts'>): SyncItem[] => {
  const queue = loadSyncQueue()

  const dedupeSignature = buildDedupeSignature(item.type, item.payload)
  const isPendingDuplicate = (entry: SyncItem) => {
    if (entry.status === 'synced') return false
    return buildDedupeSignature(entry.type, entry.payload) === dedupeSignature
  }

  const hasPendingDuplicate = queue.some((entry) => isPendingDuplicate(entry))

  if (hasPendingDuplicate && dedupeSignature !== `${item.type}::`) {
    if (item.type === 'inspection_saved') {
      const updatedQueue: SyncItem[] = queue.map((entry) => {
        if (!isPendingDuplicate(entry)) return entry

        return {
          ...entry,
          status: 'queued' as const,
          payload: item.payload,
          lastError: undefined,
          syncedAt: undefined,
          responseCode: undefined
        }
      })
      saveSyncQueue(updatedQueue)
      return updatedQueue
    }

    return queue
  }

  const entry: SyncItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'queued',
    attempts: 0,
    ...item
  }

  const updated = [entry, ...queue]
  saveSyncQueue(updated)
  return updated
}
