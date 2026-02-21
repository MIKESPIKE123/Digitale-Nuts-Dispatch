# Toepassing 5 - Impactprioritering met Open Data (Opleidingsfiche)

## 1. Doel
Deze fiche werkt toepassing 5 uit: prioriteit van een werf niet alleen bepalen op planning/urgentie, maar ook op maatschappelijke impact in de buurt.

Concreet: elke action card krijgt een extra impactscore op basis van externe open data (wijk of buurtindicatoren), zodat dispatchbeslissingen transparanter en beter onderbouwd zijn.

## 2. Waarom dit relevant is voor DIGITALE NUTS
Bestaande prioriteit in `src/lib/decisionEngine.ts` kijkt nu vooral naar:
- type bezoek (start/eind/tussen)
- nabijheid einddatum
- conflict op planning
- routecontext

Met impactprioritering voeg je een tweede dimensie toe:
- "Wat is de maatschappelijke gevoeligheid van deze locatie?"

Resultaat:
- betere volgorde van terreinbezoeken
- duidelijke uitleg naar teamleiding en beleid
- betere afweging bij capaciteitsdruk

## 3. Officiele databronnen (startpunten)
Gebruik alleen publieke, documenteerde bronnen.

1. Open data Antwerpen:
- https://www.antwerpen.be/info/open-data-stad-antwerpen

2. Open geoportaal Antwerpen (geodata catalogus):
- https://www.antwerpen.be/info/open-geoportaal
- Portal: https://portaal-stadantwerpen.opendata.arcgis.com/

3. Stad in Cijfers (statistische context):
- https://www.antwerpen.be/info/stad-in-cijfers

4. Vlaanderen datavindplaats (aanvullende lagen):
- https://opendata.wewis.vlaanderen.be/explore/?sort=title

## 4. Architectuurinpassing in DN_DISPATCH
Doel: minimale verstoring van huidige architectuurregels uit `AI_CONTEXT.md`.

### 4.1 Nieuwe modulegrenzen
- `src/lib/impactData.ts`
  Doel: laden en cachen van impactprofielen (per zone/buurt).
- `src/lib/impactScoring.ts`
  Doel: berekenen van impactscore en tekstuitleg.
- `src/config/impactWeights.ts`
  Doel: configureerbare gewichten per indicator.

### 4.2 Integratiepunten
- `src/lib/decisionEngine.ts`
  Voeg impactcomponent toe aan `priorityScore` en `insights`.
- `src/components/InspectorBoard.tsx`
  Toon badge "Impact: Laag/Middel/Hoog" op action cards.
- `src/components/MapPanel.tsx`
  Toon impactuitleg in popup (max 2-3 regels).

## 5. Datamodel (voorstel)

```ts
// src/lib/impactScoring.ts
export type ImpactLevel = "LAAG" | "MIDDEL" | "HOOG";

export interface AreaImpactProfile {
  areaId: string;         // bv. buurtcode of statistische zone
  areaLabel: string;
  asOfDate: string;       // ISO datum van bron
  populationDensity: number | null;
  vulnerableShare: number | null;      // bv. ouderen/jongeren aandeel
  servicePressure: number | null;      // bv. nabijheid scholen/zorg/as
  mobilitySensitivity: number | null;  // bv. beperkte bereikbaarheid
}

export interface ImpactScoreResult {
  score: number;          // 0..100
  level: ImpactLevel;
  reasons: string[];      // max 3 uitlegregels
  sourceAreaId: string | null;
}
```

## 6. Scoremethodiek (uitlegbaar)
Gebruik een genormaliseerde, gewogen score zodat opleiding en audit eenvoudig blijven.

### 6.1 Formule
`impactScore = 100 * (w1*D + w2*V + w3*S + w4*M)`

Waar:
- `D` = genormaliseerde bevolkingsdichtheid (0..1)
- `V` = genormaliseerde kwetsbaarheidsindicator (0..1)
- `S` = service pressure (0..1)
- `M` = mobiliteitssensitiviteit (0..1)

Startgewichten (voorbeeld):
- `w1=0.35`, `w2=0.30`, `w3=0.20`, `w4=0.15`

### 6.2 Drempels
- `0..39`: LAAG
- `40..69`: MIDDEL
- `70..100`: HOOG

### 6.3 Combinatie met huidige decision score
Voorstel in `buildVisitDecision(...)`:
- bestaande score blijft basis
- extra impactcomponent: `+ round(impactScore * 0.20)`
- cap op 100 behouden

Zo blijft het model stabiel en toch zichtbaar verrijkt.

## 7. Dataflow ontwerp

### Optie A (aanbevolen voor opleiding): batch
1. Nieuw script `scripts/import-impact-data.mjs`
2. Leest open data bron(nen) en maakt compact profielbestand
3. Schrijft naar:
   - `src/data/impact.generated.json`
   - `public/data/impact.generated.json`
4. Runtime load via `fetch('/data/impact.generated.json')`

Voordelen:
- deterministisch
- weinig runtime afhankelijkheden
- makkelijk testbaar in opleiding

### Optie B: realtime API
- Runtime query naar externe API per kaartfocus of per lijst.
- Niet aanbevolen als eerste stap door rate limits, latency en foutafhandeling.

## 8. Implementatieplan in 4 fasen

### Fase 0 - bronkeuze en governance (0.5 dag)
- Kies 1 primaire ruimtelijke indeling (bv. buurt).
- Documenteer licentie, updatefrequentie en kwaliteitsgrenzen.
- Definieer fallbackgedrag bij missende indicatoren.

### Fase 1 - datapipeline (1 dag)
- Bouw `import-impact-data.mjs`.
- Exporteer minimaal: `areaId`, `areaLabel`, 3-4 indicatoren, `asOfDate`.
- Voeg quality checks toe (nullratio, bereik, duplicates).

### Fase 2 - scoring engine (1 dag)
- Maak `impactScoring.ts` met pure functies.
- Unit tests op normalisatie, thresholds en missing values.
- Logica moet deterministic zijn (zelfde input = zelfde output).

### Fase 3 - UI integratie (1 dag)
- Verrijk `VisitDecision` met impactresultaat.
- Toon compacte badges en 1-2 uitlegregels.
- Houd popup kort; details achter "meer" of tooltip.

### Fase 4 - validatie en opleiding (0.5 dag)
- Vergelijk 20 dossiers: oude vs nieuwe prioriteit.
- Bespreek afwijkingen met operationeel team.
- Stel gewichten bij met changelog.

## 9. Didactisch opleidingspad (voor team)

### Sessie 1 - Context en model (60 min)
- Begrijp verschil tussen urgentie en impact.
- Lees scoreformule en interpretatie.
- Bespreek voorbeelden met hoge en lage impact.

### Sessie 2 - Technische implementatie (90 min)
- Doorloop pipeline script en generated JSON.
- Doorloop `impactScoring.ts` stap voor stap.
- Live test op 3 bekende wijken.

### Sessie 3 - Operatie en bijsturing (60 min)
- Hoe gewichtswijziging gedrag verandert.
- Hoe foutieve brondata opvangen.
- Hoe beslissingen uitleggen aan niet-technische stakeholders.

## 10. Oefenopdrachten (opleiding)
1. Maak een mock `impact.generated.json` met 5 zones en valideer score-output.
2. Voeg een extra indicator toe en toon impact op top-10 prioriteiten.
3. Simuleer ontbrekende brondata en toon fallback in UI.
4. Documenteer 3 cases waar prioriteit verandert door impact.

## 11. Kwaliteits- en ethische randvoorwaarden
- Transparantie: toon altijd waarom een impactniveau hoog is (minstens 1 reden).
- Beperk bias: gebruik wijkniveau, geen persoonsniveau.
- Reproduceerbaarheid: bronversie + `asOfDate` opslaan.
- Safe fallback: bij ontbrekende impactdata geen harde blokkade, enkel neutrale score.

## 12. Definition of Done
- Impactdata pipeline draait lokaal en in build flow.
- `decisionEngine` gebruikt impactscore zonder regressie op bestaande regels.
- UI toont impactbadge en compacte uitleg.
- Teamhandleiding + oefencases zijn beschikbaar.
- Evaluatie met operationeel team is gedocumenteerd.

## 13. Realisatiestatus DN_DISPATCH (2026-02-15)
- Fase 1 afgerond:
  - `scripts/import-impact-data.mjs`
  - document: `docs/techniek/IMPACT_PIPELINE_FASE1_HANDLEIDING.md`
- Fase 2 afgerond:
  - `src/lib/impactScoring.ts`
  - `src/lib/impactData.ts`
  - `src/config/impactWeights.ts`
  - document: `docs/techniek/IMPACT_FASE2_SCORING_ENGINE.md`
- Fase 3 afgerond:
  - impactbadge op cards + filterchips + kaartcontext
  - document: `docs/techniek/IMPACT_FASE3_UI_FILTERS.md`
- Fase 4 afgerond:
  - evaluatiescript `scripts/evaluate-impact-priority.mjs`
  - workflow command `npm run impact:phase4`
  - document: `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md`

Laatste evaluatierun:
- datum: `2026-02-15`
- dossiers geevalueerd: `165`
- dossiers met scorewijziging: `131`
- gemiddelde prioriteit: `37 -> 41`



