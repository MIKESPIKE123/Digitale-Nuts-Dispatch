export interface ReverseGeocodeAddress {
  displayName: string
  street?: string
  houseNumber?: string
  streetLine?: string
  postcode?: string
  city?: string
  country?: string
  rawAddress: Record<string, string>
}

export const STADHUIS_ANTWERPEN_COORDS = {
  lat: 51.221127,
  lng: 4.399708,
  label: 'Stadhuis Antwerpen, Grote Markt 1, 2000 Antwerpen'
}

const CACHE_KEY = 'dn_reverse_geocode_cache_2026_02'
const MAX_CACHE_ITEMS = 100
const REQUEST_INTERVAL_MS = 1100

let inMemoryCache: Record<string, ReverseGeocodeAddress> | null = null
let lastRequestTs = 0

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const coordKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`

const toStreet = (address: Record<string, string>) =>
  address.road ||
  address.pedestrian ||
  address.cycleway ||
  address.path ||
  address.footway ||
  address.residential ||
  address.neighbourhood ||
  ''

const toCity = (address: Record<string, string>) =>
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  address.county ||
  ''

const loadCache = (): Record<string, ReverseGeocodeAddress> => {
  if (inMemoryCache) return inMemoryCache

  try {
    const saved = localStorage.getItem(CACHE_KEY)
    if (!saved) {
      const empty: Record<string, ReverseGeocodeAddress> = {}
      inMemoryCache = empty
      return empty
    }

    const parsed = JSON.parse(saved)
    const normalized: Record<string, ReverseGeocodeAddress> =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, ReverseGeocodeAddress>)
        : {}
    inMemoryCache = normalized
    return normalized
  } catch {
    const empty: Record<string, ReverseGeocodeAddress> = {}
    inMemoryCache = empty
    return empty
  }
}

const saveCache = (cache: Record<string, ReverseGeocodeAddress>) => {
  const keys = Object.keys(cache)
  if (keys.length > MAX_CACHE_ITEMS) {
    const keepKeys = keys.slice(keys.length - MAX_CACHE_ITEMS)
    const trimmed: Record<string, ReverseGeocodeAddress> = {}
    keepKeys.forEach((key) => {
      trimmed[key] = cache[key]
    })
    inMemoryCache = trimmed
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
    return
  }

  inMemoryCache = cache
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

const buildStreetLine = (street: string, houseNumber?: string) => {
  if (!street && !houseNumber) return ''
  if (!houseNumber) return street
  if (!street) return houseNumber
  return `${street} ${houseNumber}`
}

const parseReverseResponse = (payload: any): ReverseGeocodeAddress | null => {
  if (!payload || typeof payload !== 'object') return null
  if (typeof payload.display_name !== 'string' || !payload.display_name.trim()) return null

  const rawAddress =
    payload.address && typeof payload.address === 'object'
      ? Object.fromEntries(
          Object.entries(payload.address)
            .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
            .map(([key, value]) => [key, value])
        )
      : {}

  const street = toStreet(rawAddress)
  const houseNumber = rawAddress.house_number
  const city = toCity(rawAddress)
  const postcode = rawAddress.postcode
  const country = rawAddress.country

  return {
    displayName: payload.display_name,
    street: street || undefined,
    houseNumber: houseNumber || undefined,
    streetLine: buildStreetLine(street, houseNumber) || undefined,
    postcode: postcode || undefined,
    city: city || undefined,
    country: country || undefined,
    rawAddress
  }
}

export const reverseGeocodeFromCoordinates = async (
  lat: number,
  lng: number
): Promise<ReverseGeocodeAddress | null> => {
  const key = coordKey(lat, lng)
  const cache = loadCache()

  if (cache[key]) {
    return cache[key]
  }

  const now = Date.now()
  const waitMs = REQUEST_INTERVAL_MS - (now - lastRequestTs)
  if (waitMs > 0) {
    await sleep(waitMs)
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/reverse')
  endpoint.searchParams.set('format', 'jsonv2')
  endpoint.searchParams.set('lat', String(lat))
  endpoint.searchParams.set('lon', String(lng))
  endpoint.searchParams.set('addressdetails', '1')
  endpoint.searchParams.set('accept-language', 'nl')
  endpoint.searchParams.set('zoom', '18')

  lastRequestTs = Date.now()

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Adres lookup mislukt (HTTP ${response.status}).`)
  }

  const payload = await response.json()
  const parsed = parseReverseResponse(payload)
  if (!parsed) return null

  const nextCache = { ...cache, [key]: parsed }
  saveCache(nextCache)

  return parsed
}
