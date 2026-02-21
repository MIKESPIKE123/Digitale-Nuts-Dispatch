# Impact Fase 4 - Validatie en Kalibratie

## Doel
Fase 4 maakt de impactprioritering operationeel controleerbaar:
- objectieve vergelijking van oude versus nieuwe prioriteit
- vaste outputbestanden voor teamreview
- herhaalbare procedure om gewichten bij te sturen

## Commands
1. `npm run impact:phase4`
2. Of stap per stap:
   - `npm run import:data`
   - `npm run import:impact`
   - `npm run impact:evaluate`

## Output
- `DATA/impact_priority_evaluation.json`
- `DATA/impact_priority_evaluation.csv` (top 20 grootste verschuivingen)

De JSON bevat:
- `totals` met kerncijfers
- `topShifted` met dossiers met grootste verschil
- `rows` met detail per dossier

## Laatste referentierun
Run-datum: `2026-02-15`
- Dossiers geevalueerd: `165`
- Dossiers met scorewijziging: `131`
- Promotie naar `HOOG`: `0`
- Gemiddelde prioriteit: `37 -> 41`

## Interpretatie voor opleiding
- Een stijging in gemiddelde score is normaal als impactcomponent actief is.
- `promotedToHigh` moet gemonitord worden: te hoog betekent mogelijk overweging van impactfactor.
- Teamreview gebeurt op de topverschuivingen uit CSV:
  - klopt de nieuwe volgorde operationeel?
  - zijn er false positives?
  - zijn er dossiers die net te laag blijven?

## Kalibratieprocedure
1. Draai `npm run impact:phase4`.
2. Bespreek top 20 verschuivingen met dispatch + terrein.
3. Pas gewichten aan in `src/config/impactWeights.ts`.
4. Indien nodig: pas impactbijdrage aan in `src/lib/decisionEngine.ts`.
5. Draai opnieuw `npm run impact:phase4`.
6. Noteer de wijziging in changelog en opleidingsfiche.

## Definition of Done fase 4
- Evaluatiescript is opneembaar in standaard workflow (`impact:phase4`).
- Resultaten worden als JSON en CSV opgeslagen voor audit.
- Team kan op basis van output gewichten onderbouwd bijsturen.
- Procedure staat gedocumenteerd voor opleiding en onboarding.
