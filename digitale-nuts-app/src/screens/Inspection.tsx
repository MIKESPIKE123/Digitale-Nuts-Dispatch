import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ParsedSchema, Field } from '../lib/schema'
import { Config, InspectionRecord } from '../lib/storage'
import { collectNokFindings, buildDetailedData } from '../lib/analysis'
import { validateInspectionRecord } from '../lib/validation'
import { getWorkPartyGroupForField } from '../lib/workParties'
import {
  reverseGeocodeFromCoordinates,
  STADHUIS_ANTWERPEN_COORDS
} from '../lib/geocoding'
import {
  buildPhotoAttachment,
  compressImageFileToDataUrl,
  countInspectionPhotos,
  getFieldPhotoKey,
  MAX_FIELD_PHOTOS,
  MAX_INSPECTION_PHOTOS,
  readFieldPhotos
} from '../lib/photos'
import { InspectionReportGenerator } from '../InspectionReportGenerator'
import { generateCSVExport, generateSimpleCSVOverview } from '../CSVExporter'
import { generateSimplePDFReport } from '../SimplePDFGenerator'
import GPSMap from '../GPSMap'

interface InspectionProps {
  schema: ParsedSchema
  inspection: InspectionRecord | null
  config: Config
  onUpdate: (data: Record<string, any>, metaUpdates?: Partial<InspectionRecord['meta']>) => void
  onQueueSync: (type: string, payload: any) => void
}

const isNokValue = (value: unknown) =>
  typeof value === 'string' && value.trim().toUpperCase().startsWith('NOK')

const formatGps = (lat: number, lng: number) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`

const parseGps = (value?: string): [number, number] | null => {
  if (!value) return null
  const [latRaw, lngRaw] = value.split(',').map((item) => item.trim())
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}

interface BasisFieldKeys {
  postcodeKey?: string
  streetKey?: string
  gpsCodeKey?: string
  gipodKey?: string
}

const findBasisFieldKeys = (schema: ParsedSchema): BasisFieldKeys => {
  const keys: BasisFieldKeys = {}

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const sectionLabel = section.title.toLowerCase()
      const fieldLabel = field.label.toLowerCase()

      if (!keys.postcodeKey && fieldLabel.includes('postcode')) {
        keys.postcodeKey = field.key
      }

      if (!keys.streetKey && fieldLabel.includes('straatnaam')) {
        keys.streetKey = field.key
      }

      if (
        !keys.gpsCodeKey &&
        (fieldLabel.includes('gps code') ||
          (sectionLabel.includes('plaatsbepaling') && fieldLabel.includes('gps')))
      ) {
        keys.gpsCodeKey = field.key
      }

      if (!keys.gipodKey && fieldLabel.includes('gipod')) {
        keys.gipodKey = field.key
      }
    })
  })

  return keys
}

const buildMetaLocation = (input: {
  streetLine?: string
  postcode?: string
  city?: string
  fallbackDisplayName: string
}) => {
  const street = input.streetLine?.trim()
  const cityLine = [input.postcode?.trim(), input.city?.trim()].filter(Boolean).join(' ').trim()

  if (street && cityLine) return `${street}, ${cityLine}`
  if (street) return street
  if (cityLine) return cityLine

  return input.fallbackDisplayName
}

const extractLastEightDigits = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return ''
  return digits.slice(-8)
}

const buildGipodLink = (value: string) => {
  const lastEightDigits = extractLastEightDigits(value)
  if (!lastEightDigits) return ''
  return `https://www.gipod.be/gipod/v1/integration/gipod/${lastEightDigits}`
}

const isValueFilled = (value: unknown) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

const resolveRuntimeField = (sectionTitle: string, field: Field, config: Config): Field => {
  const group = getWorkPartyGroupForField(sectionTitle, field.label)
  if (!group) return field

  const configuredOptions = config.workParties[group].map((item) => ({
    value: item.value,
    label: item.label
  }))

  if (configuredOptions.length === 0) {
    return {
      ...field,
      type: 'input',
      options: []
    }
  }

  return {
    ...field,
    type: 'select',
    options: configuredOptions
  }
}

