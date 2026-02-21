# Impact Fase 2 - Scoring Engine

## Doel van fase 2
Fase 2 vertaalt de impactprofielen uit fase 1 naar een uitlegbare score die gebruikt kan worden in dispatch-prioriteit.

Resultaat:
- gestandaardiseerde impactscore (0..100)
- impactniveau (`LAAG`, `MIDDEL`, `HOOG`)
- beperkte set redenen in mensentaal
- gecontroleerde bijdrage aan bestaande priorityscore

## Nieuwe onderdelen in code
- `src/config/impactWeights.ts`
  - centrale gewichten en parameters
- `src/lib/impactScoring.ts`
  - types voor impactprofielen
  - pure scorefunctie `computeImpactScore(...)`
- `src/lib/impactData.ts`
  - validatie en mapping van `impact.generated.json`
  - runtime fetch met fallback op bundeldata

## Integratie in bestaande flow
- `src/App.tsx`
  - laadt impactprofielen samen met works-data
  - houdt map per postcode in state
  - geeft profielmap door aan `MapPanel`
- `src/components/MapPanel.tsx`
  - geeft postcode-profiel mee aan `buildVisitDecision(...)`
  - toont impactniveau als contexttag in popup
- `src/lib/decisionEngine.ts`
  - rekent impactdelta bij op bestaande score
  - voegt impactinsight toe in de decision-uitleg

## Rekenmodel (fase 2)
`impactScore = 100 * (w_pop * pop + w_vuln * vuln + w_serv * serv + w_mob * mob)`

Defaultgewichten:
- populationDensity: `0.35`
- vulnerableShare: `0.30`
- servicePressure: `0.20`
- mobilitySensitivity: `0.15`

Prioriteitsbijdrage:
- `priorityDelta = round(impactScore * 0.20)`

## Niveaus en uitleg
- `HOOG`: score >= 70
- `MIDDEL`: 40..69
- `LAAG`: <= 39

Redenen worden afgeleid uit dominante indicatoren (max 3 regels), zodat gebruikers begrijpen waarom een impactniveau wordt toegekend.

## Opleidingsnotities
- Impactscore is aanvullend op operationele urgentie, geen vervanging.
- Bij ontbrekende of ongeldige impactdata blijft dispatch werken via fallback.
- Teamafspraken over gewichten moeten gedocumenteerd worden per release.

## Volgende stap (fase 3)
- zichtbaar impactbadge op action cards
- dedicated filter op impactniveau
- detailpaneel met bronindicatoren per dossier
