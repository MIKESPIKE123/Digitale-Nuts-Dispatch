import { SyncItem, SyncSettings } from './storage'

export interface SyncRunResult {
  updatedQueue: SyncItem[]
  processedCount: number
  syncedCount: number
  failedCount: number
  offline: boolean
  message: string
}

const isOnline = () => {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

const postWithTimeout = async (url: string, body: any, timeoutMs: number) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const runSyncBatch = async (
  queue: SyncItem[],
  settings: SyncSettings,
  options: { deviceId: string }
): Promise<SyncRunResult> => {
  const endpoint = settings.endpoint.trim()
  if (!endpoint) {
    return {
      updatedQueue: queue,
      processedCount: 0,
      syncedCount: 0,
      failedCount: 0,
      offline: false,
      message: 'Sync endpoint ontbreekt in configuratie.'
    }
  }

  if (!isOnline()) {
    return {
      updatedQueue: queue,
      processedCount: 0,
      syncedCount: 0,
      failedCount: 0,
      offline: true,
      message: 'Geen internetverbinding. Items blijven in wachtrij.'
    }
  }

  let processedCount = 0
  let syncedCount = 0
  let failedCount = 0

  const updatedQueue: SyncItem[] = []

  for (const item of queue) {
    if (item.status === 'synced') {
      updatedQueue.push(item)
      continue
    }

    processedCount += 1

    const attemptTs = new Date().toISOString()

    try {
      const response = await postWithTimeout(
        endpoint,
        {
          itemId: item.id,
          itemType: item.type,
          createdAt: item.createdAt,
          payload: item.payload,
          deviceId: options.deviceId,
          attempts: item.attempts + 1
        },
        settings.requestTimeoutMs
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      syncedCount += 1

      updatedQueue.push({
        ...item,
        status: 'synced',
        attempts: item.attempts + 1,
        lastAttemptAt: attemptTs,
        syncedAt: attemptTs,
        lastError: undefined,
        responseCode: response.status
      })
    } catch (error) {
      failedCount += 1

      const message = error instanceof Error ? error.message : 'Onbekende sync fout'

      updatedQueue.push({
        ...item,
        status: 'failed',
        attempts: item.attempts + 1,
        lastAttemptAt: attemptTs,
        lastError: message
      })
    }
  }

  const message =
    processedCount === 0
      ? 'Geen te syncen items in wachtrij.'
      : `Sync klaar: ${syncedCount} geslaagd, ${failedCount} mislukt.`

  return {
    updatedQueue,
    processedCount,
    syncedCount,
    failedCount,
    offline: false,
    message
  }
}