const renderField = (
  field: Field,
  value: any,
  onChange: (value: any) => void,
  hasError: boolean
) => {
  if (field.type === 'textarea') {
    return (
      <textarea
        className={`dn-input dn-textarea ${hasError ? 'dn-input--danger' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.hint || field.label}
      />
    )
  }

  if (field.type === 'input') {
    return (
      <input
        className={`dn-input ${hasError ? 'dn-input--danger' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.hint || field.label}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        className={`dn-input ${isNokValue(value) || hasError ? 'dn-input--danger' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecteer...</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'multiselect') {
    const selected: string[] = Array.isArray(value) ? value : []
    return (
      <div className="dn-multi">
        {field.options?.map((option) => {
          const checked = selected.includes(option.label)
          return (
            <label key={option.value} className={`dn-multi-item ${option.isNOK ? 'is-nok' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const next = [...selected]
                  if (e.target.checked) {
                    if (option.label === 'OK') {
                      onChange(['OK'])
                      return
                    }
                    const filtered = next.filter((entry) => entry !== 'OK')
                    onChange([...filtered, option.label])
                  } else {
                    onChange(next.filter((entry) => entry !== option.label))
                  }
                }}
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  return null
}

const Inspection: React.FC<InspectionProps> = ({ schema, inspection, config, onUpdate, onQueueSync }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(schema.sections[0]?.id ?? null)
  const [validationTouched, setValidationTouched] = useState(false)
  const [actionError, setActionError] = useState('')
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')
  const [addressBusy, setAddressBusy] = useState(false)
  const [addressStatus, setAddressStatus] = useState('')
  const [photoBusyFieldKey, setPhotoBusyFieldKey] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState('')
  const autoGpsRequestedForInspectionId = useRef<string | null>(null)

  const data = inspection?.data ?? {}
  const meta = inspection?.meta ?? { inspector: '', location: '' }

  const validation = useMemo(
    () => validateInspectionRecord(schema, data, meta),
    [schema, data, meta]
  )

  const issueInputKeys = useMemo(() => new Set(validation.issues.map((issue) => issue.inputKey)), [validation.issues])
  const nokFindings = useMemo(() => collectNokFindings(schema, data), [schema, data])
  const gpsCoordinates = useMemo(() => parseGps(meta.gps), [meta.gps])
  const basisFieldKeys = useMemo(() => findBasisFieldKeys(schema), [schema])
  const gipodRawValue = useMemo(
    () => (basisFieldKeys.gipodKey ? String(data[basisFieldKeys.gipodKey] || '') : ''),
    [basisFieldKeys.gipodKey, data]
  )
  const gipodLink = useMemo(() => buildGipodLink(gipodRawValue), [gipodRawValue])
  const selectedInspector = useMemo(
    () => config.inspectors.find((inspector) => inspector.name === meta.inspector),
    [config.inspectors, meta.inspector]
  )

  const selectedPostcodeValue = useMemo(() => {
    if (!basisFieldKeys.postcodeKey) return ''
    const rawPostcode = data[basisFieldKeys.postcodeKey]
    if (!rawPostcode) return ''

    const value = String(rawPostcode).trim()
    if (!value) return ''

    const exactByValue = config.postcodes.find((option) => option.value === value)
    if (exactByValue) return exactByValue.value

    const exactByLabel = config.postcodes.find((option) => option.label.toLowerCase() === value.toLowerCase())
    if (exactByLabel) return exactByLabel.value

    const extracted = value.match(/\d{4}/)?.[0]
    if (!extracted) return ''

    const byDigits = config.postcodes.find(
      (option) => option.value === extracted || option.label.startsWith(extracted)
    )
    return byDigits?.value || ''
  }, [basisFieldKeys.postcodeKey, config.postcodes, data])

  const inspectorPostcodeMismatch = Boolean(
    selectedInspector &&
      selectedInspector.assignedPostcodes.length > 0 &&
      selectedPostcodeValue &&
      !selectedInspector.assignedPostcodes.includes(selectedPostcodeValue)
  )

  const hasInputError = useCallback(
    (inputKey: string) => validationTouched && issueInputKeys.has(inputKey),
    [issueInputKeys, validationTouched]
  )

  const getSectionProgress = useCallback(
    (section: ParsedSchema['sections'][number]) => {
      const requiredFields = section.items.filter((field) => field.required)
      if (requiredFields.length === 0) return 100

      const completed = requiredFields.filter((field) => isValueFilled(data[field.key])).length
      return Math.round((completed / requiredFields.length) * 100)
    },
    [data]
  )

  const updateFieldValue = (field: Field, value: any) => {
    const next = { ...data, [field.key]: value }
    onUpdate(next)
  }

  const handleResponsibleChange = (key: string, value: string) => {
    onUpdate({ ...data, [key]: value })
  }

  const getPhotosForField = useCallback(
    (fieldKey: string) => readFieldPhotos(data[getFieldPhotoKey(fieldKey)]),
    [data]
  )

  const handleAddPhotosToField = useCallback(
    async (field: Field, files: FileList | null) => {
      if (!inspection || !files || files.length === 0) return

      const sourceData = inspection.data ?? {}
      const photoKey = getFieldPhotoKey(field.key)
      const existingPhotos = readFieldPhotos(sourceData[photoKey])
      const remainingForField = MAX_FIELD_PHOTOS - existingPhotos.length

      if (remainingForField <= 0) {
        setPhotoStatus(`Voor "${field.label}" zijn al ${MAX_FIELD_PHOTOS} foto's gekoppeld.`)
        return
      }

      const totalExisting = countInspectionPhotos(sourceData)
      const remainingForInspection = MAX_INSPECTION_PHOTOS - totalExisting
      if (remainingForInspection <= 0) {
        setPhotoStatus(`Maximaal ${MAX_INSPECTION_PHOTOS} foto's per inspectie bereikt.`)
        return
      }

      const filesToProcess = Array.from(files).slice(0, Math.min(remainingForField, remainingForInspection))
      if (filesToProcess.length === 0) return

      setPhotoBusyFieldKey(field.key)
      setPhotoStatus(`Foto's verwerken voor "${field.label}"...`)

      const createdPhotos = []
      let failedCount = 0

      for (const file of filesToProcess) {
        try {
          const dataUrl = await compressImageFileToDataUrl(file, {
            gpsCoordinates: inspection.meta.gps,
            address: inspection.meta.location
          })
          createdPhotos.push(buildPhotoAttachment(file.name, dataUrl))
        } catch (error) {
          failedCount += 1
          console.warn('Foto kon niet verwerkt worden:', file.name, error)
        }
      }

      if (createdPhotos.length > 0) {
        const nextData = {
          ...sourceData,
          [photoKey]: [...existingPhotos, ...createdPhotos]
        }

        onUpdate(nextData)
        onQueueSync('field_photos_added', {
          inspectionId: inspection.id,
          fieldKey: field.key,
          fieldLabel: field.label,
          addedCount: createdPhotos.length,
          capturedAt: new Date().toISOString()
        })
      }

      const skipped = files.length - filesToProcess.length
      if (createdPhotos.length > 0 && failedCount === 0 && skipped === 0) {
        setPhotoStatus(`${createdPhotos.length} foto('s) toegevoegd bij "${field.label}".`)
      } else {
        setPhotoStatus(
          `${createdPhotos.length} toegevoegd, ${failedCount + skipped} niet verwerkt (limiet/bestand).`
        )
      }

      setPhotoBusyFieldKey(null)
    },
    [inspection, onQueueSync, onUpdate]
  )

  const handleRemovePhotoFromField = useCallback(
    (field: Field, photoId: string) => {
      if (!inspection) return

      const sourceData = inspection.data ?? {}
      const photoKey = getFieldPhotoKey(field.key)
      const existingPhotos = readFieldPhotos(sourceData[photoKey])
      const nextPhotos = existingPhotos.filter((photo) => photo.id !== photoId)
      const nextData = { ...sourceData, [photoKey]: nextPhotos }

      if (nextPhotos.length === 0) {
        delete nextData[photoKey]
      }

      onUpdate(nextData)
      onQueueSync('field_photo_removed', {
        inspectionId: inspection.id,
        fieldKey: field.key,
        fieldLabel: field.label,
        removedPhotoId: photoId,
        removedAt: new Date().toISOString()
      })
      setPhotoStatus(`Foto verwijderd bij "${field.label}".`)
    },
    [inspection, onQueueSync, onUpdate]
  )

  const resolvePostcodeValue = (postcode: string) => {
    const postcodeKey = basisFieldKeys.postcodeKey
    if (!postcodeKey) return postcode

    const postcodeField = schema.index.fieldsByKey[postcodeKey]
    if (!postcodeField?.options || postcodeField.options.length === 0) return postcode

    const lower = postcode.toLowerCase()
    const exact = postcodeField.options.find((option) => option.label.toLowerCase() === lower)
    if (exact) return exact.label

    const startsWith = postcodeField.options.find((option) => option.label.toLowerCase().startsWith(lower))
    if (startsWith) return startsWith.label

    return postcode
  }

  const lookupAddressFromCoordinates = useCallback(
    async (lat: number, lng: number) => {
      if (!inspection) return

      setAddressBusy(true)
      setAddressStatus('Adres opzoeken op basis van GPS...')

      try {
        const result = await reverseGeocodeFromCoordinates(lat, lng)

        if (!result) {
          setAddressStatus('Geen adres gevonden voor deze GPS locatie.')
          return
        }

        const baseData = inspection.data ?? {}
        const nextData = { ...baseData }

        if (basisFieldKeys.streetKey && result.streetLine) {
          nextData[basisFieldKeys.streetKey] = result.streetLine
        }

        if (basisFieldKeys.postcodeKey && result.postcode) {
          nextData[basisFieldKeys.postcodeKey] = resolvePostcodeValue(result.postcode)
        }

        if (basisFieldKeys.gpsCodeKey) {
          nextData[basisFieldKeys.gpsCodeKey] = formatGps(lat, lng)
        }

        const location = buildMetaLocation({
          streetLine: result.streetLine,
          postcode: result.postcode,
          city: result.city,
          fallbackDisplayName: result.displayName
        })

        onUpdate(nextData, { location })
        setAddressStatus(`Adres automatisch ingevuld: ${location}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Adres opzoeken mislukt.'
        setAddressStatus(message)
      } finally {
        setAddressBusy(false)
      }
    },
    [basisFieldKeys, inspection, onUpdate, schema.index.fieldsByKey]
  )

  const applyFallbackGps = useCallback(() => {
    if (!inspection) return

    const { lat, lng, label } = STADHUIS_ANTWERPEN_COORDS
    const gpsValue = formatGps(lat, lng)

    onUpdate(data, {
      gps: gpsValue,
      gpsCapturedAt: new Date().toISOString(),
      gpsAccuracyMeters: undefined
    })

    setGpsStatus(`Automatische GPS niet beschikbaar. Fallback gebruikt: ${label}.`)
    void lookupAddressFromCoordinates(lat, lng)
  }, [inspection, data, onUpdate, lookupAddressFromCoordinates])

  const captureCurrentGps = useCallback(() => {
    if (!inspection) return

    if (!navigator.geolocation) {
      applyFallbackGps()
      return
    }

    setGpsBusy(true)
    setGpsStatus('GPS locatie ophalen...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        onUpdate(data, {
          gps: formatGps(lat, lng),
          gpsCapturedAt: new Date().toISOString(),
          gpsAccuracyMeters: Number.isFinite(position.coords.accuracy)
            ? Math.round(position.coords.accuracy)
            : undefined
        })

        setGpsStatus(
          `GPS vastgelegd (${lat.toFixed(5)}, ${lng.toFixed(5)}) met nauwkeurigheid ±${Math.round(
            position.coords.accuracy
          )}m.`
        )
        setGpsBusy(false)
        void lookupAddressFromCoordinates(lat, lng)
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'GPS toestemming geweigerd.'
            : error.code === error.POSITION_UNAVAILABLE
            ? 'GPS positie momenteel niet beschikbaar.'
            : 'GPS ophalen duurde te lang.'

        setGpsStatus(`${message} Standaardlocatie wordt ingesteld.`)
        setGpsBusy(false)
        applyFallbackGps()
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000
      }
    )
  }, [inspection, onUpdate, data, lookupAddressFromCoordinates, applyFallbackGps])

  useEffect(() => {
    if (!inspection) return
    if (inspection.meta.gps) return
    if (autoGpsRequestedForInspectionId.current === inspection.id) return

    autoGpsRequestedForInspectionId.current = inspection.id
    captureCurrentGps()
  }, [inspection, captureCurrentGps])

  const handleLookupAddressFromCurrentGps = () => {
    if (!inspection) return

    const coords = parseGps(inspection.meta.gps)
    if (!coords) {
      setAddressStatus('Geef eerst geldige GPS coördinaten in (lat, lng).')
      return
    }

    void lookupAddressFromCoordinates(coords[0], coords[1])
  }

  const requireValidInspectionBeforeAction = () => {
    if (validation.isValid) return true

    setValidationTouched(true)
    setActionError(
      `Inspectie nog niet volledig: ${validation.metaIssues} meta-fouten, ${validation.requiredFieldIssues} verplichte velden en ${validation.nokResponsibleIssues} NOK-verantwoordelijke fouten.`
    )

    return false
  }

  const handleExport = (type: 'advanced' | 'simple' | 'csv' | 'csv-simple') => {
    if (!inspection) return
    if (!requireValidInspectionBeforeAction()) return

    setActionError('')

    const reportData = {
      inspectionDate: new Date(inspection.updatedAt).toLocaleDateString('nl-BE'),
      inspectionTime: new Date(inspection.updatedAt).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }),
      location: inspection.meta.location,
      inspector: inspection.meta.inspector,
      gpsCoordinates: inspection.meta.gps,
      gipodLink: gipodLink || undefined,
      inspectionData: data,
      detailedInspectionData: buildDetailedData(schema, data),
      inspectionSections: schema.sections.map((section) => ({
        title: section.title,
        icon: section.icon,
        items: section.items.map((item) => ({
          key: item.key,
          label: item.label,
          type: item.type,
          required: item.required,
          options: item.options?.map((opt) => ({ value: opt.value, label: opt.label }))
        }))
      }))
    }

    if (type === 'advanced') {
      const generator = new InspectionReportGenerator()
      generator.generateReport(reportData as any)
    }
    if (type === 'simple') {
      generateSimplePDFReport(data, reportData.inspectionSections, {
        inspectionDate: reportData.inspectionDate,
        inspectionTime: reportData.inspectionTime,
        inspector: reportData.inspector,
        location: reportData.location,
        gpsCoordinates: reportData.gpsCoordinates,
        gipodLink: reportData.gipodLink
      })
    }
    if (type === 'csv') {
      generateCSVExport({
        inspectionData: data,
        inspectionSections: reportData.inspectionSections,
        metadata: {
          inspectionDate: reportData.inspectionDate,
          inspectionTime: reportData.inspectionTime,
          location: reportData.location,
          inspector: reportData.inspector,
          gpsCoordinates: reportData.gpsCoordinates,
          gipodLink: reportData.gipodLink
        }
      })
    }
    if (type === 'csv-simple') {
      generateSimpleCSVOverview(data, reportData.inspectionSections)
    }
  }

  if (!inspection) {
    return (
      <section className="dn-screen">
        <div className="dn-card">
          <div className="dn-card-title">Geen actieve inspectie</div>
          <p className="dn-muted">Start eerst een nieuwe inspectie vanuit Home of Workboard.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="dn-screen">
      <div className="dn-card">
        <div className="dn-card-title">Inspectie gegevens</div>
        <div className="dn-form-grid">
          <label>
            Inspecteur
            <select
              className={`dn-input ${hasInputError('__meta__inspector') ? 'dn-input--danger' : ''}`}
              value={inspection.meta.inspector || ''}
              onChange={(e) => onUpdate(data, { inspector: e.target.value })}
            >
              <option value="">Selecteer inspecteur</option>
              {config.inspectors.map((inspector) => (
                <option key={inspector.id} value={inspector.name}>
                  {inspector.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Locatie
            <input
              className={`dn-input ${hasInputError('__meta__location') ? 'dn-input--danger' : ''}`}
              value={inspection.meta.location || ''}
              onChange={(e) => onUpdate(data, { location: e.target.value })}
              placeholder="Straat + nr"
            />
          </label>
          <label>
            GPS
            <div className="dn-gps-row">
              <input
                className="dn-input"
                value={inspection.meta.gps || ''}
                onChange={(e) => onUpdate(data, { gps: e.target.value })}
                placeholder="51.219400, 4.402500"
              />
              <button type="button" className="dn-secondary-btn" onClick={captureCurrentGps} disabled={gpsBusy}>
                {gpsBusy ? 'GPS...' : 'Gebruik huidige GPS'}
              </button>
            </div>
          </label>
          {inspection.meta.gps && (
            <button
              type="button"
              className="dn-link-btn"
              onClick={handleLookupAddressFromCurrentGps}
              disabled={addressBusy}
            >
              {addressBusy
                ? 'Adres opzoeken via GPS...'
                : `Klik op GPS-data (${inspection.meta.gps}) om adres op te halen`}
            </button>
          )}
          {gpsStatus && <div className="dn-muted">{gpsStatus}</div>}
          {addressStatus && <div className="dn-muted">{addressStatus}</div>}
          {basisFieldKeys.gipodKey && gipodRawValue && !gipodLink && (
            <div className="dn-error">
              GIPOD nummer bevat onvoldoende cijfers. Minstens 8 cijfers nodig om een geldige link te maken.
            </div>
          )}
          {gipodLink && (
            <a
              href={gipodLink}
              target="_blank"
              rel="noreferrer"
              className="dn-link-btn"
              title="Open GIPOD in nieuw tabblad"
            >
              Open GIPOD dossier: {extractLastEightDigits(gipodRawValue)}
            </a>
          )}
          {inspectorPostcodeMismatch && selectedInspector && (
            <div className="dn-error">
              Postcode ligt buiten toegewezen zone van inspecteur {selectedInspector.name}. Controleer planning of
              herwijs inspecteur.
            </div>
          )}
          {inspection.meta.gpsCapturedAt && (
            <div className="dn-muted">
              Laatste GPS opname: {new Date(inspection.meta.gpsCapturedAt).toLocaleString('nl-BE')}
              {typeof inspection.meta.gpsAccuracyMeters === 'number' &&
                ` (nauwkeurigheid ±${inspection.meta.gpsAccuracyMeters}m)`}
            </div>
          )}
        </div>

        {gpsCoordinates && (
          <div className="dn-map-wrapper">
            <GPSMap
              latitude={gpsCoordinates[0]}
              longitude={gpsCoordinates[1]}
              isCompact
              isDraggable
              onLocationChange={(lat, lng) =>
                onUpdate(data, {
                  gps: formatGps(lat, lng),
                  gpsCapturedAt: new Date().toISOString()
                })
              }
            />
          </div>
        )}
      </div>

      {nokFindings.length > 0 && (
        <div className="dn-card dn-card--warning">
          <div className="dn-card-title">NOK bevindingen ({nokFindings.length})</div>
          <div className="dn-list">
            {nokFindings.slice(0, 5).map((finding, index) => (
              <div key={`${finding.field}-${index}`} className="dn-list-item dn-list-item--warning">
                <div>
                  <div className="dn-list-title">{finding.field}</div>
                  <div className="dn-list-sub">{finding.value}</div>
                  {finding.responsible ? (
                    <div className="dn-list-sub">Verantwoordelijke: {finding.responsible}</div>
                  ) : (
                    <div className="dn-list-sub dn-text-danger">Verantwoordelijke ontbreekt</div>
                  )}
                </div>
                <span className="dn-chip">Actie</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {photoStatus && (
        <div className="dn-card">
          <div className="dn-muted">{photoStatus}</div>
        </div>
      )}

      {schema.sections.map((section) => {
        const sectionProgress = getSectionProgress(section)

        return (
          <div key={section.id} className="dn-card">
            <button
              type="button"
              className="dn-section-header"
              onClick={() => setExpandedSection(section.id === expandedSection ? null : section.id)}
            >
              <div>
                <span className="dn-section-icon">{section.icon}</span>
                <span className="dn-section-title">{section.title}</span>
              </div>
              <div className="dn-section-meta">
                <div className="dn-section-progress-text">{sectionProgress}%</div>
                <div className="dn-section-progress-track">
                  <div
                    className="dn-section-progress-fill"
                    style={{ width: `${sectionProgress}%` }}
                  />
                </div>
                <span className="dn-section-toggle">{section.id === expandedSection ? '▼' : '▶'}</span>
              </div>
            </button>
            {expandedSection === section.id && (
              <div className="dn-section-body">
                {section.items.map((field) => {
                  const runtimeField = resolveRuntimeField(section.title, field, config)
                  const fieldValue = data[field.key]
                  const fieldPhotos = getPhotosForField(field.key)
                  const showResponsible =
                    (typeof fieldValue === 'string' && isNokValue(fieldValue)) ||
                    (Array.isArray(fieldValue) && fieldValue.some((entry) => isNokValue(entry)))

                  return (
                    <div key={field.key} className="dn-field">
                      <div className="dn-field-label">
                        {field.label} {field.required && <span className="dn-required">*</span>}
                      </div>
                      {field.hint && <div className="dn-hint">{field.hint}</div>}
                      {renderField(
                        runtimeField,
                        fieldValue,
                        (value) => updateFieldValue(field, value),
                        hasInputError(field.key)
                      )}
                      {showResponsible && (
                        <div className="dn-responsible">
                          <div className="dn-responsible-label">Verantwoordelijke</div>
                          {Array.isArray(fieldValue) ? (
                            fieldValue
                              .filter((entry: string) => isNokValue(entry))
                              .map((entry: string) => {
                                const inputKey = `${field.key}__responsible__${entry}`
                                return (
                                  <label key={entry} className="dn-responsible-row">
                                    <span>{entry}</span>
                                    <select
                                      className={`dn-input ${hasInputError(inputKey) ? 'dn-input--danger' : ''}`}
                                      value={data[inputKey] || ''}
                                      onChange={(e) => handleResponsibleChange(inputKey, e.target.value)}
                                    >
                                      <option value="">Selecteer partij</option>
                                      {config.responsibleParties.map((party) => (
                                        <option key={party.value} value={party.label}>
                                          {party.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                )
                              })
                          ) : (
                            <select
                              className={`dn-input ${hasInputError(`${field.key}__responsible`) ? 'dn-input--danger' : ''}`}
                              value={data[`${field.key}__responsible`] || ''}
                              onChange={(e) => handleResponsibleChange(`${field.key}__responsible`, e.target.value)}
                            >
                              <option value="">Selecteer partij</option>
                              {config.responsibleParties.map((party) => (
                                <option key={party.value} value={party.label}>
                                  {party.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                      {field.notes && field.notes.length > 0 && (
                        <div className="dn-note">
                          {field.notes.map((note) => (
                            <div key={note}>{note}</div>
                          ))}
                        </div>
                      )}
                      <div className="dn-field-photo-block">
                        <div className="dn-field-photo-header">
                          <span className="dn-field-photo-title">
                            Foto's ({fieldPhotos.length}/{MAX_FIELD_PHOTOS})
                          </span>
                          <label
                            className={`dn-photo-upload-trigger ${
                              fieldPhotos.length >= MAX_FIELD_PHOTOS || photoBusyFieldKey === field.key
                                ? 'is-disabled'
                                : ''
                            }`}
                            htmlFor={`${field.key}-photo-input`}
                          >
                            Foto toevoegen
                          </label>
                          <input
                            id={`${field.key}-photo-input`}
                            className="dn-photo-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            disabled={fieldPhotos.length >= MAX_FIELD_PHOTOS || photoBusyFieldKey === field.key}
                            onChange={(event) => {
                              void handleAddPhotosToField(field, event.target.files)
                              event.currentTarget.value = ''
                            }}
                          />
                        </div>
                        {photoBusyFieldKey === field.key && (
                          <div className="dn-muted">Foto's worden verwerkt...</div>
                        )}
                        {fieldPhotos.length > 0 && (
                          <div className="dn-photo-grid">
                            {fieldPhotos.map((photo) => (
                              <article key={photo.id} className="dn-photo-item">
                                <img src={photo.dataUrl} alt={`Foto bij ${field.label}`} loading="lazy" />
                                <div className="dn-photo-meta">
                                  <div>{new Date(photo.capturedAt).toLocaleString('nl-BE')}</div>
                                  <div>{photo.name}</div>
                                </div>
                                <button
                                  type="button"
                                  className="dn-danger-btn"
                                  onClick={() => handleRemovePhotoFromField(field, photo.id)}
                                >
                                  Verwijder
                                </button>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {(validationTouched || !validation.isValid || Boolean(actionError)) && (
        <div className="dn-card dn-card--warning">
          <div className="dn-card-title">Validatie status</div>
          {validation.isValid ? (
            <p className="dn-muted">Inspectie is volledig en klaar voor export/sync.</p>
          ) : (
            <>
              <p className="dn-muted">
                Openstaande fouten: {validation.metaIssues} metadata, {validation.requiredFieldIssues} verplichte velden,
                {` ${validation.nokResponsibleIssues}`} NOK-verantwoordelijken.
              </p>
              <ul className="dn-bullet">
                {validation.issues.slice(0, 8).map((issue) => (
                  <li key={issue.inputKey}>{issue.message}</li>
                ))}
              </ul>
              {validation.issues.length > 8 && (
                <p className="dn-muted">Nog {validation.issues.length - 8} extra validatiefouten.</p>
              )}
            </>
          )}
          {actionError && <div className="dn-error">{actionError}</div>}
        </div>
      )}

      <div className="dn-card">
        <div className="dn-card-title">Rapporten en export</div>
        <div className="dn-actions">
          <button className="dn-secondary-btn" type="button" onClick={() => handleExport('advanced')}>
            Geavanceerde PDF
          </button>
          <button className="dn-secondary-btn" type="button" onClick={() => handleExport('simple')}>
            Eenvoudige PDF
          </button>
          <button className="dn-secondary-btn" type="button" onClick={() => handleExport('csv')}>
            Volledige CSV
          </button>
          <button className="dn-secondary-btn" type="button" onClick={() => handleExport('csv-simple')}>
            Overzicht CSV
          </button>
        </div>
        <button
          className="dn-primary-btn dn-block"
          type="button"
          onClick={() => {
            if (!requireValidInspectionBeforeAction()) return

            onQueueSync('inspection_saved', {
              inspectionId: inspection.id,
              updatedAt: new Date().toISOString(),
              inspection: {
                id: inspection.id,
                meta: inspection.meta,
                data: inspection.data
              }
            })
            setActionError('')
          }}
        >
          Zet in sync-wachtrij
        </button>
      </div>
    </section>
  )
}

export default Inspection
