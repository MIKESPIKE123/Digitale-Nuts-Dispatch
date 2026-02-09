import React, { useEffect, useMemo, useState } from 'react'
import { ParsedSchema } from '../lib/schema'
import { InspectionRecord } from '../lib/storage'
import { collectNokFindings, getPermitStatus } from '../lib/analysis'

type HandoverFilter = 'all' | 'nok'
type HandoverDecision = 'BLOCK' | 'REQUEST_FIX' | 'APPROVE'

interface HandoverProps {
  schema: ParsedSchema
  inspection: InspectionRecord | null
  onUpdateMeta: (metaUpdates: Partial<InspectionRecord['meta']>) => void
  onQueueSync: (type: string, payload: any) => void
}

interface Observation {
  id: string
  section: string
  field: string
  value: string
  status: 'OK' | 'NOK' | 'INFO'
  responsible?: string
}

const isNok = (value: string) => value.trim().toUpperCase().startsWith('NOK')
const isOk = (value: string) => value.trim().toUpperCase().startsWith('OK')

const collectObservations = (schema: ParsedSchema, data: Record<string, any>): Observation[] => {
  const observations: Observation[] = []

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const rawValue = data[field.key]
      if (rawValue === undefined || rawValue === null || rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0)) {
        return
      }

      if (Array.isArray(rawValue)) {
        rawValue.forEach((entry: unknown, index: number) => {
          if (typeof entry !== 'string' || !entry.trim()) return

          const status: Observation['status'] = isNok(entry) ? 'NOK' : isOk(entry) ? 'OK' : 'INFO'
          const responsible = isNok(entry) ? data[`${field.key}__responsible__${entry}`] : undefined

          observations.push({
            id: `${field.key}-${index}`,
            section: section.title,
            field: field.label,
            value: entry,
            status,
            responsible
          })
        })
        return
      }

      const value = String(rawValue).trim()
      if (!value) return

      const status: Observation['status'] = isNok(value) ? 'NOK' : isOk(value) ? 'OK' : 'INFO'
      const responsible = isNok(value) ? data[`${field.key}__responsible`] : undefined

      observations.push({
        id: field.key,
        section: section.title,
        field: field.label,
        value,
        status,
        responsible
      })
    })
  })

  return observations
}

