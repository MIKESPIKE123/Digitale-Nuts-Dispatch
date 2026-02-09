import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Config, ConfigOption, Inspector, SyncSettings, WorkPartiesConfig } from '../lib/storage'
import { sanitizeOptionList, toOptionValue, WorkPartyGroupKey } from '../lib/workParties'

interface ConfigPanelProps {
  isOpen: boolean
  config: Config
  syncSettings: SyncSettings
  onClose: () => void
  onSave: (nextConfig: Config, nextSyncSettings: SyncSettings) => void
}

type ConfigTab = 'general' | 'who_works' | 'data'

const PHONE_REGEX = /^0\d{3}\s\d{3}\s\d{3}$/

const WORK_PARTY_GROUPS: Array<{ key: WorkPartyGroupKey; title: string; hint: string }> = [
  {
    key: 'aannemers',
    title: 'Aannemers',
    hint: 'Wordt gebruikt voor het veld Aannemer.'
  },
  {
    key: 'signalisatiebedrijven',
    title: 'Signalisatiebedrijven',
    hint: 'Wordt gebruikt voor het veld Signalisatiebedrijf.'
  },
  {
    key: 'nutsbedrijven',
    title: 'Nutsbedrijven',
    hint: 'Wordt gebruikt voor het veld Nutsbedrijf.'
  }
]

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

const isValidPhone = (value?: string) => {
  if (!value || !value.trim()) return true
  return PHONE_REGEX.test(value.trim())
}

const parseOptionArray = (raw: unknown): ConfigOption[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const label = item.trim()
        if (!label) return null
        return {
          value: toOptionValue(label) || crypto.randomUUID(),
          label
        }
      }

      if (typeof item !== 'object' || item === null) return null

      const option = item as Partial<ConfigOption>
      const label = typeof option.label === 'string' ? option.label.trim() : ''
      if (!label) return null

      const value = typeof option.value === 'string' && option.value.trim()
        ? option.value.trim()
        : toOptionValue(label) || crypto.randomUUID()

      return {
        value,
        label
      }
    })
    .filter((item): item is ConfigOption => item !== null)
}

const normalizeAssignedPostcodes = (assigned: string[], postcodes: ConfigOption[]) => {
  const normalized: string[] = []

  assigned.forEach((entry) => {
    const value = entry.trim()
    if (!value) return

    const exactByValue = postcodes.find((option) => option.value === value)
    if (exactByValue) {
      normalized.push(exactByValue.value)
      return
    }

    const exactByLabel = postcodes.find((option) => option.label.toLowerCase() === value.toLowerCase())
    if (exactByLabel) {
      normalized.push(exactByLabel.value)
    }
  })

  return Array.from(new Set(normalized))
}

const sanitizeWorkParties = (raw: WorkPartiesConfig): WorkPartiesConfig => ({
  aannemers: sanitizeOptionList(raw.aannemers),
  signalisatiebedrijven: sanitizeOptionList(raw.signalisatiebedrijven),
  nutsbedrijven: sanitizeOptionList(raw.nutsbedrijven)
})

const sanitizeConfig = (draft: Config): Config => {
  const postcodes = sanitizeOptionList(draft.postcodes)

  const inspectors: Inspector[] = draft.inspectors
    .map((inspector) => ({
      id: inspector.id,
      name: inspector.name.trim(),
      phone: inspector.phone?.trim() || undefined,
      assignedPostcodes: normalizeAssignedPostcodes(inspector.assignedPostcodes || [], postcodes)
    }))
    .filter((inspector) => inspector.name)

  return {
    inspectors,
    responsibleParties: sanitizeOptionList(draft.responsibleParties),
    workParties: sanitizeWorkParties(draft.workParties),
    postcodes
  }
}

const parseInspectors = (raw: unknown, postcodes: ConfigOption[], fallback: Inspector[]): Inspector[] => {
  if (!Array.isArray(raw)) return fallback

  const inspectors = raw
    .map((item): Inspector | null => {
      if (typeof item !== 'object' || item === null) return null
      const inspector = item as Partial<Inspector>

      const name = typeof inspector.name === 'string' ? inspector.name.trim() : ''
      if (!name) return null

      const assignedSource = Array.isArray(inspector.assignedPostcodes)
        ? inspector.assignedPostcodes
        : []

      const assigned = assignedSource
        .filter((entry): entry is string => typeof entry === 'string')

      return {
        id: typeof inspector.id === 'string' && inspector.id.trim() ? inspector.id : crypto.randomUUID(),
        name,
        phone: typeof inspector.phone === 'string' ? formatPhoneInput(inspector.phone) : undefined,
        assignedPostcodes: normalizeAssignedPostcodes(assigned, postcodes)
      }
    })
    .filter((item): item is Inspector => item !== null)

  return inspectors.length > 0 ? inspectors : fallback
}

