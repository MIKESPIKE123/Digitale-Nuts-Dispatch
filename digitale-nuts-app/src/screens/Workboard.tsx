import React from 'react'

interface WorkboardProps {
  onStartInspection: () => void
}

const Workboard: React.FC<WorkboardProps> = ({ onStartInspection }) => {
  return (
    <section className="dn-screen">
      <div className="dn-card dn-card--glass">
        <div className="dn-card-title">Command Palette</div>
        <input className="dn-input" placeholder="Typ een commando of GIPOD-ID..." />
        <div className="dn-chip-row">
          <span className="dn-chip">/inspectie</span>
          <span className="dn-chip">/handover</span>
          <span className="dn-chip">/sync</span>
        </div>
      </div>

      <div className="dn-card">
        <div className="dn-card-title">Today Workboard</div>
        <div className="dn-list">
          <div className="dn-list-item">
            <div>
              <div className="dn-list-title">Nu · Lakborslei</div>
              <div className="dn-list-sub">Signalisatiecheck · SLA risico 1</div>
            </div>
            <span className="dn-chip">85%</span>
          </div>
          <div className="dn-list-item">
            <div>
              <div className="dn-list-title">Binnen 1u · Groenenhoek</div>
              <div className="dn-list-sub">Herstelvalidatie natuursteen</div>
            </div>
            <span className="dn-chip">45%</span>
          </div>
          <div className="dn-list-item">
            <div>
              <div className="dn-list-title">Namiddag · Zuid</div>
              <div className="dn-list-sub">Vaststellingen sleuf</div>
            </div>
            <span className="dn-chip">10%</span>
          </div>
        </div>
        <button className="dn-primary-btn dn-block" type="button" onClick={onStartInspection}>
          🧭 Start inspectie
        </button>
      </div>
    </section>
  )
}

export default Workboard
