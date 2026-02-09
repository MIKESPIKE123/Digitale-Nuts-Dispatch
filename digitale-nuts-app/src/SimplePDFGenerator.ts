// Eenvoudige PDF fallback met browser print functionaliteit

import { getFieldPhotoKey, readFieldPhotos } from './lib/photos'

interface SimpleSectionItem {
  key: string
  label: string
}

interface SimpleSection {
  title: string
  icon?: string
  items: SimpleSectionItem[]
}

interface SimpleReportMetadata {
  inspectionDate?: string
  inspectionTime?: string
  inspector?: string
  location?: string
  gpsCoordinates?: string
  gipodLink?: string
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isNok = (value: string) => value.trim().toUpperCase().startsWith('NOK')

const toEntries = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') return []
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter((entry) => entry)
  }
  if (typeof value === 'boolean') return [value ? 'Ja' : 'Nee']
  return [String(value).trim()]
}

export const generateSimplePDFReport = (
  inspectionData: Record<string, unknown>,
  inspectionSections: SimpleSection[],
  metadata?: SimpleReportMetadata
) => {
  const printWindow = window.open('', '_blank', 'width=1000,height=800')

  if (!printWindow) {
    alert('Pop-up blocker voorkomt PDF generatie. Sta pop-ups toe voor deze site.')
    return
  }

  const sectionsHtml = inspectionSections
    .map((section) => {
      const itemsHtml = section.items
        .map((item) => {
          const rawValue = inspectionData[item.key]
          const entries = toEntries(rawValue)
          const photoCount = readFieldPhotos(inspectionData[getFieldPhotoKey(item.key)]).length

          if (entries.length === 0) {
            return `<div class="item"><strong>${escapeHtml(item.label)}:</strong> N.v.t. <span class="photo-count">Foto's: ${photoCount}</span></div>`
          }

          const entryRows = entries
            .map((entry) => {
              const responsible = Array.isArray(rawValue)
                ? inspectionData[`${item.key}__responsible__${entry}`]
                : inspectionData[`${item.key}__responsible`]

              return `<div class="value-row">
                <span>${escapeHtml(entry)}</span>
                ${
                  isNok(entry) && responsible
                    ? `<span class="responsible">Verantwoordelijke: ${escapeHtml(responsible)}</span>`
                    : ''
                }
              </div>`
            })
            .join('')

          return `<div class="item">
            <strong>${escapeHtml(item.label)}:</strong>
            <span class="photo-count">Foto's: ${photoCount}</span>
            ${entryRows}
          </div>`
        })
        .join('')

      return `<div class="section">
        <div class="section-header">${escapeHtml(section.icon || '')} ${escapeHtml(section.title)}</div>
        <div class="section-content">${itemsHtml}</div>
      </div>`
    })
    .join('')

  const reportHTML = `<!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <title>Inspectie Rapport - Stad Antwerpen</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #0f1d2a; }
        .header { background: #0057b7; color: white; padding: 20px; margin-bottom: 20px; border-radius: 10px; }
        .section { margin-bottom: 16px; border: 1px solid #d9e5f0; border-radius: 8px; overflow: hidden; }
        .section-header { background: #edf3fa; padding: 10px 12px; font-weight: bold; }
        .section-content { padding: 12px; }
        .item { margin: 0 0 10px 0; }
        .value-row { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 10px; }
        .responsible { color: #af272f; font-weight: 600; }
        .photo-count { color: #4f5e6d; font-size: 12px; margin-left: 8px; }
        .controls { text-align: center; margin-top: 20px; }
        button { border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 15px; }
        .print-btn { background: #0057b7; color: white; }
        .close-btn { background: #6c757d; color: white; margin-left: 10px; }
        @media print { .controls { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Stad Antwerpen - Inspectie Rapport</h1>
        <p>Gegenereerd: ${escapeHtml(new Date().toLocaleString('nl-BE'))}</p>
        ${metadata?.inspectionDate ? `<p>Datum: ${escapeHtml(metadata.inspectionDate)}</p>` : ''}
        ${metadata?.inspectionTime ? `<p>Tijd: ${escapeHtml(metadata.inspectionTime)}</p>` : ''}
        ${metadata?.inspector ? `<p>Inspecteur: ${escapeHtml(metadata.inspector)}</p>` : ''}
        ${metadata?.location ? `<p>Locatie: ${escapeHtml(metadata.location)}</p>` : ''}
        ${metadata?.gpsCoordinates ? `<p>GPS: ${escapeHtml(metadata.gpsCoordinates)}</p>` : ''}
        ${
          metadata?.gipodLink
            ? `<p>GIPOD: <a href="${escapeHtml(metadata.gipodLink)}" target="_blank" rel="noreferrer">${escapeHtml(metadata.gipodLink)}</a></p>`
            : ''
        }
      </div>

      ${sectionsHtml}

      <div class="controls">
        <button class="print-btn" onclick="window.print()">Print / PDF opslaan</button>
        <button class="close-btn" onclick="window.close()">Sluiten</button>
      </div>
    </body>
    </html>`

  printWindow.document.write(reportHTML)
  printWindow.document.close()
  printWindow.focus()
}