const coerceImportedConfig = (raw: unknown, fallback: Config): Config => {
  if (typeof raw !== 'object' || raw === null) return fallback

  const root = raw as Record<string, any>
  const candidate = typeof root.config === 'object' && root.config !== null ? root.config : root

  const postcodes = sanitizeOptionList(
    parseOptionArray(candidate.postcodes).length > 0
      ? parseOptionArray(candidate.postcodes)
      : fallback.postcodes
  )

  const inspectors = parseInspectors(candidate.inspectors ?? candidate.inspecteurs, postcodes, fallback.inspectors)

  const responsibleParties = sanitizeOptionList(
    parseOptionArray(candidate.responsibleParties ?? candidate.verantwoordelijkePartijen).length > 0
      ? parseOptionArray(candidate.responsibleParties ?? candidate.verantwoordelijkePartijen)
      : fallback.responsibleParties
  )

  const workPartiesRoot =
    typeof candidate.workParties === 'object' && candidate.workParties !== null ? candidate.workParties : {}

  const workParties: WorkPartiesConfig = sanitizeWorkParties({
    aannemers: parseOptionArray(workPartiesRoot.aannemers ?? candidate.aannemers).length > 0
      ? parseOptionArray(workPartiesRoot.aannemers ?? candidate.aannemers)
      : fallback.workParties.aannemers,
    signalisatiebedrijven:
      parseOptionArray(workPartiesRoot.signalisatiebedrijven ?? candidate.signalisatiebedrijven).length > 0
        ? parseOptionArray(workPartiesRoot.signalisatiebedrijven ?? candidate.signalisatiebedrijven)
        : fallback.workParties.signalisatiebedrijven,
    nutsbedrijven: parseOptionArray(
      workPartiesRoot.nutsbedrijven ?? candidate.nutsbedrijven ?? candidate.nutsmaatschappijen
    ).length > 0
      ? parseOptionArray(
          workPartiesRoot.nutsbedrijven ?? candidate.nutsbedrijven ?? candidate.nutsmaatschappijen
        )
      : fallback.workParties.nutsbedrijven
  })

  return {
    inspectors,
    responsibleParties,
    workParties,
    postcodes
  }
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  config,
  syncSettings,
  onClose,
  onSave
}) => {
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const [activeTab, setActiveTab] = useState<ConfigTab>('general')
  const [draftConfig, setDraftConfig] = useState<Config>(config)
  const [draftSyncSettings, setDraftSyncSettings] = useState<SyncSettings>(syncSettings)

  const [inspectorInput, setInspectorInput] = useState('')
  const [inspectorPhoneInput, setInspectorPhoneInput] = useState('')
  const [partyInput, setPartyInput] = useState('')
  const [postcodeInput, setPostcodeInput] = useState('')

  const [workPartyInputs, setWorkPartyInputs] = useState<Record<WorkPartyGroupKey, string>>({
    aannemers: '',
    signalisatiebedrijven: '',
    nutsbedrijven: ''
  })

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isOpen) return

    setActiveTab('general')
    setDraftConfig(config)
    setDraftSyncSettings(syncSettings)
    setInspectorInput('')
    setInspectorPhoneInput('')
    setPartyInput('')
    setPostcodeInput('')
    setWorkPartyInputs({
      aannemers: '',
      signalisatiebedrijven: '',
      nutsbedrijven: ''
    })
    setError('')
    setNotice('')
  }, [isOpen, config, syncSettings])

  const sortedInspectors = useMemo(
    () => [...draftConfig.inspectors].sort((a, b) => a.name.localeCompare(b.name, 'nl-BE')),
    [draftConfig.inspectors]
  )

  const sortedResponsibleParties = useMemo(
    () => [...draftConfig.responsibleParties].sort((a, b) => a.label.localeCompare(b.label, 'nl-BE')),
    [draftConfig.responsibleParties]
  )

  const sortedPostcodes = useMemo(
    () => [...draftConfig.postcodes].sort((a, b) => a.label.localeCompare(b.label, 'nl-BE')),
    [draftConfig.postcodes]
  )

  if (!isOpen) return null

  const clearMessages = () => {
    setError('')
    setNotice('')
  }

  const addInspector = () => {
    clearMessages()

    const name = inspectorInput.trim()
    const phone = formatPhoneInput(inspectorPhoneInput)

    if (!name) {
      setError('Inspecteurnaam is verplicht.')
      return
    }

    if (!isValidPhone(phone)) {
      setError('Telefoon moet formaat 0XXX XXX XXX hebben (bv. 0475 371 699).')
      return
    }

    const exists = draftConfig.inspectors.some((inspector) => inspector.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      setError('Inspecteur bestaat al.')
      return
    }

    setDraftConfig((prev) => ({
      ...prev,
      inspectors: [
        ...prev.inspectors,
        {
          id: crypto.randomUUID(),
          name,
          phone: phone || undefined,
          assignedPostcodes: []
        }
      ]
    }))

    setInspectorInput('')
    setInspectorPhoneInput('')
    setNotice('Inspecteur toegevoegd.')
  }

  const removeInspector = (id: string) => {
    clearMessages()

    setDraftConfig((prev) => ({
      ...prev,
      inspectors: prev.inspectors.filter((inspector) => inspector.id !== id)
    }))
  }

  const updateInspector = (id: string, patch: Partial<Inspector>) => {
    clearMessages()

    setDraftConfig((prev) => ({
      ...prev,
      inspectors: prev.inspectors.map((inspector) => {
        if (inspector.id !== id) return inspector

        return {
          ...inspector,
          ...patch,
          assignedPostcodes: patch.assignedPostcodes ?? inspector.assignedPostcodes ?? []
        }
      })
    }))
  }

  const updateInspectorPostcodes = (id: string, selectedValues: string[]) => {
    updateInspector(id, { assignedPostcodes: selectedValues })
  }

  const addResponsibleParty = () => {
    clearMessages()

    const label = partyInput.trim()
    if (!label) {
      setError('Verantwoordelijke partij is verplicht.')
      return
    }

    const exists = draftConfig.responsibleParties.some((party) => party.label.toLowerCase() === label.toLowerCase())
    if (exists) {
      setError('Deze verantwoordelijke partij bestaat al.')
      return
    }

    setDraftConfig((prev) => ({
      ...prev,
      responsibleParties: [
        ...prev.responsibleParties,
        {
          value: toOptionValue(label) || crypto.randomUUID(),
          label
        }
      ]
    }))

    setPartyInput('')
    setNotice('Verantwoordelijke partij toegevoegd.')
  }

  const removeResponsibleParty = (value: string) => {
    clearMessages()

    setDraftConfig((prev) => ({
      ...prev,
      responsibleParties: prev.responsibleParties.filter((party) => party.value !== value)
    }))
  }

  const updateResponsibleParty = (value: string, nextLabel: string) => {
    clearMessages()

    setDraftConfig((prev) => ({
      ...prev,
      responsibleParties: prev.responsibleParties.map((party) =>
        party.value === value
          ? {
              ...party,
              label: nextLabel
            }
          : party
      )
    }))
  }

  const addPostcode = () => {
    clearMessages()

    const label = postcodeInput.trim()
    if (!label) {
      setError('Postcode label is verplicht (bv. 2000 Antwerpen).')
      return
    }

    const exists = draftConfig.postcodes.some((option) => option.label.toLowerCase() === label.toLowerCase())
    if (exists) {
      setError('Deze postcode bestaat al.')
      return
    }

    const extracted = label.match(/\d{4}/)?.[0] || ''

    setDraftConfig((prev) => ({
      ...prev,
      postcodes: [
        ...prev.postcodes,
        {
          value: extracted || toOptionValue(label) || crypto.randomUUID(),
          label
        }
      ]
    }))

    setPostcodeInput('')
    setNotice('Postcode toegevoegd.')
  }

  const removePostcode = (value: string) => {
    clearMessages()

    setDraftConfig((prev) => {
      const nextPostcodes = prev.postcodes.filter((postcode) => postcode.value !== value)
      return {
        ...prev,
        postcodes: nextPostcodes,
        inspectors: prev.inspectors.map((inspector) => ({
          ...inspector,
          assignedPostcodes: inspector.assignedPostcodes.filter((assigned) => assigned !== value)
        }))
      }
    })
  }

  const updatePostcode = (value: string, nextLabel: string) => {
    clearMessages()

    setDraftConfig((prev) => ({
      ...prev,
      postcodes: prev.postcodes.map((postcode) =>
        postcode.value === value
          ? {
              ...postcode,
              label: nextLabel
            }
          : postcode
      )
    }))
  }

  const updateWorkPartyList = (group: WorkPartyGroupKey, nextList: ConfigOption[]) => {
    setDraftConfig((prev) => ({
      ...prev,
      workParties: {
        ...prev.workParties,
        [group]: nextList
      }
    }))
  }

  const addWorkPartyOption = (group: WorkPartyGroupKey) => {
    clearMessages()

    const label = workPartyInputs[group].trim()
    if (!label) {
      setError('Naam is verplicht.')
      return
    }

    const current = draftConfig.workParties[group]
    const exists = current.some((option) => option.label.toLowerCase() === label.toLowerCase())
    if (exists) {
      setError(`Waarde bestaat al in ${group}.`)
      return
    }

    updateWorkPartyList(group, [
      ...current,
      {
        value: toOptionValue(label) || crypto.randomUUID(),
        label
      }
    ])

    setWorkPartyInputs((prev) => ({ ...prev, [group]: '' }))
    setNotice('Waarde toegevoegd.')
  }

  const removeWorkPartyOption = (group: WorkPartyGroupKey, value: string) => {
    clearMessages()

    updateWorkPartyList(
      group,
      draftConfig.workParties[group].filter((option) => option.value !== value)
    )
  }

  const updateWorkPartyOptionLabel = (group: WorkPartyGroupKey, value: string, nextLabel: string) => {
    clearMessages()

    updateWorkPartyList(
      group,
      draftConfig.workParties[group].map((option) =>
        option.value === value
          ? {
              ...option,
              label: nextLabel
            }
          : option
      )
    )
  }

  const exportConfig = () => {
    clearMessages()

    const payload = {
      exportedAt: new Date().toISOString(),
      exportVersion: 1,
      config: sanitizeConfig(draftConfig)
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `digitale-nuts-config-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setNotice('Configuratie geëxporteerd.')
  }

  const importConfigFromFile = async (file: File) => {
    clearMessages()

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const imported = coerceImportedConfig(parsed, draftConfig)
      setDraftConfig(imported)
      setActiveTab('general')
      setNotice('Configuratie succesvol geïmporteerd.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import mislukt.'
      setError(`Import mislukt: ${message}`)
    }
  }

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    void importConfigFromFile(file)
    event.currentTarget.value = ''
  }

  const saveAll = () => {
    clearMessages()

    const sanitizedConfig = sanitizeConfig(draftConfig)

    if (sanitizedConfig.inspectors.length === 0) {
      setError('Minstens 1 inspecteur is vereist.')
      setActiveTab('general')
      return
    }

    if (sanitizedConfig.responsibleParties.length === 0) {
      setError('Minstens 1 verantwoordelijke partij is vereist.')
      setActiveTab('general')
      return
    }

    if (sanitizedConfig.postcodes.length === 0) {
      setError('Minstens 1 postcode is vereist.')
      setActiveTab('general')
      return
    }

    const invalidPhone = sanitizedConfig.inspectors.find((inspector) => !isValidPhone(inspector.phone))
    if (invalidPhone) {
      setError(`Telefoonnummer ongeldig bij inspecteur ${invalidPhone.name}. Gebruik formaat 0XXX XXX XXX.`)
      setActiveTab('general')
      return
    }

    const endpoint = draftSyncSettings.endpoint.trim()
    if (!endpoint) {
      setError('Sync endpoint is verplicht.')
      setActiveTab('general')
      return
    }

    onSave(sanitizedConfig, {
      ...draftSyncSettings,
      endpoint
    })

    onClose()
  }

  return (
    <div className="dn-modal-backdrop" role="dialog" aria-modal="true" aria-label="Configuratie">
      <div className="dn-modal">
        <div className="dn-modal-header">
          <h2>Configuratie</h2>
          <button type="button" className="dn-secondary-btn" onClick={onClose}>
            Sluiten
          </button>
        </div>

        <div className="dn-tab-row" role="tablist" aria-label="Configuratie tabbladen">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'general'}
            className={`dn-tab-btn ${activeTab === 'general' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            Algemeen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'who_works'}
            className={`dn-tab-btn ${activeTab === 'who_works' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('who_works')}
          >
            Wie werkt er?
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'data'}
            className={`dn-tab-btn ${activeTab === 'data' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Import/Export
          </button>
        </div>

        {activeTab === 'general' && (
          <>
            <div className="dn-modal-section">
              <h3>Inspecteurs</h3>
              <div className="dn-form-grid">
                {sortedInspectors.map((inspector) => (
                  <div key={inspector.id} className="dn-inspector-card">
                    <div className="dn-inline-edit-row">
                      <input
                        className="dn-input"
                        value={inspector.name}
                        onChange={(e) => updateInspector(inspector.id, { name: e.target.value })}
                        placeholder="Naam"
                      />
                      <input
                        className={`dn-input ${!isValidPhone(inspector.phone) ? 'dn-input--danger' : ''}`}
                        value={inspector.phone || ''}
                        onChange={(e) => updateInspector(inspector.id, { phone: formatPhoneInput(e.target.value) })}
                        placeholder="0XXX XXX XXX"
                      />
                      <button type="button" className="dn-danger-btn" onClick={() => removeInspector(inspector.id)}>
                        Verwijder
                      </button>
                    </div>
                    <label className="dn-config-label">
                      Toegewezen postcodes
                      <select
                        className="dn-input dn-multi-select"
                        multiple
                        value={inspector.assignedPostcodes || []}
                        onChange={(e) => {
                          const selectedValues = Array.from(e.currentTarget.selectedOptions).map((option) => option.value)
                          updateInspectorPostcodes(inspector.id, selectedValues)
                        }}
                      >
                        {sortedPostcodes.map((postcode) => (
                          <option key={postcode.value} value={postcode.value}>
                            {postcode.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
              <div className="dn-inline-edit-row">
                <input
                  className="dn-input"
                  value={inspectorInput}
                  onChange={(e) => setInspectorInput(e.target.value)}
                  placeholder="Nieuwe inspecteur"
                />
                <input
                  className="dn-input"
                  value={inspectorPhoneInput}
                  onChange={(e) => setInspectorPhoneInput(formatPhoneInput(e.target.value))}
                  placeholder="0XXX XXX XXX"
                />
                <button type="button" className="dn-secondary-btn" onClick={addInspector}>
                  Toevoegen
                </button>
              </div>
            </div>

            <div className="dn-modal-section">
              <h3>Postcodes</h3>
              <div className="dn-form-grid">
                {sortedPostcodes.map((postcode) => (
                  <div key={postcode.value} className="dn-inline-edit-row dn-inline-edit-row--compact">
                    <input
                      className="dn-input"
                      value={postcode.label}
                      onChange={(e) => updatePostcode(postcode.value, e.target.value)}
                      placeholder="2000 Antwerpen"
                    />
                    <button type="button" className="dn-danger-btn" onClick={() => removePostcode(postcode.value)}>
                      Verwijder
                    </button>
                  </div>
                ))}
              </div>
              <div className="dn-inline-edit-row dn-inline-edit-row--compact">
                <input
                  className="dn-input"
                  value={postcodeInput}
                  onChange={(e) => setPostcodeInput(e.target.value)}
                  placeholder="Nieuwe postcode (bv. 2000 Antwerpen)"
                />
                <button type="button" className="dn-secondary-btn" onClick={addPostcode}>
                  Toevoegen
                </button>
              </div>
            </div>

            <div className="dn-modal-section">
              <h3>Verantwoordelijke partijen</h3>
              <div className="dn-form-grid">
                {sortedResponsibleParties.map((party) => (
                  <div key={party.value} className="dn-inline-edit-row dn-inline-edit-row--compact">
                    <input
                      className="dn-input"
                      value={party.label}
                      onChange={(e) => updateResponsibleParty(party.value, e.target.value)}
                      placeholder="Label"
                    />
                    <button type="button" className="dn-danger-btn" onClick={() => removeResponsibleParty(party.value)}>
                      Verwijder
                    </button>
                  </div>
                ))}
              </div>
              <div className="dn-inline-edit-row dn-inline-edit-row--compact">
                <input
                  className="dn-input"
                  value={partyInput}
                  onChange={(e) => setPartyInput(e.target.value)}
                  placeholder="Nieuwe partij"
                />
                <button type="button" className="dn-secondary-btn" onClick={addResponsibleParty}>
                  Toevoegen
                </button>
              </div>
            </div>

            <div className="dn-modal-section">
              <h3>Sync instellingen</h3>
              <label className="dn-config-label">
                Endpoint
                <input
                  className="dn-input"
                  value={draftSyncSettings.endpoint}
                  onChange={(e) =>
                    setDraftSyncSettings((prev) => ({
                      ...prev,
                      endpoint: e.target.value
                    }))
                  }
                  placeholder="https://api.example.com/inspecties/sync"
                />
              </label>

              <label className="dn-config-label">
                Timeout (ms)
                <input
                  className="dn-input"
                  type="number"
                  min={1000}
                  step={500}
                  value={draftSyncSettings.requestTimeoutMs}
                  onChange={(e) =>
                    setDraftSyncSettings((prev) => ({
                      ...prev,
                      requestTimeoutMs: Number(e.target.value) || prev.requestTimeoutMs
                    }))
                  }
                />
              </label>

              <label className="dn-checkbox-row">
                <input
                  type="checkbox"
                  checked={draftSyncSettings.autoSyncOnOnline}
                  onChange={(e) =>
                    setDraftSyncSettings((prev) => ({
                      ...prev,
                      autoSyncOnOnline: e.target.checked
                    }))
                  }
                />
                <span>Automatisch syncen zodra internet terug online komt</span>
              </label>
            </div>
          </>
        )}

        {activeTab === 'who_works' && (
          <>
            {WORK_PARTY_GROUPS.map((group) => (
              <div key={group.key} className="dn-modal-section">
                <h3>{group.title}</h3>
                <p className="dn-muted">{group.hint}</p>

                <div className="dn-form-grid">
                  {draftConfig.workParties[group.key].map((option) => (
                    <div key={option.value} className="dn-inline-edit-row dn-inline-edit-row--compact">
                      <input
                        className="dn-input"
                        value={option.label}
                        onChange={(e) => updateWorkPartyOptionLabel(group.key, option.value, e.target.value)}
                        placeholder={`Naam ${group.title.toLowerCase()}`}
                      />
                      <button
                        type="button"
                        className="dn-danger-btn"
                        onClick={() => removeWorkPartyOption(group.key, option.value)}
                      >
                        Verwijder
                      </button>
                    </div>
                  ))}
                </div>

                <div className="dn-inline-edit-row dn-inline-edit-row--compact">
                  <input
                    className="dn-input"
                    value={workPartyInputs[group.key]}
                    onChange={(e) =>
                      setWorkPartyInputs((prev) => ({
                        ...prev,
                        [group.key]: e.target.value
                      }))
                    }
                    placeholder={`Nieuwe waarde voor ${group.title.toLowerCase()}`}
                  />
                  <button type="button" className="dn-secondary-btn" onClick={() => addWorkPartyOption(group.key)}>
                    Toevoegen
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'data' && (
          <div className="dn-modal-section">
            <h3>Configuratie import/export</h3>
            <p className="dn-muted">
              Exporteer een JSON backup voor overdracht. Importeer een JSON bestand om volledige configuratie
              terug te zetten (inspecteurs, postcodes, partijen, wie werkt er).
            </p>
            <div className="dn-actions">
              <button type="button" className="dn-secondary-btn" onClick={exportConfig}>
                Exporteer configuratie (JSON)
              </button>
              <button
                type="button"
                className="dn-secondary-btn"
                onClick={() => importInputRef.current?.click()}
              >
                Importeer configuratie (JSON)
              </button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="dn-photo-input"
              onChange={handleImportFileChange}
            />
          </div>
        )}

        {error && <div className="dn-error">{error}</div>}
        {notice && <div className="dn-muted">{notice}</div>}

        <div className="dn-modal-actions">
          <button type="button" className="dn-secondary-btn" onClick={onClose}>
            Annuleren
          </button>
          <button type="button" className="dn-primary-btn" onClick={saveAll}>
            Bewaar configuratie
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfigPanel
