import { ParsedSchema } from './schema'

export interface NokFinding {
  section: string
  field: string
  value: string
  responsible?: string
}

const isNokValue = (value: string) => value.toUpperCase().startsWith('NOK')

export const collectNokFindings = (schema: ParsedSchema, data: Record<string, any>) => {
  const findings: NokFinding[] = []

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const value = data[field.key]
      if (!value) return

      if (Array.isArray(value)) {
        value.forEach((entry: string) => {
          if (isNokValue(entry)) {
            const respKey = `${field.key}__responsible__${entry}`
            findings.push({
              section: section.title,
              field: field.label,
              value: entry,
              responsible: data[respKey]
            })
          }
        })
      } else if (typeof value === 'string' && isNokValue(value)) {
        findings.push({
          section: section.title,
          field: field.label,
          value,
          responsible: data[`${field.key}__responsible`]
        })
      }
    })
  })

  return findings
}

export const getPermitStatus = (schema: ParsedSchema, data: Record<string, any>) => {
  const getField = (labelIncludes: string[]) => {
    const entry = Object.values(schema.index.fieldsByLabel).find((field) =>
      labelIncludes.some((token) => field.label.toLowerCase().includes(token))
    )
    return entry ? data[entry.key] : ''
  }

  const domainPermit = getField(['gipod'])
  const signPermit = getField(['signalisatievergunning', 'jaartoelating signalisatie'])
  const domainDigits = typeof domainPermit === 'string' ? domainPermit.replace(/\D/g, '') : ''

  return {
    domain: domainDigits.length >= 8 ? 'OK' : 'NOK',
    signalisatie: signPermit ? 'OK' : 'NOK'
  }
}

export const buildDetailedData = (schema: ParsedSchema, data: Record<string, any>) => {
  const detailed: Record<string, any> = {}

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const value = data[field.key]
      if (value === undefined) return
      if (Array.isArray(value)) {
        detailed[field.key] = {
          type: 'multiselect',
          multiSelectValues: value,
          responsibleParties: value
            .filter((entry) => entry && entry.toUpperCase().startsWith('NOK'))
            .map((entry) => ({
              nokValue: entry,
              party: data[`${field.key}__responsible__${entry}`]
            }))
        }
      } else {
        detailed[field.key] = {
          type: 'select',
          value
        }
        const responsibleValue = data[`${field.key}__responsible`]
        if (responsibleValue) {
          detailed[`${field.key}__responsible`] = { value: responsibleValue }
        }
      }
    })
  })

  return detailed
}
