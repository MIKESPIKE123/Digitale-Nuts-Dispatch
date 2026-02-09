import React, { useState, useEffect } from 'react'
import { Button, TextField } from '@a-ui/react'
import './ConfigManager.css'

interface ConfigItem {
  value: string
  label: string
}

interface Inspector {
  id: string
  name: string
  phone: string
  assignedPostcodes: string[]
}

interface AppConfig {
  nutsmaatschappijen: ConfigItem[]
  aannemers: ConfigItem[]
  signalisatiebedrijven: ConfigItem[]
  verantwoordelijkePartijen: ConfigItem[]
  postcodes: ConfigItem[]
  inspecteurs: Inspector[]
}

const defaultConfig: AppConfig = {
  nutsmaatschappijen: [
    { value: "FLUVIUS", label: "Fluvius" },
    { value: "WATERLINK_WATER", label: "Waterlink (water)" },
    { value: "WATERLINK_RIO", label: "Waterlink (RIO)" },
    { value: "WYRE", label: "Wyre" },
    { value: "AQUAFIN", label: "Aquafin" },
    { value: "PROXIMUS", label: "Proximus" }
  ],
  aannemers: [
    { value: "GS_SOLUTIONS", label: "GS Solutions" },
    { value: "Cas-Vos", label: "Cas-Vos" }
  ],
  signalisatiebedrijven: [
    { value: "ZELFDE", label: "Zelfde als nutsmaatschappij" },
    { value: "FERO", label: "FERO" },
    { value: "VERBRUGGEN", label: "Verbruggen" }
  ],
  verantwoordelijkePartijen: [
    { value: "aannemer", label: "Aannemer" },
    { value: "nutsmaatschappij", label: "Nutsmaatschappij" },
    { value: "stad_antwerpen", label: "Stad Antwerpen - Wegbeheer" },
    { value: "signalisatiebedrijf", label: "Signalisatiebedrijf" }
  ],
  postcodes: [
    { value: "2000", label: "2000 Antwerpen" },
    { value: "2018", label: "2018 Antwerpen" },
    { value: "2020", label: "2020 Antwerpen Kiel" },
    { value: "2030", label: "2030 Antwerpen Luchtbal" },
    { value: "2060", label: "2060 Antwerpen Noord" },
    { value: "2050", label: "2050 Antwerpen - Linkeroever" },
    { value: "2100", label: "2100 Deurne" },
    { value: "2140", label: "2140 Borgerhout" },
    { value: "2170", label: "2170 Merksem" },
    { value: "2180", label: "2180 Ekeren" },
    { value: "2150", label: "2150 Borsbeek" },
    { value: "2660", label: "2660 Hoboken" },
    { value: "2610", label: "2610 Wilrijk" },
    { value: "2600", label: "2600 Berchem" }
  ],
  inspecteurs: [
    {
      id: "inspecteur_1",
      name: "Inspecteur Stad Antwerpen", 
      phone: "0475 371 699",
      assignedPostcodes: ["2000", "2018"]
    },
    {
      id: "tom_vermeulen",
      name: "Tom Vermeulen",
      phone: "0476 123 456", 
      assignedPostcodes: ["2100", "2140"]
    },
    {
      id: "lisa_de_smet", 
      name: "Lisa De Smet",
      phone: "0477 987 654",
      assignedPostcodes: ["2170", "2180"]
    },
    {
      id: "jan_janssens",
      name: "Jan Janssens", 
      phone: "0478 555 777",
      assignedPostcodes: ["2660", "2610"]
    }
  ]
}

// Config utilities
export const getConfig = (): AppConfig => {
  console.log('🔍 getConfig: Zoeken naar opgeslagen configuratie...')
  
  // First try the main key
  const saved = localStorage.getItem('inspectie-app-config')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      console.log('✅ Configuratie gevonden in inspectie-app-config:', config)
      return config
    } catch (error) {
      console.error('Error parsing saved config:', error)
    }
  }
  
  // Search all localStorage keys for Michel Gerits configuration
  console.log('🔍 Zoeken naar Michel Gerits in alle localStorage keys...')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      if (value && value.includes('Michel Gerits')) {
        console.log('🎯 Michel Gerits configuratie gevonden in key:', key)
        try {
          const config = JSON.parse(value)
          if (config.inspecteurs && config.inspecteurs.some((i: any) => i.name.includes('Michel'))) {
            console.log('✅ Juiste inspecteurs configuratie gevonden!')
            return config
          }
        } catch (error) {
          console.error('Error parsing Michel config:', error)
        }
      }
    }
  }
  
  console.log('⚠️ Geen Michel Gerits configuratie gevonden, gebruik defaultConfig')
  return defaultConfig
}

export const saveConfig = (config: AppConfig): void => {
  localStorage.setItem('inspectie-app-config', JSON.stringify(config))
}

export const resetConfig = (): AppConfig => {
  localStorage.removeItem('inspectie-app-config')
  return defaultConfig
}

interface ConfigManagerProps {
  onClose: () => void
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ onClose }) => {
  const [config, setConfig] = useState<AppConfig>(getConfig())
  const [activeTab, setActiveTab] = useState<keyof AppConfig>('nutsmaatschappijen')
  const [newItemValue, setNewItemValue] = useState('')
  const [newItemLabel, setNewItemLabel] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  
  // Extra velden voor inspecteurs
  const [newInspectorPhone, setNewInspectorPhone] = useState('')
  const [newInspectorPostcodes, setNewInspectorPostcodes] = useState<string[]>([])

  useEffect(() => {
    saveConfig(config)
  }, [config])

  const addItem = () => {
    if (activeTab === 'inspecteurs') {
      if (!newItemLabel.trim()) {
        alert('Vul het naam veld in!')
        return
      }
      
      // Controleer op dubbele namen
      const nameExists = config.inspecteurs.some(inspector => 
        inspector.name.toLowerCase() === newItemLabel.trim().toLowerCase()
      )
      
      if (nameExists) {
        alert('Deze naam bestaat al. Kies een andere naam.')
        return
      }
      
      // Valideer telefoonformaat
      const phoneRegex = /^0\d{3}\s\d{3}\s\d{3}$/
      if (newInspectorPhone && !phoneRegex.test(newInspectorPhone)) {
        alert('Telefoonformaat moet zijn: 0XXX XXX XXX (bijv. 0475 371 699)')
        return
      }
      
      const newInspector: Inspector = {
        id: Date.now().toString(),
        name: newItemLabel.trim(),
        phone: newInspectorPhone.trim(),
        assignedPostcodes: [...newInspectorPostcodes]
      }
      
      setConfig(prev => ({
        ...prev,
        inspecteurs: [...prev.inspecteurs, newInspector]
      }))
    } else {
      if (!newItemValue.trim() || !newItemLabel.trim()) {
        alert('Vul beide velden in!')
        return
      }
      const newItem = { value: newItemValue.trim(), label: newItemLabel.trim() }
      setConfig(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab] as ConfigItem[], newItem]
      }))
    }
    
    setNewItemValue('')
    setNewItemLabel('')
    setNewInspectorPhone('')
    setNewInspectorPostcodes([])
  }

  const removeItem = (index: number) => {
    if (activeTab === 'inspecteurs') {
      setConfig(prev => ({
        ...prev,
        inspecteurs: prev.inspecteurs.filter((_, i) => i !== index)
      }))
    } else {
      setConfig(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] as ConfigItem[]).filter((_, i) => i !== index)
      }))
    }
  }

  const editItem = (index: number) => {
    if (activeTab === 'inspecteurs') {
      const inspector = config.inspecteurs[index]
      setNewItemLabel(inspector.name)
      setNewInspectorPhone(inspector.phone)
      setNewInspectorPostcodes([...inspector.assignedPostcodes])
      setNewItemValue('')
    } else {
      const item = (config[activeTab] as ConfigItem[])[index]
      setNewItemValue(item.value)
      setNewItemLabel(item.label)
    }
    setEditingIndex(index)
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    
    if (activeTab === 'inspecteurs') {
      if (!newItemLabel.trim()) {
        alert('Vul het naam veld in!')
        return
      }
      
      // Controleer op dubbele namen (behalve huidige item)
      const nameExists = config.inspecteurs.some((inspector, index) => 
        index !== editingIndex && 
        inspector.name.toLowerCase() === newItemLabel.trim().toLowerCase()
      )
      
      if (nameExists) {
        alert('Deze naam bestaat al. Kies een andere naam.')
        return
      }
      
      // Valideer telefoonformaat
      const phoneRegex = /^0\d{3}\s\d{3}\s\d{3}$/
      if (newInspectorPhone && !phoneRegex.test(newInspectorPhone)) {
        alert('Telefoonformaat moet zijn: 0XXX XXX XXX (bijv. 0475 371 699)')
        return
      }
      
      setConfig(prev => ({
        ...prev,
        inspecteurs: prev.inspecteurs.map((inspector, i) => 
          i === editingIndex ? {
            ...inspector,
            name: newItemLabel.trim(),
            phone: newInspectorPhone.trim(),
            assignedPostcodes: [...newInspectorPostcodes]
          } : inspector
        )
      }))
    } else {
      if (!newItemValue.trim() || !newItemLabel.trim()) {
        alert('Vul beide velden in!')
        return
      }

      const editedItem = { value: newItemValue.trim(), label: newItemLabel.trim() }
      
      setConfig(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] as ConfigItem[]).map((item, i) => 
          i === editingIndex ? editedItem : item
        )
      }))
    }
    
    setEditingIndex(null)
    setNewItemValue('')
    setNewItemLabel('')
    setNewInspectorPhone('')
    setNewInspectorPostcodes([])
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setNewItemValue('')
    setNewItemLabel('')
    setNewInspectorPhone('')
    setNewInspectorPostcodes([])
  }

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inspectie-configuratie-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string)
        setConfig(importedConfig)
        alert('✅ Configuratie succesvol geïmporteerd!')
      } catch (error) {
        alert('❌ Ongeldige configuratie file!')
      }
    }
    reader.readAsText(file)
  }

  const resetToDefaults = () => {
    if (confirm('⚠️ Alle wijzigingen worden gewist en standaardwaarden hersteld. Doorgaan?')) {
      const defaultConf = resetConfig()
      setConfig(defaultConf)
      alert('✅ Configuratie gereset naar standaardwaarden!')
    }
  }

  const tabs = [
    { key: 'nutsmaatschappijen', label: '🔌 Nutsmaatschappijen' },
    { key: 'aannemers', label: '🏗️ Aannemers' },
    { key: 'signalisatiebedrijven', label: '🚧 Signalisatie' },
    { key: 'verantwoordelijkePartijen', label: '👥 Verantwoordelijken' },
    { key: 'postcodes', label: '📍 Postcodes' },
    { key: 'inspecteurs', label: '👨‍💼 Inspecteurs' }
  ]

  return (
    <div className="config-manager-overlay">
      <div className="config-manager">
        <div className="config-header">
          <h2>⚙️ Configuratie Beheer</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="config-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as keyof AppConfig)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="config-content">
          <div className="config-actions">
            <Button onClick={exportConfig}>
              📤 Exporteer
            </Button>
            <label className="import-btn">
              <Button>📥 Importeer</Button>
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="hidden-file-input"
              />
            </label>
            <Button onClick={resetToDefaults} className="reset-button">
              🔄 Reset
            </Button>
          </div>

          <div className="add-item-form">
            <h3>
              {editingIndex !== null ? '✏️ Bewerken' : '➕ Nieuw toevoegen'}
            </h3>
            
            {activeTab !== 'inspecteurs' && (
              <div className="config-field-wrapper">
                <TextField
                  label="Waarde (technische naam)"
                  value={newItemValue}
                  onChange={(e) => setNewItemValue(e.target.value)}
                />
              </div>
            )}
            
            <div className="config-field-wrapper">
              <TextField
                label={activeTab === 'inspecteurs' ? 'Naam inspecteur' : 'Label (weergavenaam)'}
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
              />
            </div>
            
            {activeTab === 'inspecteurs' && (
              <>
                <div className="config-field-wrapper">
                  <TextField
                    label="Telefoonnummer (0XXX XXX XXX)"
                    value={newInspectorPhone}
                    onChange={(e) => setNewInspectorPhone(e.target.value)}
                  />
                </div>
                
                <div className="config-field-wrapper">
                  <label className="postcode-label">Toegewezen Postcodes:</label>
                  <div className="postcode-selection">
                    {config.postcodes.map((postcode, index) => (
                      <div key={index} className="postcode-checkbox">
                        <input
                          type="checkbox"
                          id={`postcode-${index}`}
                          checked={newInspectorPostcodes.includes(postcode.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewInspectorPostcodes(prev => [...prev, postcode.value])
                            } else {
                              setNewInspectorPostcodes(prev => prev.filter(pc => pc !== postcode.value))
                            }
                          }}
                        />
                        <label htmlFor={`postcode-${index}`}>{postcode.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="form-buttons">
              {editingIndex !== null ? (
                <>
                  <Button onClick={saveEdit}>✅ Opslaan</Button>
                  <Button onClick={cancelEdit} className="cancel-button">❌ Annuleren</Button>
                </>
              ) : (
                <Button onClick={addItem}>➕ Toevoegen</Button>
              )}
            </div>
          </div>

          <div className="items-list">
            <h3>📋 Huidige items ({activeTab === 'inspecteurs' ? config.inspecteurs.length : (config[activeTab] as ConfigItem[]).length})</h3>
            
            {activeTab === 'inspecteurs' ? (
              config.inspecteurs.map((inspector, index) => (
                <div key={index} className="config-item">
                  <div className="inspector-info">
                    <div className="inspector-name">{inspector.name}</div>
                    {inspector.phone && <div className="inspector-phone">📞 {inspector.phone}</div>}
                    {inspector.assignedPostcodes.length > 0 && (
                      <div className="inspector-postcodes">📍 {inspector.assignedPostcodes.join(', ')}</div>
                    )}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => editItem(index)} className="edit-btn">✏️</button>
                    <button onClick={() => removeItem(index)} className="delete-btn">🗑️</button>
                  </div>
                </div>
              ))
            ) : (
              (config[activeTab] as ConfigItem[]).map((item, index) => (
                <div key={index} className="config-item">
                  <div className="item-info">
                    <span className="item-value">{item.value}</span>
                    <span className="item-label">{item.label}</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => editItem(index)} className="edit-btn">✏️</button>
                    <button onClick={() => removeItem(index)} className="delete-btn">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfigManager