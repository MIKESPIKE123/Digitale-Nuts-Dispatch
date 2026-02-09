import React from 'react'
import { InspectionRecord } from '../lib/storage'

interface HomeProps {
  inspections: InspectionRecord[]
  onStartInspection: () => void
  onSelectInspection: (id: string) => void
}

const Home: React.FC<HomeProps> = ({ inspections, onStartInspection, onSelectInspection }) => {
  return (
    <section className="dn-screen">
      <div className="dn-hero">
        <div>
          <h1>Digitale Nuts</h1>
          <p>Inspectie & opvolging met zorgende AI‑assistent.</p>
        </div>
        <button className="dn-primary-btn" type="button" onClick={onStartInspection}>
          ➕ Nieuwe inspectie
        </button>
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Snelle acties</div>
        <div className="dn-grid-quick">
          <div className="dn-quick-tile">🧭 Start inspectie</div>
          <div className="dn-quick-tile">📝 Handover klaarzetten</div>
          <div className="dn-quick-tile">🤖 AI analyse</div>
          <div className="dn-quick-tile">🔄 Sync status</div>
        </div>
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Recente inspecties</div>
        {inspections.length === 0 && (
          <p className="dn-muted">Nog geen inspecties opgeslagen.</p>
        )}
        <div className="dn-list">
          {inspections.slice(0, 5).map((inspection) => (
            <button
              key={inspection.id}
              className="dn-list-item"
              type="button"
              onClick={() => onSelectInspection(inspection.id)}
            >
              <div>
                <div className="dn-list-title">{inspection.meta.location || 'Onbekende locatie'}</div>
                <div className="dn-list-sub">
                  {inspection.meta.inspector || 'Inspecteur'} ·{' '}
                  {new Date(inspection.updatedAt).toLocaleString('nl-BE')}
                </div>
              </div>
              <span className="dn-chip">Open</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Home