const Handover: React.FC<HandoverProps> = ({ schema, inspection, onUpdateMeta, onQueueSync }) => {
  const [filter, setFilter] = useState<HandoverFilter>('all')
  const [decisionNote, setDecisionNote] = useState('')

  const data = inspection?.data ?? {}
  const permit = useMemo(() => getPermitStatus(schema, data), [schema, data])
  const nokFindings = useMemo(() => collectNokFindings(schema, data), [schema, data])
  const observations = useMemo(() => collectObservations(schema, data), [schema, data])

  useEffect(() => {
    setDecisionNote(inspection?.meta.handoverDecisionNote || '')
  }, [inspection?.id, inspection?.meta.handoverDecisionNote])

  if (!inspection) {
    return (
      <section className="dn-screen">
        <div className="dn-card">
          <div className="dn-card-title">Geen actieve inspectie voor handover</div>
          <p className="dn-muted">Selecteer eerst een inspectie in Home.</p>
        </div>
      </section>
    )
  }

  const filtered = filter === 'nok' ? observations.filter((observation) => observation.status === 'NOK') : observations
  const currentDecision = inspection.meta.handoverDecision

  const applyDecision = (decision: HandoverDecision) => {
    const decidedAt = new Date().toISOString()
    const note = decisionNote.trim()

    onUpdateMeta({
      handoverDecision: decision,
      handoverDecisionNote: note || undefined,
      handoverDecidedAt: decidedAt
    })

    onQueueSync('handover_decision', {
      inspectionId: inspection.id,
      decision,
      note,
      decidedAt,
      permit
    })
  }

  const clearDecision = () => {
    onUpdateMeta({
      handoverDecision: undefined,
      handoverDecisionNote: decisionNote.trim() || undefined,
      handoverDecidedAt: undefined
    })
  }

  const canApprove = permit.domain === 'OK' && permit.signalisatie === 'OK'

  return (
    <section className="dn-screen">
      <div className="dn-card dn-card--glass">
        <div className="dn-card-title">Werf handover</div>
        <div className="dn-muted">{inspection.meta.location || 'Geen locatie ingevuld'}</div>
        <div className="dn-chip-row">
          <span className={`dn-chip ${permit.domain === 'OK' ? 'is-ok' : 'is-nok'}`}>Domein: {permit.domain}</span>
          <span className={`dn-chip ${permit.signalisatie === 'OK' ? 'is-ok' : 'is-nok'}`}>
            Signalisatie: {permit.signalisatie}
          </span>
          <span className={`dn-chip ${nokFindings.length === 0 ? 'is-ok' : 'is-nok'}`}>NOK: {nokFindings.length}</span>
        </div>
      </div>

      <div className="dn-card dn-card--warning">
        <div className="dn-card-title">Must happen</div>
        <p>
          Werk niet starten als signalisatie of domeinvergunning ontbreken. Elke NOK moet een verantwoordelijke partij
          hebben voor opvolging.
        </p>
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Observaties ({filtered.length})</div>
        <div className="dn-filter-row">
          <button
            className={`dn-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setFilter('all')}
          >
            Alle
          </button>
          <button
            className={`dn-filter-btn ${filter === 'nok' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setFilter('nok')}
          >
            Enkel NOK
          </button>
        </div>
        {filtered.length === 0 && <p className="dn-muted">Geen observaties voor deze filter.</p>}
        <div className="dn-list">
          {filtered.map((observation) => (
            <div
              key={observation.id}
              className={`dn-list-item ${
                observation.status === 'NOK' ? 'dn-list-item--warning' : observation.status === 'OK' ? 'dn-list-item--ok' : ''
              }`}
            >
              <div>
                <div className="dn-list-title">{observation.field}</div>
                <div className="dn-list-sub">{observation.section}</div>
                <div className="dn-list-sub">{observation.value}</div>
                {observation.responsible && (
                  <div className="dn-list-sub">Verantwoordelijke: {observation.responsible}</div>
                )}
              </div>
              <span className={`dn-chip ${observation.status === 'NOK' ? 'is-nok' : observation.status === 'OK' ? 'is-ok' : ''}`}>
                {observation.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Beslissing</div>
        <p className="dn-muted">Kies expliciet een handoverbeslissing zodat opvolging in de keten eenduidig blijft.</p>

        <label className="dn-form-grid">
          <span>Beslissingsnota</span>
          <textarea
            className="dn-input dn-textarea"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Waarom BLOCK/REQUEST_FIX/APPROVE?"
          />
        </label>

        {currentDecision && (
          <div className="dn-muted">
            Huidige beslissing: <strong>{currentDecision}</strong>
            {inspection.meta.handoverDecidedAt &&
              ` op ${new Date(inspection.meta.handoverDecidedAt).toLocaleString('nl-BE')}`}
          </div>
        )}

        <div className="dn-actions">
          <button
            className={`dn-danger-btn ${currentDecision === 'BLOCK' ? 'is-active' : ''}`}
            type="button"
            onClick={() => applyDecision('BLOCK')}
          >
            BLOCK
          </button>
          <button
            className={`dn-warning-btn ${currentDecision === 'REQUEST_FIX' ? 'is-active' : ''}`}
            type="button"
            onClick={() => applyDecision('REQUEST_FIX')}
          >
            REQUEST FIX
          </button>
          <button
            className={`dn-success-btn ${currentDecision === 'APPROVE' ? 'is-active' : ''}`}
            type="button"
            disabled={!canApprove}
            onClick={() => applyDecision('APPROVE')}
            title={!canApprove ? 'APPROVE enkel mogelijk met geldige domein- en signalisatievergunning' : undefined}
          >
            APPROVE
          </button>
        </div>

        <button className="dn-secondary-btn" type="button" onClick={clearDecision}>
          Beslissing resetten
        </button>
      </div>
    </section>
  )
}

export default Handover
