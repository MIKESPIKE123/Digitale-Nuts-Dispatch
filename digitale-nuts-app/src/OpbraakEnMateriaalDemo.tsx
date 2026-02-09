import React from 'react'
import OpbraakEnMateriaal from './OpbraakEnMateriaal'
import './OpbraakEnMateriaalDemo.css'

const OpbraakEnMateriaalDemo: React.FC = () => {
  return (
    <div className="demo-container">
      <div className="demo-content">
        <div className="demo-header">
          <h1 className="demo-title">
            🧭 Stad Antwerpen - Opbraak & Materiaal Demo
          </h1>
          <p className="demo-subtitle">
            React + TypeScript component met Antwerpse digitale huisstijl
          </p>
        </div>
        
        <OpbraakEnMateriaal />
        
        <div className="demo-info">
          <h3 className="demo-info-title">
            📋 Component Features
          </h3>
          <ul className="demo-info-list">
            <li>✅ Officiële A-UI styling en kleuren (#E10019)</li>
            <li>✅ Volledige toegankelijkheid (ARIA, keyboard navigation)</li>
            <li>✅ TypeScript types en validation</li>
            <li>✅ Responsive design (mobile-first)</li>
            <li>✅ Inline foutvalidatie na blur</li>
            <li>✅ Submit functionaliteit met console.log</li>
            <li>✅ Semantische HTML met fieldset/legend</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default OpbraakEnMateriaalDemo