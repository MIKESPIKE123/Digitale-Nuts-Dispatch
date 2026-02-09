export interface AiAnalysisResult {
  summary: string
  permitWarnings: string[]
  nokFindings: Array<{
    item: string
    finding: string
    suggestedResponsible?: string
  }>
  suggestedActions: string[]
}

export const runAiAnalysis = async ({
  apiKey,
  model,
  payload
}: {
  apiKey: string
  model: string
  payload: any
}): Promise<AiAnalysisResult> => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            'Je bent een zorgende digitale collega voor nutsinspecties. Geef duidelijke waarschuwingen, wees streng op vergunningen en veiligheid. Antwoord uitsluitend in JSON.'
        },
        {
          role: 'user',
          content: JSON.stringify(payload)
        }
      ],
      temperature: 0.2,
      text: {
        format: { type: 'json_object' }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const output = data.output?.[0]?.content?.[0]?.text ?? ''
  const parsed = JSON.parse(output)

  return {
    summary: parsed.summary || '',
    permitWarnings: parsed.permitWarnings || [],
    nokFindings: parsed.nokFindings || [],
    suggestedActions: parsed.suggestedActions || []
  }
}
