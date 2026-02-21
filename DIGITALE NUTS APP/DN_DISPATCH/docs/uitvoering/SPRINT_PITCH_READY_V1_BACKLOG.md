# Sprint Backlog - Pitch Ready v1

Datum: 2026-02-17  
Project: `DN_DISPATCH` + `DN Vaststelling`  
Sprintduur: 2 weken (10 werkdagen)  
Sprintdoel: app toonbaar en overtuigend maken voor projectteam-pitch, met stabiele demo-flow, KPI-paneel v1 en API-ready architectuur (mock-first).

## 1. Sprintdoel en outcome
Einde sprint willen we 5 zaken live kunnen tonen:
1. End-to-end terreinflow: sessie -> mijn lijst -> kaart -> vaststelling -> handover -> sync.
2. KPI-paneel v1 met operationele kerncijfers.
3. Integratie-ready architectuur: gateways met mock + API-implementatiepad.
4. Demo dataset met realistische scenario's (OK, NOK, sync fail).
5. Pitchmateriaal (samenvattingsslide + quick guides per rol).

## 2. Scope in en uit

In scope:
- Stabiliseren bestaande demo-flow.
- Nieuwe KPI-kaarten op basis van bestaande data en lokale sync queue.
- Adapterlaag (contract-first) voor toekomstige GIPOD/A-SIGN/KLM koppelingen.
- Demo/opleidingsmateriaal.

Out of scope:
- Echte productie-integratie met GIPOD/A-SIGN/KLM.
- SSO implementatie.
- Productieklare AI-modules.
- Juridische retributiemotor.

## 3. Teamcapaciteit (richtinschatting)
- Product owner/business: 20-30 uur
- Frontend + state/logica: 60-80 uur
- Data/pipeline + mock adapters: 40-60 uur
- QA/demo-voorbereiding: 24-32 uur
- Totaal sprintcapaciteit: 144-202 uur

## 4. User stories met acceptatiecriteria

## EPIC A - Demoflow stabiliteit

### PRV1-US-001 - Stabiele terreinflow zonder blokkers
Als toezichter wil ik de volledige flow kunnen doorlopen zonder fouten, zodat de pitch betrouwbaar verloopt.

Schatting: 10-14 uur

Acceptatiecriteria:
1. Flow werkt in 1 sessie zonder page refresh: `Start sessie -> Mijn lijst -> Selecteer dossier -> Gebruik context -> Markeer valid -> Zet in wachtrij`.
2. Geen console errors in normale flow.
3. Bij sync endpoint onbereikbaar blijft item zichtbaar als `failed` met foutmelding.
4. Bij terug online kan gebruiker opnieuw sync starten en status wijzigen naar `synced`.

### PRV1-US-002 - Demo resetknop voor herhaalbare pitches
Als demo-gebruiker wil ik in 1 klik demo-state kunnen resetten, zodat meerdere pitchrondes consistent blijven.

Schatting: 4-6 uur

Acceptatiecriteria:
1. Nieuwe knop `Demo reset` in `DN Vaststelling` of `DN Data & Sync`.
2. Reset wist alleen demo-gerelateerde state (records/queue/session) en niet brondatafiles.
3. Na reset start app op in voorspelbare basissituatie.

## EPIC B - KPI-paneel v1

### PRV1-US-003 - KPI-kaarten voor pitch
Als projectleider wil ik kern-KPI's zien, zodat de meerwaarde meteen zichtbaar is.

Schatting: 12-16 uur

Acceptatiecriteria:
1. KPI-paneel bevat minimaal:
- `Dossiers in scope`
- `Vaststellingen per toezichter (huidige week)`
- `% records met context (adres + nutsmaatschappij + referentie + GIPOD)`
- `% handover ingevuld`
- `Queue: queued / failed / synced`
- `Top 5 prioriteitsdossiers`
2. KPI's vernieuwen bij wijziging filters/sessie/syncstatus.
3. KPI-definities staan gedocumenteerd in tooltips of handleiding.

### PRV1-US-004 - KPI-definitietabel voor transparantie
Als stakeholder wil ik weten hoe KPI's berekend worden, zodat cijfers bespreekbaar zijn.

Schatting: 4-6 uur

Acceptatiecriteria:
1. In `DN Handleiding` staat een sectie "KPI-definities v1".
2. Per KPI staat formule, bronveld en beperking.
3. Duidelijk label "v1 indicatief, geen beleidsrapportering".

## EPIC C - API-ready architectuur (mock-first)

### PRV1-US-005 - Gateway interfaces voor externe bronnen
Als ontwikkelaar wil ik contracts voor externe koppelingen, zodat echte API's later plug-and-play worden.

Schatting: 10-14 uur

Acceptatiecriteria:
1. Nieuwe contractlaag met interfaces:
- `WorksGateway`
- `InspectionsGateway`
- `PermitsGateway`
- `ComplaintsGateway`
2. Contracttypes zijn expliciet getypeerd in TypeScript.
3. Bestaande modules gebruiken geen directe API-aanroep buiten gatewaylaag.

### PRV1-US-006 - Mock implementaties + feature flags
Als team wil ik nu al kunnen ontwikkelen zonder externe API, zodat sprinttempo hoog blijft.

Schatting: 10-14 uur

