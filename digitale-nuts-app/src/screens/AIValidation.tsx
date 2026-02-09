import React, { useMemo, useState } from 'react'
import { ParsedSchema } from '../lib/schema'
import { InspectionRecord } from '../lib/storage'
import { collectNokFindings, getPermitStatus } from '../lib/analysis'
import { runAiAnalysis, AiAnalysisResult } from '../lib/ai'

interface AiValidationProps {
  schema: ParsedSchema
  inspection: InspectionRecord | null
  onQueueSync: (type: string, payload: any) => void
}

const AiValidation: React.FC<AiValidationProps> = ({ schema, inspection, onQueueSync }) => {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiAnalysisResult | null>(null)
  const [error, setError] = useState('')

  const data = inspection?.data ?? {}
  const permit = useMemo(() => getPermitStatus(schema, data), [schema, data])
  const nokFindings = useMemo(() => collectNokFindings(schema, data), [schema, data])

  const handleRun = async () => {
    if (!inspection) {
      setError('Selecteer eerst een inspectie voor AI validatie.')
      return
    }

    if (!apiKey.trim()) {
      setError('API key is verplicht.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        inspection: {
          location: inspection?.meta.location,
          inspector: inspection?.meta.inspector,
          permit
        },
        nokFindings,
        instruction:
          'Analyseer de NOK-items, geef verantwoordelijke suggesties en vermeld permit-gating waarschuwingen.'
      }
      const aiResult = await runAiAnalysis({ apiKey, model: 'gpt-4.1', payload })
      setResult(aiResult)
      onQueueSync('ai_analysis', {
        inspectionId: inspection.id,
        summary: aiResult.summary,
        permitWarnings: aiResult.permitWarnings,
        nokFindings: aiResult.nokFindings
      })
    } catch (err: any) {
      setError(err.message || 'AI analyse mislukt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="dn-screen">
      {!inspection && (
        <div className="dn-card">
          <div className="dn-card-title">Geen actieve inspectie</div>
          <p className="dn-muted">Selecteer eerst een inspectie in Home voordat je AI validatie start.</p>
        </div>
      )}

      <div className="dn-card">
        <div className="dn-card-title">AI Validatie</div>
        <p className="dn-muted">
          Vul je OpenAI API key in. Deze wordt niet opgeslagen en blijft enkel in het huidige scherm.
        </p>
        <input
          className="dn-input"
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        {error && <div className="dn-error">{error}</div>}
        <button className="dn-primary-btn dn-block" type="button" onClick={handleRun} disabled={loading}>
          {loading ? 'AI analyse loopt...' : 'Start AI analyse'}
        </button>
      </div>

      <div className="dn-card dn-card--warning">
        <div className="dn-card-title">Caring warnings (permit‑gating)</div>
        <div className="dn-chip-row">
          <span className={`dn-chip ${permit.domain === 'OK' ? 'is-ok' : 'is-nok'}`}>Domein: {permit.domain}</span>
          <span className={`dn-chip ${permit.signalisatie === 'OK' ? 'is-ok' : 'is-nok'}`}>
            Signalisatie: {permit.signalisatie}
          </span>
        </div>
        {permit.domain !== 'OK' && <p>⚠️ Domeintoelating ontbreekt of is niet ingevuld.</p>}
        {permit.signalisatie !== 'OK' && <p>⚠️ Signalisatievergunning ontbreekt of is niet ingevuld.</p>}
      </div>

      {result && (
        <div className="dn-card">
          <div className="dn-card-title">AI Samenvatting</div>
          <p>{result.summary}</p>
          {result.permitWarnings?.length > 0 && (
            <>
              <div className="dn-card-subtitle">Permit warnings</div>
              <ul className="dn-bullet">
                {result.permitWarnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {result.nokFindings?.length > 0 && (
            <>
              <div className="dn-card-subtitle">NOK analyses</div>
              <ul className="dn-bullet">
                {result.nokFindings.map((item) => (
                  <li key={`${item.item}-${item.finding}`}>
                    <strong>{item.item}</strong>: {item.finding}
                    {item.suggestedResponsible && <span> → {item.suggestedResponsible}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.suggestedActions?.length > 0 && (
            <>
              <div className="dn-card-subtitle">Aanbevolen acties</div>
              <ul className="dn-bullet">
                {result.suggestedActions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default AiValidation
