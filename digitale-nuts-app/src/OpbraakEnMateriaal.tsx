import React, { useState } from 'react'
import './OpbraakEnMateriaal.css'

interface FormData {
  natuursteenIngeslepen: boolean
  asfaltIngeslepen: boolean
  materiarenVeiligGestockeerd: string
}

interface FormErrors {
  natuursteenIngeslepen?: string
  asfaltIngeslepen?: string
  materiarenVeiligGestockeerd?: string
}

interface CheckboxFieldProps {
  id: string
  name: keyof FormData
  label: string
  checked: boolean
  required?: boolean
  error?: string
  onChange: (name: keyof FormData, value: boolean) => void
  onBlur: (name: keyof FormData) => void
}

interface SelectFieldProps {
  id: string
  name: keyof FormData
  label: string
  value: string
  required?: boolean
  error?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
  onChange: (name: keyof FormData, value: string) => void
  onBlur: (name: keyof FormData) => void
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  id,
  name,
  label,
  checked,
  required = false,
  error,
  onChange,
  onBlur
}) => {
  return (
    <div className="form-group">
      <div className="checkbox-container">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          required={required}
          aria-required={required ? "true" : "false"}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            e.stopPropagation()
            onChange(name, e.target.checked)
          }}
          onBlur={() => onBlur(name)}
        />
        <label htmlFor={id} className="checkbox-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const SelectField: React.FC<SelectFieldProps> = ({
  id,
  name,
  label,
  value,
  required = false,
  error,
  options,
  onChange,
  onBlur
}) => {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <select
        id={id}
        value={value}
        required={required}
        aria-required={required ? "true" : "false"}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`form-select ${error ? 'error' : ''}`}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={option.value.startsWith('NOK') ? 'nok-option' : ''}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const OpbraakEnMateriaal: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    natuursteenIngeslepen: false,
    asfaltIngeslepen: false,
    materiarenVeiligGestockeerd: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Set<keyof FormData>>(new Set())

  const selectOptions = [
    { value: '', label: 'Selecteer optie…', disabled: true },
    { value: 'OK', label: 'OK - Materialen veilig gestockeerd' },
    { value: 'NOK', label: 'NOK - Herbruikbare materialen buiten werfzone' }
  ]

  const validateField = (name: keyof FormData, value: any): string | undefined => {
    switch (name) {
      case 'natuursteenIngeslepen':
      case 'asfaltIngeslepen':
        // Voor checkboxes is er geen validatiefout - ze kunnen true/false zijn
        return undefined
      case 'materiarenVeiligGestockeerd':
        if (!value || value === '') {
          return 'Kies een optie.'
        }
        return undefined
      default:
        return undefined
    }
  }

  const handleChange = (name: keyof FormData, value: boolean | string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing/selecting
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleBlur = (name: keyof FormData) => {
    setTouched(prev => new Set(prev).add(name))
    
    const error = validateField(name, formData[name])
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const newErrors: FormErrors = {}
    const allFields: Array<keyof FormData> = ['natuursteenIngeslepen', 'asfaltIngeslepen', 'materiarenVeiligGestockeerd']
    
    allFields.forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field] = error
      }
    })
    
    setErrors(newErrors)
    setTouched(new Set(allFields))
    
    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted successfully:', formData)
      alert('Formulier succesvol ingediend! Bekijk de console voor de waarden.')
    } else {
      console.log('Form has errors:', newErrors)
    }
  }

  return (
    <div className="opbraak-en-materiaal">
      <fieldset className="form-fieldset">
        <legend className="form-legend">Opbraak & Materiaal</legend>
        
        <form onSubmit={handleSubmit} noValidate>
          <CheckboxField
            id="natuursteen-ingeslepen"
            name="natuursteenIngeslepen"
            label="Werd natuursteen ingeslepen?"
            checked={formData.natuursteenIngeslepen}
            required={true}
            error={touched.has('natuursteenIngeslepen') ? errors.natuursteenIngeslepen : undefined}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <CheckboxField
            id="asfalt-ingeslepen"
            name="asfaltIngeslepen"
            label="Werd asfalt ingeslepen?"
            checked={formData.asfaltIngeslepen}
            required={true}
            error={touched.has('asfaltIngeslepen') ? errors.asfaltIngeslepen : undefined}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <SelectField
            id="materialen-veilig-gestockeerd"
            name="materiarenVeiligGestockeerd"
            label="Werden materialen veilig gestockeerd?"
            value={formData.materiarenVeiligGestockeerd}
            required={true}
            error={touched.has('materiarenVeiligGestockeerd') ? errors.materiarenVeiligGestockeerd : undefined}
            options={selectOptions}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <div className="form-actions">
            <button type="submit" className="submit-button">
              Opslaan
            </button>
          </div>
        </form>
      </fieldset>
    </div>
  )
}

export default OpbraakEnMateriaal