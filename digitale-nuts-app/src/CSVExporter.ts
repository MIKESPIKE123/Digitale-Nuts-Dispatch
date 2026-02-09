// CSV export functionaliteit voor inspectie data

import { getFieldPhotoKey, readFieldPhotos } from './lib/photos'

export interface CSVExportData {
  inspectionData: { [key: string]: any }
  inspectionSections: Array<{
    title: string
    icon: string
    items: Array<{
      key: string
      label: string
      type: string
      required: boolean
      options?: Array<{ value: string; label: string; isNOK?: boolean }>
    }>
  }>
  metadata: {
    inspectionDate: string
    inspectionTime: string
    location: string
    inspector: string
    gpsCoordinates?: string
    gipodLink?: string
  }
}

const escapeCsv = (value: unknown) => {
  const text =
    value === null || value === undefined
      ? ''
      : Array.isArray(value)
      ? value.map((entry) => String(entry)).join(' | ')
      : String(value)

  const sanitized = text.replace(/\r?\n/g, ' ').replace(/"/g, '""')
  return `"${sanitized}"`
}

const isNok = (value: string) => value.trim().toUpperCase().startsWith('NOK')
const isOk = (value: string) => value.trim().toUpperCase().startsWith('OK')

const toValueEntries = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0)
  }
  return [String(value).trim()]
}

const triggerDownload = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const generateCSVExport = (data: CSVExportData): void => {
  try {
    const csvRows: string[] = []

    csvRows.push('# STAD ANTWERPEN - INSPECTIE DATA EXPORT')
    csvRows.push(`# Gegenereerd op: ${new Date().toLocaleString('nl-BE')}`)
    csvRows.push(`# Inspectie datum: ${data.metadata.inspectionDate}`)
    csvRows.push(`# Inspectie tijd: ${data.metadata.inspectionTime}`)
    csvRows.push(`# Locatie: ${data.metadata.location}`)
    csvRows.push(`# Inspecteur: ${data.metadata.inspector}`)
    if (data.metadata.gpsCoordinates) {
      csvRows.push(`# GPS coördinaten: ${data.metadata.gpsCoordinates}`)
    }
    if (data.metadata.gipodLink) {
      csvRows.push(`# GIPOD link: ${data.metadata.gipodLink}`)
    }
    csvRows.push('')

    const headers = [
      'Sectie',
      'Veld_Key',
      'Veld_Label',
      'Veld_Type',
      'Verplicht',
      'Waarde',
      'Status',
      'Verantwoordelijke',
      'Fotos_Aantal',
      'Actie_Nodig'
    ]
    csvRows.push(headers.map((header) => escapeCsv(header)).join(';'))

    let totalFields = 0
    let filledFields = 0
    let nokEntries = 0
    let okEntries = 0
    let unresolvedNokResponsible = 0
    let totalPhotos = 0

    data.inspectionSections.forEach((section) => {
      section.items.forEach((item) => {
        totalFields += 1

        const rawValue = data.inspectionData[item.key]
        const entries = toValueEntries(rawValue)
        const photoCount = readFieldPhotos(data.inspectionData[getFieldPhotoKey(item.key)]).length
        totalPhotos += photoCount

        if (entries.length > 0) {
          filledFields += 1
        }

        if (entries.length === 0) {
          const row = [
            section.title,
            item.key,
            item.label,
            item.type,
            item.required ? 'Ja' : 'Nee',
            '',
            'N.v.t.',
            '',
            String(photoCount),
            item.required ? 'Verplicht veld nog leeg' : ''
          ]
          csvRows.push(row.map((cell) => escapeCsv(cell)).join(';'))
          return
        }

        entries.forEach((entry) => {
          const status = isNok(entry) ? 'NOK' : isOk(entry) ? 'OK' : 'Ingevuld'
          const responsible = Array.isArray(rawValue)
            ? data.inspectionData[`${item.key}__responsible__${entry}`]
            : data.inspectionData[`${item.key}__responsible`]

          const actionNeeded =
            status === 'NOK'
              ? responsible
                ? 'Opvolging vereist'
                : 'NOK zonder verantwoordelijke'
              : ''

          if (status === 'NOK') {
            nokEntries += 1
            if (!responsible) {
              unresolvedNokResponsible += 1
            }
          }

          if (status === 'OK') {
            okEntries += 1
          }

          const row = [
            section.title,
            item.key,
            item.label,
            item.type,
            item.required ? 'Ja' : 'Nee',
            entry,
            status,
            responsible || '',
            String(photoCount),
            actionNeeded
          ]

          csvRows.push(row.map((cell) => escapeCsv(cell)).join(';'))
        })
      })
    })

    csvRows.push('')
    csvRows.push('# SAMENVATTING')
    csvRows.push(`# Totaal velden: ${totalFields}`)
    csvRows.push(`# Ingevulde velden: ${filledFields}`)
    csvRows.push(`# Lege velden: ${totalFields - filledFields}`)
    csvRows.push(`# OK entries: ${okEntries}`)
    csvRows.push(`# NOK entries: ${nokEntries}`)
    csvRows.push(`# NOK zonder verantwoordelijke: ${unresolvedNokResponsible}`)
    csvRows.push(`# Totaal gekoppelde foto's: ${totalPhotos}`)
    csvRows.push(`# Volledigheid: ${Math.round((filledFields / Math.max(totalFields, 1)) * 100)}%`)

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
    const locationSlug = data.metadata.location.replace(/[^a-zA-Z0-9]/g, '_') || 'onbekende_locatie'
    const filename = `Inspectie_Export_${locationSlug}_${timestamp}.csv`

    triggerDownload(filename, csvRows.join('\n'))
  } catch (error) {
    console.error('Error generating CSV export:', error)
    alert('Fout bij CSV export generatie. Controleer browser console voor details.')
  }
}

export const generateSimpleCSVOverview = (
  inspectionData: { [key: string]: any },
  inspectionSections: Array<{
    title: string
    icon: string
    items: Array<{
      key: string
      label: string
      type: string
      required: boolean
      options?: Array<{ value: string; label: string; isNOK?: boolean }>
    }>
  }>
): void => {
  const rows = ['Sectie;Veld;Waarde;Status;Verantwoordelijke;Fotos_Aantal']

  inspectionSections.forEach((section) => {
    section.items.forEach((item) => {
      const rawValue = inspectionData[item.key]
      const entries = toValueEntries(rawValue)
      const photoCount = readFieldPhotos(inspectionData[getFieldPhotoKey(item.key)]).length

      if (entries.length === 0) {
        rows.push([
          escapeCsv(section.title),
          escapeCsv(item.label),
          escapeCsv('N.v.t.'),
          escapeCsv('Leeg'),
          escapeCsv(''),
          escapeCsv(photoCount)
        ].join(';'))
        return
      }

      entries.forEach((entry) => {
        const status = isNok(entry) ? 'NOK' : isOk(entry) ? 'OK' : 'Ingevuld'
        const responsible = Array.isArray(rawValue)
          ? inspectionData[`${item.key}__responsible__${entry}`]
          : inspectionData[`${item.key}__responsible`]

        rows.push(
          [
            escapeCsv(section.title),
            escapeCsv(item.label),
            escapeCsv(entry),
            escapeCsv(status),
            escapeCsv(responsible || ''),
            escapeCsv(photoCount)
          ].join(';')
        )
      })
    })
  })

  const filename = `Inspectie_Overzicht_${new Date().toISOString().slice(0, 10)}.csv`
  triggerDownload(filename, rows.join('\n'))
}
