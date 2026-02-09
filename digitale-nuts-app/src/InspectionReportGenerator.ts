import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { getFieldPhotoKey, readFieldPhotos } from './lib/photos'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface InspectionData {
  [key: string]: string | boolean | string[]
}

export interface ResponsibleParty {
  nokValue: string
  party: string
}

export interface InspectionItemData {
  value?: string | boolean
  type?: string
  multiSelectValues?: string[]
  responsibleParties?: ResponsibleParty[]
}

export interface ReportData {
  inspectionDate: string
  inspectionTime: string
  location: string
  inspector: string
  gpsCoordinates?: string
  gipodLink?: string
  inspectionData: InspectionData
  detailedInspectionData?: { [key: string]: InspectionItemData }
  inspectionSections: Array<{
    title: string
    icon: string
    items: Array<{
      key: string
      label: string
      type: string
      required: boolean
      options?: Array<{ value: string; label: string }>
    }>
  }>
}

interface ReportRow {
  section: string
  item: string
  value: string
  status: 'OK' | 'NOK' | 'INGEVULD' | 'LEEG'
  responsible: string
  photos: number
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
  if (typeof value === 'boolean') return [value ? 'Ja' : 'Nee']
  return [String(value).trim()]
}

export class InspectionReportGenerator {
  private doc: jsPDF

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
  }

  private buildRows(reportData: ReportData): ReportRow[] {
    const rows: ReportRow[] = []

    reportData.inspectionSections.forEach((section) => {
      section.items.forEach((item) => {
        const rawValue = reportData.inspectionData[item.key]
        const entries = toValueEntries(rawValue)
        const photos = readFieldPhotos(reportData.inspectionData[getFieldPhotoKey(item.key)]).length

        if (entries.length === 0) {
          rows.push({
            section: section.title,
            item: item.label,
            value: '-',
            status: 'LEEG',
            responsible: '',
            photos
          })
          return
        }

        entries.forEach((entry) => {
          const status: ReportRow['status'] = isNok(entry) ? 'NOK' : isOk(entry) ? 'OK' : 'INGEVULD'
          const responsible = Array.isArray(rawValue)
            ? String(reportData.inspectionData[`${item.key}__responsible__${entry}`] || '')
            : String(reportData.inspectionData[`${item.key}__responsible`] || '')

          rows.push({
            section: section.title,
            item: item.label,
            value: entry,
            status,
            responsible,
            photos
          })
        })
      })
    })

    return rows
  }

  public generateReport(reportData: ReportData): void {
    try {
      const rows = this.buildRows(reportData)
      const nokRows = rows.filter((row) => row.status === 'NOK')

      this.doc.setFontSize(18)
      this.doc.text('STAD ANTWERPEN - INSPECTIE RAPPORT', 14, 18)

      this.doc.setFontSize(11)
      this.doc.text(`Datum: ${reportData.inspectionDate}`, 14, 28)
      this.doc.text(`Tijd: ${reportData.inspectionTime}`, 14, 34)
      this.doc.text(`Locatie: ${reportData.location || '-'}`, 14, 40)
      this.doc.text(`Inspecteur: ${reportData.inspector || '-'}`, 14, 46)
      this.doc.text(`GPS: ${reportData.gpsCoordinates || '-'}`, 14, 52)
      this.doc.text(`GIPOD: ${reportData.gipodLink || '-'}`, 14, 58)

      let cursorY = 66

      if (nokRows.length > 0) {
        this.doc.setFontSize(13)
        this.doc.text('NOK actiepunten', 14, cursorY)
        cursorY += 4

        ;(this.doc as any).autoTable({
          startY: cursorY,
          head: [['Sectie', 'Item', 'NOK', 'Verantwoordelijke', 'Foto\'s']],
          body: nokRows.map((row) => [
            row.section,
            row.item,
            row.value,
            row.responsible || 'Niet toegewezen',
            row.photos
          ]),
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2.4 },
          headStyles: { fillColor: [175, 39, 47], textColor: 255 },
          margin: { left: 14, right: 14 }
        })

        const tableEnd = (this.doc as any).lastAutoTable?.finalY
        cursorY = typeof tableEnd === 'number' ? tableEnd + 10 : cursorY + 10
      }

      this.doc.setFontSize(13)
      this.doc.text('Volledige inspectiegegevens', 14, cursorY)
      cursorY += 4

      ;(this.doc as any).autoTable({
        startY: cursorY,
        head: [['Sectie', 'Veld', 'Waarde', 'Status', 'Verantwoordelijke', 'Foto\'s']],
        body: rows.map((row) => [row.section, row.item, row.value, row.status, row.responsible, row.photos]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 38 },
          2: { cellWidth: 47 },
          3: { cellWidth: 18 },
          4: { cellWidth: 32 },
          5: { cellWidth: 12 }
        }
      })

      const totalFields = reportData.inspectionSections.reduce((sum, section) => sum + section.items.length, 0)
      const filledFields = rows.filter((row) => row.status !== 'LEEG').length
      const nokWithoutResponsible = nokRows.filter((row) => !row.responsible).length
      const totalPhotos = rows.reduce((sum, row) => sum + row.photos, 0)

      const summaryStart = ((this.doc as any).lastAutoTable?.finalY || 230) + 8
      const needsNewPage = summaryStart > 270
      if (needsNewPage) {
        this.doc.addPage()
      }

      const summaryY = needsNewPage ? 20 : summaryStart
      this.doc.setFontSize(11)
      this.doc.text(`Samenvatting: ${filledFields}/${totalFields} velden ingevuld`, 14, summaryY)
      this.doc.text(`NOK items: ${nokRows.length}`, 14, summaryY + 6)
      this.doc.text(`NOK zonder verantwoordelijke: ${nokWithoutResponsible}`, 14, summaryY + 12)
      this.doc.text(`Gekoppelde foto's: ${totalPhotos}`, 14, summaryY + 18)

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
      const filename = `Inspectie_Rapport_${timestamp}.pdf`
      this.doc.save(filename)
    } catch (error) {
      console.error('Error in PDF generation:', error)
      throw error
    }
  }
}
