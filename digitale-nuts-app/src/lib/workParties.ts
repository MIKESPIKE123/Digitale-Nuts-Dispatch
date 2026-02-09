import { ParsedSchema } from './schema'
import { ConfigOption, WorkPartiesConfig } from './storage'

export type WorkPartyGroupKey = keyof WorkPartiesConfig

const FALLBACK_WORK_PARTIES: WorkPartiesConfig = {
  aannemers: [
    { value: 'gs_solutions', label: 'GS Solutions' },
    { value: 'cas_vos', label: 'Cas-Vos' }
  ],
  signalisatiebedrijven: [
    { value: 'zelfde_als_nutsmaatschappij', label: 'Zelfde als nutsmaatschappij' },
    { value: 'fero', label: 'FERO' },
    { value: 'verbruggen', label: 'Verbruggen' }
  ],
  nutsbedrijven: [
    { value: 'fluvius', label: 'Fluvius' },
    { value: 'waterlink_water', label: 'Waterlink (water)' },
    { value: 'waterlink_rio', label: 'Waterlink (RIO)' },
    { value: 'wyre', label: 'WYRE' },
    { value: 'aquafin', label: 'AQUAFIN' },
    { value: 'proximus', label: 'PROXIMUS' }
  ]
}

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

export const toOptionValue = (label: string) =>
  label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

const toUniqueOptions = (labels: string[], fallback: ConfigOption[]) => {
  const seen = new Set<string>()
  const options: ConfigOption[] = []

  labels.forEach((label) => {
    const trimmed = label.trim()
    if (!trimmed) return

    const key = normalize(trimmed)
    if (seen.has(key)) return

    seen.add(key)
    options.push({ value: toOptionValue(trimmed) || crypto.randomUUID(), label: trimmed })
  })

  if (options.length > 0) return options
  return fallback
}

export const getWorkPartyGroupForField = (
  sectionTitle: string,
  fieldLabel: string
): WorkPartyGroupKey | null => {
  const section = normalize(sectionTitle)
  const label = normalize(fieldLabel)

  if (!section.includes('wie werkt')) return null

  if (label.includes('aannemer')) return 'aannemers'
  if (label.includes('signalisatiebedrijf')) return 'signalisatiebedrijven'
  if (label.includes('nutsbedrijf')) return 'nutsbedrijven'

  return null
}

const collectSectionLabels = (
  schema: ParsedSchema,
  targetGroup: WorkPartyGroupKey
): string[] => {
  const labels: string[] = []

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const group = getWorkPartyGroupForField(section.title, field.label)
      if (group !== targetGroup) return

      field.options?.forEach((option) => labels.push(option.label))
    })
  })

  return labels
}

const collectNutsFallbackLabelsFromSchema = (schema: ParsedSchema): string[] => {
  const labels: string[] = []

  schema.sections.forEach((section) => {
    section.items.forEach((field) => {
      const label = normalize(field.label)
      if (!label.includes('nutsbedrijf')) return

      field.options?.forEach((option) => labels.push(option.label))
    })
  })

  return labels
}

export const extractWorkPartiesFromSchema = (schema: ParsedSchema): WorkPartiesConfig => {
  const aannemerLabels = collectSectionLabels(schema, 'aannemers')
  const signalisatieLabels = collectSectionLabels(schema, 'signalisatiebedrijven')
  const nutsLabels = [
    ...collectSectionLabels(schema, 'nutsbedrijven'),
    ...collectNutsFallbackLabelsFromSchema(schema)
  ]

  return {
    aannemers: toUniqueOptions(aannemerLabels, FALLBACK_WORK_PARTIES.aannemers),
    signalisatiebedrijven: toUniqueOptions(
      signalisatieLabels,
      FALLBACK_WORK_PARTIES.signalisatiebedrijven
    ),
    nutsbedrijven: toUniqueOptions(nutsLabels, FALLBACK_WORK_PARTIES.nutsbedrijven)
  }
}

export const sanitizeOptionList = (items: ConfigOption[]) => {
  const seen = new Set<string>()

  return items
    .map((item) => ({
      value: item.value?.trim() || toOptionValue(item.label),
      label: item.label?.trim() || ''
    }))
    .filter((item) => item.label)
    .filter((item) => {
      const key = normalize(item.label)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
