export interface FieldPhotoAttachment {
  id: string
  name: string
  capturedAt: string
  dataUrl: string
}

export interface PhotoStampMetadata {
  gpsCoordinates?: string
  address?: string
  logoUrl?: string
}

export const PHOTO_FIELD_SUFFIX = '__photos'

export const MAX_FIELD_PHOTOS = 4
export const MAX_INSPECTION_PHOTOS = 30

const MAX_IMAGE_DIMENSION = 1280
const JPEG_QUALITY = 0.78
const DEFAULT_LOGO_URL = '/antwerpen-logo.svg'

let cachedDefaultLogoPromise: Promise<HTMLImageElement | null> | null = null

export const getFieldPhotoKey = (fieldKey: string) => `${fieldKey}${PHOTO_FIELD_SUFFIX}`

const isPhotoAttachment = (value: unknown): value is FieldPhotoAttachment => {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Partial<FieldPhotoAttachment>

  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.capturedAt === 'string' &&
    typeof item.dataUrl === 'string' &&
    item.dataUrl.startsWith('data:image')
  )
}

export const readFieldPhotos = (value: unknown): FieldPhotoAttachment[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is FieldPhotoAttachment => isPhotoAttachment(item))
}

export const countInspectionPhotos = (data: Record<string, any>) => {
  return Object.keys(data)
    .filter((key) => key.endsWith(PHOTO_FIELD_SUFFIX))
    .reduce((sum, key) => sum + readFieldPhotos(data[key]).length, 0)
}

export const buildPhotoAttachment = (fileName: string, dataUrl: string): FieldPhotoAttachment => ({
  id: crypto.randomUUID(),
  name: fileName,
  capturedAt: new Date().toISOString(),
  dataUrl
})

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Afbeelding ${file.name} kon niet worden geladen.`))
    }

    image.src = url
  })

const loadImageFromUrl = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })

const loadLogoImage = (url: string) => {
  if (url !== DEFAULT_LOGO_URL) {
    return loadImageFromUrl(url)
  }

  if (!cachedDefaultLogoPromise) {
    cachedDefaultLogoPromise = loadImageFromUrl(DEFAULT_LOGO_URL)
  }

  return cachedDefaultLogoPromise
}

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2))

  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = words[index]
    }
  }

  lines.push(current)
  return lines
}

const drawMetadataStamp = async (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  metadata?: PhotoStampMetadata
) => {
  const gpsLine = `GPS: ${(metadata?.gpsCoordinates || 'onbekend').trim() || 'onbekend'}`
  const address = (metadata?.address || 'adres onbekend').trim() || 'adres onbekend'

  const shortestSide = Math.max(1, Math.min(width, height))
  const margin = Math.max(10, Math.round(shortestSide * 0.02))
  const padding = Math.max(10, Math.round(shortestSide * 0.018))
  const cornerRadius = Math.max(10, Math.round(shortestSide * 0.02))
  const fontSize = Math.max(12, Math.round(shortestSide * 0.02))
  const lineHeight = Math.round(fontSize * 1.35)
  const maxBlockWidth = Math.min(Math.round(width * 0.62), 520)
  const innerWidth = Math.max(150, maxBlockWidth - padding * 2)

  context.font = `600 ${fontSize}px "Segoe UI", Arial, sans-serif`

  const addressLines = wrapText(context, `Adres: ${address}`, innerWidth)
  const textLines = [gpsLine, ...addressLines]
  const textWidth = textLines.reduce((max, line) => Math.max(max, context.measureText(line).width), 0)

  const logo = await loadLogoImage(metadata?.logoUrl || DEFAULT_LOGO_URL)
  let logoWidth = 0
  let logoHeight = 0

  if (logo && logo.width > 0 && logo.height > 0) {
    const targetLogoHeight = Math.max(24, Math.round(fontSize * 2.5))
    const computedLogoWidth = Math.round((logo.width / logo.height) * targetLogoHeight)
    const maxLogoWidth = innerWidth
    logoWidth = Math.min(computedLogoWidth, maxLogoWidth)
    logoHeight = Math.round(logoWidth * (logo.height / logo.width))
  }

  const contentWidth = Math.max(textWidth, logoWidth)
  const blockWidth = Math.min(maxBlockWidth, Math.max(220, Math.ceil(contentWidth + padding * 2)))
  const logoGap = logoHeight > 0 ? Math.max(8, Math.round(fontSize * 0.5)) : 0
  const textHeight = textLines.length * lineHeight
  const blockHeight = Math.ceil(padding * 2 + logoHeight + logoGap + textHeight)

  const x = width - margin - blockWidth
  const y = height - margin - blockHeight

  context.save()

  drawRoundedRect(context, x, y, blockWidth, blockHeight, cornerRadius)
  context.fillStyle = 'rgba(12, 20, 32, 0.68)'
  context.fill()
  context.strokeStyle = 'rgba(255, 255, 255, 0.32)'
  context.lineWidth = 1
  context.stroke()

  let cursorY = y + padding

  if (logo && logoWidth > 0 && logoHeight > 0) {
    const logoX = x + blockWidth - padding - logoWidth
    context.drawImage(logo, logoX, cursorY, logoWidth, logoHeight)
    cursorY += logoHeight + logoGap
  }

  context.fillStyle = '#ffffff'
  context.font = `600 ${fontSize}px "Segoe UI", Arial, sans-serif`
  context.textBaseline = 'top'

  textLines.forEach((line) => {
    context.fillText(line, x + padding, cursorY)
    cursorY += lineHeight
  })

  context.restore()
}

export const addLocationStampToCanvas = async (
  canvas: HTMLCanvasElement,
  metadata?: PhotoStampMetadata
) => {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas context niet beschikbaar voor foto-stempel.')
  }

  await drawMetadataStamp(context, canvas.width, canvas.height, metadata)
}

export const compressImageFileToDataUrl = async (
  file: File,
  metadata?: PhotoStampMetadata
): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is geen afbeelding.`)
  }

  const image = await loadImageFromFile(file)

  const longest = Math.max(image.width, image.height)
  const scale = longest > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longest : 1

  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas context niet beschikbaar voor afbeeldingscompressie.')
  }

  context.drawImage(image, 0, 0, width, height)
  await drawMetadataStamp(context, width, height, metadata)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}