Acceptatiecriteria:
1. Mock gateways leveren deterministische testdata.
2. Feature flags aanwezig:
- `USE_MOCK_GIPOD`
- `USE_MOCK_ASIGN`
- `USE_MOCK_KLM`
3. Wisselen tussen mock en API mode vereist geen UI-wijzigingen.

### PRV1-US-007 - Integratietest-harnas voor later
Als team wil ik contracttests hebben, zodat echte API-integratie minder risico geeft.

Schatting: 8-12 uur

Acceptatiecriteria:
1. Minstens 1 contracttest per gateway op request/response-shape.
2. Foutscenario's gedekt (timeout, 500, onvolledige payload).
3. Testoutput opgenomen in `npm run quality` of aparte script.

## EPIC D - Demo data en scenario's

### PRV1-US-008 - Pitch dataset met scenario's
Als demo-team wil ik een voorspelbare dataset, zodat we telkens dezelfde verhaallijn kunnen tonen.

Schatting: 8-10 uur

Acceptatiecriteria:
1. Dataset bevat 20-30 dossiers.
2. Minstens:
- 5 NOK scenario's
- 3 sync-fail scenario's
- 5 dossiers met hoge impact
3. Datasetdocumentatie beschrijft elk scenario in 1 regel.

### PRV1-US-009 - Demo script "dag in het leven"
Als spreker wil ik een script per klikstap, zodat de pitch vlot en consistent verloopt.

Schatting: 4-6 uur
Status: DONE op 2026-02-17

Acceptatiecriteria:
1. Script in markdown met tijdsaanduiding per stap (bv. minuut 0-8).
2. Voor elke stap: doel, scherm, kernboodschap.
3. Bevat fallbackplan bij internet/sync issues.

## EPIC E - Pitch assets en gebruikerscommunicatie

### PRV1-US-010 - Quick guides per rol
Als eindgebruiker wil ik korte rolgerichte uitleg, zodat adoptie op terrein sneller gaat.

Schatting: 6-8 uur
Status: DONE op 2026-02-17

Acceptatiecriteria:
1. Drie one-pagers:
- Toezichter
- Dispatcher
- Projectleider
2. Taal: operationeel en niet-technisch.
3. Elke guide bevat "5 meest gemaakte fouten".

### PRV1-US-011 - Integratie-overzicht slide
Als projectteam wil ik helder zien wat al kan en wat nog partnerinput vraagt.

Schatting: 3-4 uur

Acceptatiecriteria:
1. Slide met 3 kolommen:
- `Vandaag live`
- `Mock/API-ready`
- `Partnerinput nodig`
2. Benoemt expliciet ontbrekende minimumvelden per partner.

## 5. Prioriteit en volgorde

Must-have (week 1):
1. `PRV1-US-001`
2. `PRV1-US-003`
3. `PRV1-US-005`
4. `PRV1-US-006`
5. `PRV1-US-008`

Should-have (week 2):
1. `PRV1-US-002`
2. `PRV1-US-004`
3. `PRV1-US-007`
4. `PRV1-US-009`
5. `PRV1-US-010`
6. `PRV1-US-011`

## 6. Technische implementatie-aanpak (zonder externe API)

Stap 1:
- contracts toevoegen in `src/modules/integrations/contracts.ts`

Stap 2:
- mock gateways toevoegen in `src/modules/integrations/mock/*`

Stap 3:
- provider/factory toevoegen:
  - leest env flags
  - levert juiste gateway implementatie

Stap 4:
- `DN Vaststelling` en eventuele dataflows laten praten met gateways i.p.v. directe calls.

Stap 5:
- contracttests toevoegen in `src/modules/integrations/*.test.ts`

## 7. Definition of Ready (DoR)
Een story mag starten als:
1. Businessdoel in 1 zin duidelijk is.
2. Schatting en owner zijn toegewezen.
3. Testaanpak bepaald is.
4. UI-impact en data-impact benoemd zijn.

## 8. Definition of Done (DoD)
Een story is done als:
1. Acceptatiecriteria voldaan zijn.
2. Typecheck + tests slagen.
3. Geen regressie op demoflow.
4. Handleiding/documentatie is bijgewerkt.

## 9. Demo checklist einde sprint
1. Start app met propere demo-state.
2. Doorloop volledig script zonder manuele herstelacties.
3. Toon KPI-paneel en leg berekening uit.
4. Toon mock/API-ready architectuurplaat.
5. Sluit af met "wat nodig is van partners" (8 minimumvelden).

## 10. Minimumvelden op te vragen aan partners
1. `externalWorkId`
2. `status`
3. `statusTimestamp`
4. `permitReference`
5. `gipodReference`
6. `contractorId`
7. `restoreDueDate`
8. `lastUpdateSource`

## 11. Risico's in deze sprint
1. Te veel focus op nieuwe features i.p.v. pitchstabiliteit.
2. KPI-discussie over definities kan scope vertragen.
3. Mockdata niet representatief genoeg voor terreinrealiteit.

Mitigatie:
1. Dagelijkse demo-run van 10 minuten.
2. KPI freeze na dag 4 van sprint.
3. Validatie mockdataset met minstens 1 toezichter + 1 dispatcher.

## 12. Verwachte sprintoutput (tastbaar)
1. Werkende pitchbuild in app.
2. Sprintrapport met gerealiseerde stories.
3. Geactualiseerde handleiding.
4. Integratie-overzicht voor projectteambespreking.
