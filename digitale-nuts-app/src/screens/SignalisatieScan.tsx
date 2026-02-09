import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InspectionRecord } from '../lib/storage'
import { addLocationStampToCanvas } from '../lib/photos'

interface SignalisatieScanProps {
  inspection: InspectionRecord | null
  onUpdateInspectionData: (data: Record<string, any>) => void
  onQueueSync: (type: string, payload: any) => void
}

interface EvidenceItem {
  id: string
  capturedAt: string
  imageDataUrl: string
  note?: string
  checklist: Record<string, boolean>
}

const EVIDENCE_KEY = '__signalisatie_evidence'
const MAX_EVIDENCE_ITEMS = 6

const CHECKLIST_TEMPLATE: Array<{ key: string; label: string }> = [
  { key: 'bord_begin_werken', label: 'Bord begin werken zichtbaar' },
  { key: 'kegelrij_voetpad', label: 'Kegelrij en voetpad afbakening correct' },
  { key: 'werfzone_afgesloten', label: 'Werfzone volledig en veilig afgesloten' }
]

const readEvidence = (raw: unknown): EvidenceItem[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item): EvidenceItem | null => {
      if (typeof item !== 'object' || item === null) return null
      const value = item as Partial<EvidenceItem>

      if (typeof value.id !== 'string' || typeof value.capturedAt !== 'string' || typeof value.imageDataUrl !== 'string') {
        return null
      }

      const note = typeof value.note === 'string' ? value.note : undefined

      return {
        id: value.id,
        capturedAt: value.capturedAt,
        imageDataUrl: value.imageDataUrl,
        ...(note ? { note } : {}),
        checklist:
          value.checklist && typeof value.checklist === 'object'
            ? (value.checklist as Record<string, boolean>)
            : {}
      }
    })
    .filter((item): item is EvidenceItem => item !== null)
}

const SignalisatieScan: React.FC<SignalisatieScanProps> = ({
  inspection,
  onUpdateInspectionData,
  onQueueSync
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [captureNote, setCaptureNote] = useState('')
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const data = inspection?.data ?? {}
  const evidenceList = useMemo(() => readEvidence(data[EVIDENCE_KEY]), [data])

  const stopCamera = () => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    streamRef.current = null
    setCameraActive(false)
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is niet beschikbaar in deze browser.')
      return
    }

    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraActive(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera kon niet gestart worden.'
      setCameraError(message)
      setCameraActive(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const saveEvidence = (nextEvidence: EvidenceItem[]) => {
    if (!inspection) return

    const trimmed = nextEvidence.slice(0, MAX_EVIDENCE_ITEMS)
    const nextData = {
      ...data,
      [EVIDENCE_KEY]: trimmed
    }

    onUpdateInspectionData(nextData)
  }

  const captureEvidence = async () => {
    if (!inspection) return

    const video = videoRef.current
    if (!video || !cameraActive) {
      setCameraError('Start eerst de camera voor je een capture neemt.')
      return
    }

    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight

    if (!sourceWidth || !sourceHeight) {
      setCameraError('Camera stream is nog niet klaar voor capture.')
      return
    }

    const maxWidth = 960
    const scale = Math.min(1, maxWidth / sourceWidth)
    const width = Math.round(sourceWidth * scale)
    const height = Math.round(sourceHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Canvas context kon niet worden aangemaakt.')
      return
    }

    context.drawImage(video, 0, 0, width, height)

    try {
      await addLocationStampToCanvas(canvas, {
        gpsCoordinates: inspection.meta.gps,
        address: inspection.meta.location
      })
    } catch (error) {
      console.warn('Foto-stempel kon niet worden toegevoegd:', error)
    }

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.78)

    const capturedAt = new Date().toISOString()
    const evidence: EvidenceItem = {
      id: crypto.randomUUID(),
      capturedAt,
      imageDataUrl,
      note: captureNote.trim() || undefined,
      checklist: { ...checklist }
    }

    const nextEvidence = [evidence, ...evidenceList]
    saveEvidence(nextEvidence)

    onQueueSync('signalisatie_evidence', {
      inspectionId: inspection.id,
      evidenceId: evidence.id,
      capturedAt,
      note: evidence.note,
      checklist: evidence.checklist
    })

    setCaptureNote('')
    setChecklist({})
    setCameraError('')
  }

  const removeEvidence = (evidenceId: string) => {
    const nextEvidence = evidenceList.filter((item) => item.id !== evidenceId)
    saveEvidence(nextEvidence)

    if (inspection) {
      onQueueSync('signalisatie_evidence_removed', {
        inspectionId: inspection.id,
        evidenceId,
        removedAt: new Date().toISOString()
      })
    }
  }

  if (!inspection) {
    return (
      <section className="dn-screen">
        <div className="dn-card">
          <div className="dn-card-title">Geen actieve inspectie voor scan</div>
          <p className="dn-muted">Selecteer eerst een inspectie om camerabeelden op te slaan.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="dn-screen">
      <div className="dn-card dn-card--glass">
        <div className="dn-card-title">Signalisatie scan</div>
        <div className="dn-camera-shell">
          {cameraActive ? (
            <video ref={videoRef} className="dn-camera-preview" autoPlay muted playsInline />
          ) : (
            <div className="dn-scan-preview">Camera staat uit</div>
          )}
        </div>

        <div className="dn-actions">
          <button className="dn-secondary-btn" type="button" onClick={startCamera} disabled={cameraActive}>
            Start camera
          </button>
          <button className="dn-secondary-btn" type="button" onClick={stopCamera} disabled={!cameraActive}>
            Stop camera
          </button>
          <button
            className="dn-primary-btn"
            type="button"
            onClick={() => {
              void captureEvidence()
            }}
            disabled={!cameraActive}
          >
            Capture bewijs
          </button>
        </div>

        <label className="dn-form-grid">
          <span>Notitie bij capture</span>
          <textarea
            className="dn-input dn-textarea"
            value={captureNote}
            onChange={(e) => setCaptureNote(e.target.value)}
            placeholder="Bv. boordsteen niet afgezet aan zijde noord"
          />
        </label>

        <div className="dn-checklist">
          {CHECKLIST_TEMPLATE.map((item) => (
            <label key={item.key} className="dn-checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(checklist[item.key])}
                onChange={(e) =>
                  setChecklist((prev) => ({
                    ...prev,
                    [item.key]: e.target.checked
                  }))
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        {cameraError && <div className="dn-error">{cameraError}</div>}
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Evidence ({evidenceList.length}/{MAX_EVIDENCE_ITEMS})</div>
        {evidenceList.length === 0 && <p className="dn-muted">Nog geen camera-captures opgeslagen.</p>}
        <div className="dn-evidence-grid">
          {evidenceList.map((item) => (
            <article key={item.id} className="dn-evidence-item">
              <img src={item.imageDataUrl} alt="Signalisatie bewijsfoto" loading="lazy" />
              <div className="dn-evidence-meta">
                <div>{new Date(item.capturedAt).toLocaleString('nl-BE')}</div>
                {item.note && <div>{item.note}</div>}
                <div className="dn-chip-row">
                  {CHECKLIST_TEMPLATE.map((checkItem) => (
                    <span
                      key={`${item.id}-${checkItem.key}`}
                      className={`dn-chip ${item.checklist[checkItem.key] ? 'is-ok' : 'is-nok'}`}
                    >
                      {checkItem.label}
                    </span>
                  ))}
                </div>
              </div>
              <button className="dn-danger-btn" type="button" onClick={() => removeEvidence(item.id)}>
                Verwijder
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SignalisatieScan
