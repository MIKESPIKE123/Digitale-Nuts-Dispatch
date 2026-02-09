import React, { useState, useEffect } from 'react'
import { Button } from '@a-ui/react'
import { InspectionReportGenerator, type ReportData } from './InspectionReportGenerator'
import { generateSimplePDFReport } from './SimplePDFGenerator'
import { generateCSVExport, generateSimpleCSVOverview, type CSVExportData } from './CSVExporter'
import ConfigManager, { getConfig } from './ConfigManager'
import './PlannedInspectionPage.css'

interface InspectionData {
  [key: string]: any
}

interface ResponsibleParty {
  value: string
  label: string
}

interface PlannedInspectionPageProps {
  gpsCoords?: { latitude: number; longitude: number } | null
  inspectorName?: string
  locationName?: string
  onLocationChange?: (coords: { latitude: number; longitude: number }) => void
}

interface InspectionSectionProps {
  title: string
  icon: string
  items: InspectionItem[]
  data: InspectionData
  onUpdate: (updates: InspectionData) => void
  configOptions: any
}

interface InspectionItem {
  key: string
  label: string
  type: 'select' | 'input' | 'checkbox' | 'textarea' | 'multiselect'
  options?: Array<{ 
    value: string; 
    label: string; 
    isNOK?: boolean;
    responsible?: ResponsibleParty[]
  }>
  required: boolean
}

const InspectionSection: React.FC<InspectionSectionProps> = ({
  title,
  icon,
  items,
  data,
  onUpdate,
  configOptions
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleFieldChange = (key: string, value: any) => {
    onUpdate({ ...data, [key]: value })
  }

  const getSectionProgress = () => {
    const requiredFields = items.filter(item => item.required)
    const completedFields = requiredFields.filter(item => {
      const value = data[item.key]
      if (item.type === 'checkbox') {
        return value === true || value === false // Checkbox is altijd "completed"
      }
      return value && value !== ''
    })
    return requiredFields.length > 0 ? 
      Math.round((completedFields.length / requiredFields.length) * 100) : 100
  }

  const hasErrors = () => {
    return items.some(item => {
      const value = data[item.key]
      return value && typeof value === 'string' && value.startsWith('NOK')
    })
  }

  const progress = getSectionProgress()

  return (
    <div className={`inspection-section ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="section-info">
          <span className="section-icon">{icon}</span>
          <div className="section-title-container">
            <h3 className="section-title">{title}</h3>
            <div className="section-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  data-progress={progress}
                />
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          </div>
        </div>
        <div className="section-indicators">
          {hasErrors() && <span className="error-indicator">⚠️</span>}
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="section-content">
          {items.map(item => (
            <div key={item.key} className="form-group">
              <label className="form-label">
                {item.label}
                {item.required && <span className="required">*</span>}
              </label>
              
              {item.type === 'select' && (
                <div className="select-container">
                  <select
                    className={`form-select ${
                      data[item.key] && data[item.key].startsWith('NOK') ? 'error' : ''
                    }`}
                    value={data[item.key] || ''}
                    onChange={(e) => handleFieldChange(item.key, e.target.value)}
                    title={item.label}
                  >
                    <option value="">Selecteer optie...</option>
                    {item.options?.map(option => (
                      <option 
                        key={option.value} 
                        value={option.value}
                        className={option.isNOK ? 'nok-option' : ''}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* Toon verantwoordelijke dropdown als NOK is geselecteerd voor select velden */}
                  {data[item.key] && data[item.key].startsWith('NOK') && (() => {
                    console.log('🔧 Rendering responsible dropdown voor', item.key, 'met configOptions:', configOptions)
                    return true
                  })() && (
                    <div className="responsible-dropdown-container">
                      <label className="responsible-label">
                        Verantwoordelijke:
                      </label>
                      <select
                        className="responsible-select"
                        value={data[`${item.key}_responsible`] || ''}
                        onChange={(e) => handleFieldChange(`${item.key}_responsible`, e.target.value)}
                        title="Selecteer verantwoordelijke partij"
                      >
                        <option value="">Selecteer verantwoordelijke...</option>
                        {configOptions.verantwoordelijkePartijen && Array.isArray(configOptions.verantwoordelijkePartijen) 
                          ? configOptions.verantwoordelijkePartijen.map((party: any) => (
                              <option key={party.value} value={party.value}>
                                {party.label}
                              </option>
                            ))
                          : <option value="">Geen verantwoordelijken geconfigureerd</option>
                        }
                      </select>
                    </div>
                  )}
                </div>
              )}

              {item.type === 'multiselect' && (
                <div className="multiselect-container">
                  {item.options?.map(option => (
                    <div key={option.value} className="multiselect-option">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={data[item.key] && Array.isArray(data[item.key]) && data[item.key].includes(option.value)}
                          onChange={(e) => {
                            const currentValues = Array.isArray(data[item.key]) ? data[item.key] : []
                            let newValues = [...currentValues]
                            
                            // Als OK wordt geselecteerd, verwijder alle NOK opties
                            if (option.value === 'OK' && e.target.checked) {
                              newValues = ['OK']
                            }
                            // Als een NOK wordt geselecteerd, verwijder OK
                            else if (option.isNOK && e.target.checked) {
                              newValues = newValues.filter(v => v !== 'OK')
                              newValues.push(option.value)
                            }
                            // Als checkbox wordt uitgezet
                            else if (!e.target.checked) {
                              newValues = newValues.filter(v => v !== option.value)
                            }
                            // Anders gewoon toevoegen
                            else {
                              newValues.push(option.value)
                            }
                            
                            handleFieldChange(item.key, newValues.length > 0 ? newValues : [])
                          }}
                        />
                        <span className={`option-label ${option.isNOK ? 'nok-label' : 'ok-label'}`}>
                          {option.label}
                        </span>
                      </label>
                      
                      {/* Toon verantwoordelijke dropdown als NOK is geselecteerd */}
                      {option.isNOK && 
                       data[item.key] && 
                       Array.isArray(data[item.key]) && 
                       data[item.key].includes(option.value) && 
                       option.responsible && (
                        <div className="responsible-section">
                          <label className="responsible-label">Verantwoordelijke:</label>
                          <select
                            className="responsible-select"
                            value={data[`${item.key}_${option.value}_responsible`] || ''}
                            onChange={(e) => handleFieldChange(`${item.key}_${option.value}_responsible`, e.target.value)}
                            title="Selecteer verantwoordelijke partij"
                          >
                            <option value="">Selecteer verantwoordelijke...</option>
                            {option.responsible.map(resp => (
                              <option key={resp.value} value={resp.value}>
                                {resp.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {item.type === 'input' && (
                <div className="input-container">
                  <input
                    type="text"
                    className="form-input"
                    value={data[item.key] || ''}
                    onChange={(e) => handleFieldChange(item.key, e.target.value)}
                    placeholder={item.label}
                  />
                  {item.key === 'gipod_nr' && (
                    <div className="gipod-link-container">
                      {data[item.key] && data[item.key].trim() ? (
                        <a
                          href={`https://gipod.vlaanderen.be/inname/${data[item.key].toString().slice(-8)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gipod-link"
                          title="Open GIPOD inname details"
                        >
                          🔗 Bekijk in GIPOD
                        </a>
                      ) : (
                        <a
                          href="https://gipod.vlaanderen.be/inname?periodeType=period#alle-innames"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gipod-link gipod-search-link"
                          title="Zoek GIPOD innames"
                        >
                          🔍 Zoek in GIPOD
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {item.type === 'textarea' && (
                <textarea
                  className="form-textarea"
                  value={data[item.key] || ''}
                  onChange={(e) => handleFieldChange(item.key, e.target.value)}
                  placeholder={item.label}
                  rows={3}
                />
              )}
              
              {item.type === 'checkbox' && (
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id={item.key}
                    checked={Boolean(data[item.key])}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleFieldChange(item.key, e.target.checked)
                    }}
                  />
                  <label htmlFor={item.key} className="checkbox-label">
                    {item.label}
                  </label>
                </div>
              )}

              {/* Toon waarschuwing bij NOK selectie */}
              {data[item.key] && typeof data[item.key] === 'string' && data[item.key].startsWith('NOK') && (
                <div className="warning-message">
                  <span>⚠️</span>
                  <span>Let op: Dit vereist actie of rapportage</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PlannedInspectionPage: React.FC<PlannedInspectionPageProps> = ({
  gpsCoords = null,
  inspectorName = 'Inspecteur Stad Antwerpen',
  locationName = 'St. Jans Vliet, Antwerpen'
}) => {
  const [inspectionData, setInspectionData] = useState<InspectionData>({})
  const [showConfigManager, setShowConfigManager] = useState(false)
  const [selectedInspector, setSelectedInspector] = useState<string>(inspectorName)
  const [availableInspectors, setAvailableInspectors] = useState<Array<{ id: string; name: string; phone: string; assignedPostcodes: string[] }>>([])
  const [configOptions, setConfigOptions] = useState<any>({
    nutsmaatschappijen: [],
    aannemers: [],
    signalisatiebedrijven: [],
    verantwoordelijkePartijen: [],
    postcodes: []
  })

  // Functie om direct inspecteurs uit localStorage te halen
  const getInspectorsFromStorage = () => {
    try {
      // Check alle mogelijke localStorage keys
      console.log('🔍 Alle localStorage keys:', Object.keys(localStorage))
      
      // Check huidige key
      const stored = localStorage.getItem('inspectie-app-config')
      if (stored) {
        const config = JSON.parse(stored)
        console.log('🔍 Direct localStorage check voor inspecteurs (inspectie-app-config):', config.inspecteurs)
        return config.inspecteurs || []
      }
      
      // Check oude key
      const oldStored = localStorage.getItem('inspectionConfig')
      if (oldStored) {
        const config = JSON.parse(oldStored)
        console.log('🔍 Direct localStorage check voor inspecteurs (oude key):', config.inspecteurs)
        return config.inspecteurs || []
      }
      
    } catch (error) {
      console.error('Error reading inspectors from localStorage:', error)
    }
    return []
  }

  // Functie om alle localStorage inhoud te loggen
  const debugAllLocalStorage = () => {
    console.log('🕵️ Volledige localStorage debug:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        console.log(`Key: ${key}`)
        if (key.includes('config') || key.includes('inspect')) {
          try {
            const parsed = JSON.parse(value || '{}')
            console.log('Parsed value:', parsed)
            if (parsed.inspecteurs) {
              console.log('Inspecteurs in deze key:', parsed.inspecteurs.map((i: any) => i.name))
            }
          } catch (e) {
            console.log('Raw value:', value?.substring(0, 200))
          }
        }
      }
    }
  }

  // Laad configuratie uit localStorage met ConfigManager getConfig
  useEffect(() => {
    const loadConfiguration = () => {
      try {
        console.log('🔄 Configuratie laden gestart...')
        
        // Debug alle localStorage inhoud
        debugAllLocalStorage()
        
        // Gebruik de getConfig functie uit ConfigManager
        const config = getConfig()
        console.log('✅ Configuratie geladen via getConfig:', config)
        
        // Backup check voor inspecteurs
        const directInspectors = getInspectorsFromStorage()
        console.log('🔄 Direct localStorage inspecteurs check:', directInspectors)
        
        // Laad inspecteurs
        console.log('🔍 Inspecteurs check:', {
          hasInspecteurs: !!config.inspecteurs,
          isArray: Array.isArray(config.inspecteurs),
          length: config.inspecteurs?.length,
          data: config.inspecteurs
        })
        
        if (config.inspecteurs && Array.isArray(config.inspecteurs) && config.inspecteurs.length > 0) {
          console.log('👥 Inspecteurs succesvol geladen:', config.inspecteurs.length, 'inspecteurs')
          console.log('📋 Inspecteurs lijst:', config.inspecteurs.map(i => ({ name: i.name, phone: i.phone })))
          setAvailableInspectors(config.inspecteurs)
          setSelectedInspector(config.inspecteurs[0].name)
          console.log('✅ Geselecteerde inspecteur:', config.inspecteurs[0].name)
        } else {
          console.log('⚠️ Geen inspecteurs gevonden in configuratie')
          console.log('🔍 Config.inspecteurs waarde:', config.inspecteurs)
          setAvailableInspectors([])
          setSelectedInspector('⚙️ Voeg inspecteurs toe via configuratie')
        }
        
        // Laad alle andere configuratie opties
        const newConfigOptions = {
          nutsmaatschappijen: config.nutsmaatschappijen || [],
          aannemers: config.aannemers || [],
          signalisatiebedrijven: config.signalisatiebedrijven || [],
          verantwoordelijkePartijen: config.verantwoordelijkePartijen || [],
          postcodes: config.postcodes || []
        }
        console.log('📋 ConfigOptions ingesteld:', newConfigOptions)
        console.log('🎯 Verantwoordelijke partijen beschikbaar:', newConfigOptions.verantwoordelijkePartijen.length)
        setConfigOptions(newConfigOptions)
        
      } catch (error) {
        console.error('❌ Fout bij laden van configuratie:', error)
        setAvailableInspectors([])
        setSelectedInspector('Fout bij laden configuratie')
        setConfigOptions({
          nutsmaatschappijen: [],
          aannemers: [],
          signalisatiebedrijven: [],
          verantwoordelijkePartijen: [],
          postcodes: []
        })
      }
    }
    
    loadConfiguration()
  }, []) // Laad eenmalig bij opstarten
  
  // Extra effect voor wanneer config manager wordt gesloten
  useEffect(() => {
    if (!showConfigManager) {
      // Herlaad volledige configuratie na wijzigingen
      let configData = localStorage.getItem('inspectie-app-config')
      if (!configData) {
        configData = localStorage.getItem('inspectionConfig') // fallback
      }
      
      if (configData) {
        try {
          const config = JSON.parse(configData)
          console.log('Configuratie herladen na wijziging:', config)
          
          // Herlaad inspecteurs
          if (config.inspecteurs && Array.isArray(config.inspecteurs)) {
            setAvailableInspectors(config.inspecteurs)
            
            // Behoud huidige selectie als deze nog bestaat, anders selecteer de eerste
            const currentInspectorStillExists = config.inspecteurs.some(
              (inspector: any) => inspector.name === selectedInspector
            )
            if (!currentInspectorStillExists && config.inspecteurs.length > 0) {
              setSelectedInspector(config.inspecteurs[0].name)
            }
          }
          
          // Herlaad alle andere opties
          setConfigOptions({
            nutsmaatschappijen: config.nutsmaatschappijen || [],
            aannemers: config.aannemers || [],
            signalisatiebedrijven: config.signalisatiebedrijven || [],
            verantwoordelijkePartijen: config.verantwoordelijkePartijen || [],
            postcodes: config.postcodes || []
          })
        } catch (error) {
          console.error('Fout bij herladen van configuratie:', error)
        }
      }
    }
  }, [showConfigManager, selectedInspector])

  const convertToDetailedData = (data: { [key: string]: any }) => {
    const detailedData: { [key: string]: any } = {}
    
    // Vind alle multiselect velden
    inspectionSections.forEach(section => {
      section.items.forEach(item => {
        if (item.type === 'multiselect' && Array.isArray(data[item.key])) {
          const responsibleParties: Array<{ nokValue: string; party: string }> = []
          
          // Vind verantwoordelijken voor NOK items
          data[item.key].forEach((selectedValue: string) => {
            const responsibleKey = `${item.key}_${selectedValue}_responsible`
            if (data[responsibleKey]) {
              responsibleParties.push({
                nokValue: selectedValue,
                party: data[responsibleKey]
              })
            }
          })
          
          detailedData[item.key] = {
            type: 'multiselect',
            multiSelectValues: data[item.key],
            responsibleParties
          }
        } else {
          detailedData[item.key] = {
            value: data[item.key],
            type: item.type
          }
        }
      })
    })
    
    return detailedData
  }

  // Gestructureerde inspectie secties gebaseerd op de FLOW CSV
  const inspectionSections = [
    {
      title: "Basisgegevens",
      icon: "📋",
      items: [
        {
          key: "bonu_nr",
          label: "BONU nummer",
          type: "input" as const,
          required: true
        },
        {
          key: "gipod_nr", 
          label: "GIPOD nummer",
          type: "input" as const,
          required: true
        },
        {
          key: "postcode",
          label: "Postcode",
          type: "select" as const,
          required: true,
          options: configOptions.postcodes
        },
        {
          key: "straat_huisnummer",
          label: "Straatnaam en huisnummer",
          type: "input" as const,
          required: true
        },
        {
          key: "locatie_check",
          label: "Locatie controle",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Locatie conform GIPOD" },
            { value: "NOK_grootte", label: "NOK - Grootte werf stemt niet overeen", isNOK: true },
            { value: "NOK_locatie", label: "NOK - Locatie komt niet overeen met GIPOD", isNOK: true }
          ]
        }
      ]
    },
    {
      title: "Betrokken Partijen",
      icon: "👥", 
      items: [
        {
          key: "aannemer",
          label: "Aannemer",
          type: "select" as const,
          required: false,
          options: configOptions.aannemers
        },
        {
          key: "nutsbedrijf",
          label: "Nutsbedrijf",
          type: "select" as const,
          required: true,
          options: configOptions.nutsmaatschappijen
        },
        {
          key: "signalisatiebedrijf",
          label: "Signalisatiebedrijf",
          type: "select" as const,
          required: false,
          options: configOptions.signalisatiebedrijven
        }
      ]
    },
    {
      title: "Veiligheid Werf",
      icon: "🚧",
      items: [
        {
          key: "identificatiebord_nuts",
          label: "Identificatiebord nuts aanwezig?",
          type: "multiselect" as const,
          required: true,
          options: [
            { value: "OK", label: "OK - Werfinformatiebord aanwezig" },
            { 
              value: "NOK_ontbreekt", 
              label: "NOK - Werfinformatiebord nuts ontbreekt", 
              isNOK: true,
              responsible: configOptions.verantwoordelijkePartijen
            },
            { 
              value: "NOK_onvolledig", 
              label: "NOK - Info op werfinformatiebord onvolledig", 
              isNOK: true,
              responsible: configOptions.verantwoordelijkePartijen
            }
          ]
        },
        {
          key: "signalisatie_borden",
          label: "Signalisatieborden begin/einde aanwezig?",
          type: "select" as const,
          required: true,
          options: [
            { value: "OK_BEGIN", label: "OK - Bord begin werken aanwezig (rode driehoek)" },
            { value: "OK_EINDE", label: "OK - Bord einde werken aanwezig (blauwe driehoek)" },
            { value: "NOK_BEGIN", label: "NOK - Bord begin werken ontbreekt", isNOK: true },
            { value: "NOK_EINDE", label: "NOK - Bord einde werken ontbreekt", isNOK: true }
          ]
        },
        {
          key: "werfafbakening",
          label: "Werfafbakening",
          type: "select" as const,
          required: true,
          options: [
            { value: "OK_HARD", label: "OK - Harde afbakeningshekken aanwezig" },
            { value: "OK_GEKOPPELD", label: "OK - Afbakeningsborden aan elkaar gekoppeld" },
            { value: "NOK_NIET_GEKOPPELD", label: "NOK - Hekken niet aan elkaar gekoppeld", isNOK: true },
            { value: "NOK_GEEN_HARDE", label: "NOK - Geen harde afbakeningshekken", isNOK: true },
            { value: "NOK_ZACHTE_NETTEN", label: "NOK - Zachte netten gebruikt", isNOK: true }
          ]
        },
        {
          key: "brugjes_sleuf",
          label: "Brugjes over sleuf aanwezig?",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Brugjes aanwezig en veilig" },
            { value: "NOK_GEEN", label: "NOK - Geen brugjes, toegang niet gegarandeerd", isNOK: true },
            { value: "NOK_ONVEILIG", label: "NOK - Brugjes niet volledig of onveilig", isNOK: true }
          ]
        }
      ]
    },
    {
      title: "Opbraak & Materiaal",
      icon: "🏗️",
      items: [
        {
          key: "natuursteen_ingeslepen",
          label: "Werd natuursteen ingeslepen?",
          type: "checkbox" as const,
          required: false
        },
        {
          key: "asfalt_ingeslepen", 
          label: "Werd asfalt ingeslepen?",
          type: "checkbox" as const,
          required: false
        },
        {
          key: "materialen_veilig_gestockeerd",
          label: "Werden materialen veilig gestockeerd?",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Materialen veilig gestockeerd" },
            { value: "NOK_BUITEN_ZONE", label: "NOK - Herbruikbare materialen buiten werfzone", isNOK: true }
          ]
        },
        {
          key: "materialen_verwijderd",
          label: "Werden niet-herbruikbare materialen verwijderd?",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Niet-herbruikbare materialen afgevoerd" },
            { value: "NOK_NIET_AFGEVOERD", label: "NOK - Materialen niet afgevoerd", isNOK: true }
          ]
        },
        {
          key: "schade_vastgesteld",
          label: "Werd er schade vastgesteld?",
          type: "select" as const,
          required: false,
          options: [
            { value: "GEEN", label: "Geen schade vastgesteld" },
            { value: "NOK_VERHARDING", label: "NOK - Aanpalende verhardingen beschadigd", isNOK: true },
            { value: "NOK_FUNDERING", label: "NOK - Fundering/wegelementen beschadigd", isNOK: true },
            { value: "NOK_ONDERGRONDS", label: "NOK - Ondergrondse constructie beschadigd", isNOK: true },
            { value: "NOK_RIOLERING", label: "NOK - Riolering beschadigd", isNOK: true },
            { value: "NOK_NUTSLEIDINGEN", label: "NOK - Andere nutsleidingen beschadigd", isNOK: true }
          ]
        },
        {
          key: "invloedszone_30cm",
          label: "Werd de invloedszone (30cm) correct toegepast?",
          type: "select" as const,
          required: true,
          options: [
            { value: "OK", label: "OK - 30cm rondom opbraak voorzien" },
            { value: "NOK_GEEN_30CM", label: "NOK - Geen 30cm rondom opbraak voorzien", isNOK: true }
          ]
        }
      ]
    },
    {
      title: "Sleufherstelling",
      icon: "🔧",
      items: [
        {
          key: "sleufaanvulling",
          label: "Sleufaanvulling",
          type: "select" as const,
          required: true,
          options: [
            { value: "OK", label: "OK - Conform verdicht" },
            { value: "NOK_NIET_VERDICHT", label: "NOK - Niet conform verdicht, lagen max 30cm", isNOK: true },
            { value: "NOK_LEIDINGZONE", label: "NOK - Leidingzone niet verdicht om de 20cm", isNOK: true },
            { value: "NOK_AFBRAAKMATERIAAL", label: "NOK - Afbraakmateriaal in sleuf", isNOK: true },
            { value: "NOK_GEEN_ZAND", label: "NOK - Geen geschikt zand gebruikt", isNOK: true }
          ]
        },
        {
          key: "wijze_herstel",
          label: "Wijze van herstel",
          type: "select" as const,
          required: true,
          options: [
            { value: "DEFINITIEF", label: "Definitief (door nutsmaatschappij)" },
            { value: "VOORLOPIG", label: "Voorlopig (herstelbon aan te leveren)" },
            { value: "HERBESTRATINGSBON", label: "Herbestratingsbon gevraagd" },
            { value: "AMBTSHALVE", label: "Ambtshalve herstelling opgelegd" }
          ]
        }
      ]
    },
    {
      title: "Zuiverheid & Afwerking",
      icon: "✨",
      items: [
        {
          key: "zuiverheid_greppel",
          label: "Greppel zuiver?",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Greppel schoon" },
            { value: "NOK_VUIL", label: "NOK - Greppel vuil", isNOK: true }
          ]
        },
        {
          key: "zuiverheid_straat",
          label: "Straat zuiver?", 
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Straat schoon" },
            { value: "NOK_VUIL", label: "NOK - Straat vuil", isNOK: true }
          ]
        },
        {
          key: "signalisatie_opgeruimd",
          label: "Signalisatie opgeruimd?",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Signalisatie opgeruimd" },
            { value: "NOK_ACHTERGELATEN", label: "NOK - Signalisatie achtergelaten", isNOK: true }
          ]
        },
        {
          key: "puin_opgeruimd",
          label: "Puin opgeruimd?",
          type: "select" as const,
          required: false,
          options: [
            { value: "OK", label: "OK - Puin opgeruimd" },
            { value: "NOK_ACHTERGELATEN", label: "NOK - Puin achtergelaten", isNOK: true }
          ]
        },
        {
          key: "opmerkingen",
          label: "Aanvullende opmerkingen",
          type: "textarea" as const,
          required: false
        }
      ]
    }
  ]

  const handleSectionUpdate = (_index: number, updates: InspectionData) => {
    setInspectionData(prev => ({ ...prev, ...updates }))
  }

  const getTotalProgress = () => {
    let totalRequired = 0
    let totalCompleted = 0
    
    inspectionSections.forEach(section => {
      const requiredFields = section.items.filter(item => item.required)
      totalRequired += requiredFields.length
      totalCompleted += requiredFields.filter(item => {
        const value = inspectionData[item.key]
        // For boolean checkboxes
        if (typeof value === 'boolean') {
          return value === true
        }
        // For text inputs and selects
        return value && value !== ''
      }).length
    })
    
    return totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0
  }

  const hasErrors = () => {
    return Object.values(inspectionData).some(value => 
      typeof value === 'string' && value.startsWith('NOK')
    )
  }

  const generateAdvancedReport = () => {
    console.log('🚀 Advanced PDF Report button clicked!')
    
    try {
      console.log('📊 Starting advanced PDF generation...')
      
      const currentDate = new Date()
      const gpsString = gpsCoords 
        ? `${gpsCoords.latitude.toFixed(4)}°N, ${gpsCoords.longitude.toFixed(4)}°E`
        : undefined

      const reportData: ReportData = {
        inspectionDate: currentDate.toLocaleDateString('nl-BE'),
        inspectionTime: currentDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }),
        location: locationName,
        inspector: selectedInspector,
        gpsCoordinates: gpsString,
        inspectionData,
        detailedInspectionData: convertToDetailedData(inspectionData),
        inspectionSections
      }

      console.log('Creating InspectionReportGenerator...')
      const generator = new InspectionReportGenerator()
      console.log('Calling generateReport...')
      generator.generateReport(reportData)
      
      console.log('✅ Advanced PDF generation completed!')
      alert('📊 Geavanceerde PDF Rapport Gegenereerd!\n\nCheck je Downloads folder voor het PDF bestand.')
    } catch (error) {
      console.error('❌ Error in advanced PDF generation:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`❌ Fout bij geavanceerde PDF\n\nProbeer de eenvoudige versie.\n\nError: ${errorMessage}`)
    }
  }

  const generateSimpleReport = () => {
    console.log('📄 Simple PDF Report button clicked!')
    
    try {
      generateSimplePDFReport(inspectionData, inspectionSections)
    } catch (error) {
      console.error('❌ Error in simple PDF generation:', error)
      alert('❌ Fout bij eenvoudige PDF generatie. Check de browser console voor details.')
    }
  }

  const generateCSVReport = () => {
    console.log('📊 CSV Export button clicked!')
    
    try {
      const currentDate = new Date()
      const gpsString = gpsCoords 
        ? `${gpsCoords.latitude.toFixed(4)}°N, ${gpsCoords.longitude.toFixed(4)}°E`
        : undefined

      const csvData: CSVExportData = {
        inspectionData,
        inspectionSections,
        metadata: {
          inspectionDate: currentDate.toLocaleDateString('nl-BE'),
          inspectionTime: currentDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }),
          location: locationName,
          inspector: selectedInspector,
          gpsCoordinates: gpsString
        }
      }

      generateCSVExport(csvData)
    } catch (error) {
      console.error('❌ Error in CSV generation:', error)
      alert('❌ Fout bij CSV export. Check de browser console voor details.')
    }
  }

  const generateSimpleCSV = () => {
    console.log('📋 Simple CSV Export button clicked!')
    
    try {
      generateSimpleCSVOverview(inspectionData, inspectionSections)
      alert('📋 Eenvoudige CSV Export Voltooid!\n\nEen overzicht van alle velden is gedownload.')
    } catch (error) {
      console.error('❌ Error in simple CSV generation:', error)
      alert('❌ Fout bij eenvoudige CSV export. Check de browser console voor details.')
    }
  }

  return (
    <>
      <div className="planned-inspection">
        <div className="inspection-header">
        <div className="header-top">
          <h2>🧭 Gepland Bezoek - Inspectie</h2>
          <button 
            className="config-btn"
            onClick={() => setShowConfigManager(true)}
            title="Configuratie beheer"
          >
            ⚙️
          </button>
        </div>
        
        <div className="inspector-selection">
          <label className="inspector-label">👤 Inspecteur:</label>
          <div className="inspector-controls">
            <select 
              className="inspector-dropdown"
              value={selectedInspector}
              onChange={(e) => setSelectedInspector(e.target.value)}
              title="Selecteer inspecteur"
              disabled={availableInspectors.length === 0}
            >
            {availableInspectors.length > 0 ? (
              availableInspectors.map((inspector) => (
                <option key={inspector.id} value={inspector.name}>
                  {inspector.name} {inspector.phone && `(${inspector.phone})`}
                </option>
              ))
            ) : (
              <option value={selectedInspector}>
                {selectedInspector === 'Geen inspecteurs beschikbaar' 
                  ? '⚙️ Voeg inspecteurs toe via configuratie' 
                  : selectedInspector
                }
              </option>
            )}
          </select>
          <button 
            className="refresh-inspectors-btn"
            onClick={() => {
              console.log('🔄 Handmatig herladen inspecteurs...')
              const directInspectors = getInspectorsFromStorage()
              if (directInspectors && directInspectors.length > 0) {
                setAvailableInspectors(directInspectors)
                setSelectedInspector(directInspectors[0].name)
                console.log('✅ Inspecteurs herlaad succesvol:', directInspectors.length)
              } else {
                console.log('⚠️ Geen inspecteurs gevonden bij handmatig herladen')
              }
            }}
            title="Herlaad inspecteurs uit configuratie"
          >
            🔄
          </button>
          <button 
            className="refresh-inspectors-btn"
            onClick={() => {
              console.log('🔍 Zoeken naar Michel Gerits configuratie...')
              debugAllLocalStorage()
              
              // Zoek in alle localStorage keys naar Michel Gerits
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key) {
                  const value = localStorage.getItem(key)
                  if (value && value.includes('Michel Gerits')) {
                    console.log('🎯 Gevonden! Michel Gerits in key:', key)
                    try {
                      const config = JSON.parse(value)
                      if (config.inspecteurs) {
                        console.log('✅ Correcte inspecteurs lijst gevonden:', config.inspecteurs.map((i: any) => i.name))
                        setAvailableInspectors(config.inspecteurs)
                        setSelectedInspector(config.inspecteurs[0].name)
                      }
                    } catch (e) {
                      console.error('Error parsing config:', e)
                    }
                    break
                  }
                }
              }
            }}
            title="Zoek Michel Gerits configuratie"
          >
            🔍
          </button>
          </div>
        </div>

        <div className="overall-progress">
          <div className="progress-info">
            <span>Totale voortgang: {getTotalProgress()}%</span>
            {hasErrors() && <span className="error-count">⚠️ Actiepunten gevonden</span>}
          </div>
          <div className="progress-bar large">
            <div 
              className="progress-fill"
              data-progress={getTotalProgress()}
            />
          </div>
        </div>
      </div>

      <div className="inspection-sections">
        {inspectionSections.map((section, index) => (
          <InspectionSection
            key={index}
            title={section.title}
            icon={section.icon}
            items={section.items}
            data={inspectionData}
            onUpdate={(updates) => handleSectionUpdate(index, updates)}
            configOptions={configOptions}
          />
        ))}
      </div>

      <div className="inspection-actions">
        <h3 className="export-section-title">
          📊 Rapporten Genereren
        </h3>
        
        <div className="button-group">
          <Button 
            onClick={generateAdvancedReport}
            className="report-button"
            disabled={false}
          >
            📊 Geavanceerde PDF
          </Button>
          
          <Button 
            onClick={generateSimpleReport}
            className="report-button simple-button"
            disabled={false}
          >
            📄 Eenvoudige PDF
          </Button>
        </div>

        <h4 className="export-subsection-title">
          📋 Data Export
        </h4>
        
        <div className="button-group">
          <Button 
            onClick={generateCSVReport}
            className="report-button csv-button"
            disabled={false}
          >
            📋 Volledige CSV Export
          </Button>
          
          <Button 
            onClick={generateSimpleCSV}
            className="report-button csv-simple-button"
            disabled={false}
          >
            📄 Overzicht CSV
          </Button>
        </div>
        
        <div className="action-info">
          <small>
            <strong>PDF Rapporten:</strong> Lege velden worden getoond als "N.v.t."
            {hasErrors() && ' - ⚠️ NOK items worden opgesomd voor opvolging.'}<br />
            <strong>CSV Export:</strong> Alle velden met officiële namen, status en metadata.<br />
            <em>CSV bestanden kunnen worden geopend in Excel of andere spreadsheet programma's.</em>
          </small>
        </div>
      </div>
      </div>

      {showConfigManager && (
        <ConfigManager 
          onClose={() => setShowConfigManager(false)}
        />
      )}
    </>
  )
}

export default PlannedInspectionPage
