# DN Test Actieplan - Vanuit de blogpost "testing, one two"

Datum: 2026-02-20  
Status: Voorstel v1 (concreet uitvoerbaar)  
Scope: `DN_DISPATCH` + `DN Vaststelling` + `DN Rapporten`

## 1. Waarom dit nu belangrijk is

De blogpost raakt een punt dat voor deze app heel relevant is:
1. Je hebt 2 feedbackloops:
- gebruikersfeedback (duur, traag, vaak laat);
- testfeedback (goedkoop, snel, vooraf).
2. Bij generatieve coding is de testloop nog belangrijker: tests houden wijzigingen op koers.
3. Een testsuite is geen bijproduct; het is een systeem van kleine programma's die bewijzen dat je app nog correct werkt.

## 2. Wat we concreet meenemen uit de blogpost

## 2.1 Principes die we overnemen

1. Test rond stabiele interfaces, niet rond interne implementatiedetails.
2. Bouw tests in een "bewijsvolgorde" (van dominante knooppunten naar bredere flows).
3. Gebruik mocks bewust als grens naar externe systemen, niet als standaard voor interne modules.
4. Liever minder maar betekenisvolle integratietests dan veel fragiele microtests.

## 2.2 Concreet voor deze app

1. Dominante interfaces zitten op:
- sync-contract (`POST /api/inspecties/sync`);
- dispatchplanning (`buildDispatchPlan`);
- vaststelling-validatie + queue;
- rapportexport-contracten (PDF/CSV/JSON).
2. Mockgrens blijft op gatewayniveau (`Works/Inspections/Permits/ComplaintsGateway`).
3. UI-tests focussen op kernflows, niet op CSS- of DOM-structuur.

## 3. Huidige testbasis (as-is)

Wat er al is:
1. `vitest` testpipeline (`npm run test`, `npm run quality`).
2. Contracttests op API-gateways (incl. sync endpoint/idempotency).
3. Unit/integratie rond `dispatch`, `inspectorContinuity`, `vaststelling` (validatie, sync, checklist, reportModel).

Huidige omvang:
1. 17 testbestanden (vooral `src/modules/vaststelling` + `src/modules/integrations`).

Belangrijkste gat:
1. nog geen expliciete E2E smokeflow voor de appnavigatie + kernpad.

## 4. Testgrafiek voor DN (dominator-denken)

## 4.1 Dominator-knooppunten

Gebruik deze knooppunten als testfundament (in volgorde):

1. `T01` Data-inname en contractgrenzen  
- entry: importscripts + gateways  
- bewijs: contractshape en foutmapping kloppen.

2. `T02` Dispatch-kernlogica  
- entry: `buildDispatchPlan` + continuity  
- bewijs: toewijzing/capaciteit/sticky gedrag blijft correct.

3. `T03` Vaststelling-kern  
- entry: validatie -> queue -> sync  
- bewijs: records blijven consistent en recoveren bij fouten.

4. `T04` Rapporten-kern  
- entry: rapportgeneratoren + datasetexports  
- bewijs: KPI's, velden en metadata zijn consistent/reproduceerbaar.

5. `T05` End-to-end rooktest  
- entry: appflow dispatch -> vaststelling -> sync -> rapport/export  
- bewijs: kernketen werkt met realistische data.

## 4.2 Mockgrenzen

1. Mocks toegestaan op externe/instabiele grenzen:
- GIPOD/A-SIGN/KLM/externe APIs.
2. Niet mocken:
- interne domeinlogica (dispatch, validatie, scoringsregels).
3. Regel:
- als we intern mocken, dan alleen tijdelijk met expliciete reden en vervaldatum.

## 5. Concreet testactieplan (6 weken)

## Week 1 (2026-02-23 t.e.m. 2026-02-27)

1. Testinventaris finaliseren per dominator `T01..T04`.
2. Definieer test-ID conventie:
- `T01-CNTR-*` (contract)
- `T02-DISP-*` (dispatch)
- `T03-VST-*` (vaststelling)
- `T04-RPT-*` (rapport)
- `T05-E2E-*` (end-to-end).
3. Voeg "test ownership" toe per domein in `EXECUTIEBOARD`.

Definition of Done week 1:
1. Testmatrix gepubliceerd.
2. Elk risico-item heeft minstens 1 test-ID.

## Week 2 (2026-03-02 t.e.m. 2026-03-06)

1. Versterk `T01` contracttests:
- negatieve payloads;
- idempotency edge-cases;
- timeout/retry-foutpaden.
2. Voeg rapport-export contractchecks toe voor `RPT-US-003/004`.

Definition of Done week 2:
1. Contracttests blokkeren merge bij schema-breuk.

## Week 3 (2026-03-09 t.e.m. 2026-03-13)

1. Versterk `T02` dispatch:
- capaciteit 5/6 grenzen;
- continuity fallback;
- impact tie-breakers.
2. Voeg regressietests toe voor week-op-week KPI-berekeningen.

Definition of Done week 3:
1. Dispatch- en KPI-berekeningen hebben vaste regressiebasis.

## Week 4 (2026-03-16 t.e.m. 2026-03-20)

1. Versterk `T03` vaststelling:
- validatiepoortjes;
- sync queue deduplicatie;
- statusmapping server outcome.
2. Test expliciet recoverypad failed -> retry -> synced.

Definition of Done week 4:
1. Kernflow vaststelling is fouttolerant aantoonbaar getest.

## Week 5 (2026-03-23 t.e.m. 2026-03-27)

1. Bouw `T04` rapporttests:
- dagrapport en weekrapport dataconsistentie;
- exportmetadata (`generatedAt`, `filterSet`, `contractVersion`);
- CSV/JSON equivalentiechecks op sleutelvelden.

Definition of Done week 5:
1. Rapporten zijn testbaar, reproduceerbaar en contractvast.

## Week 6 (2026-03-30 t.e.m. 2026-04-03)

1. Voeg `T05` E2E smoke test toe op kernflow:
- dispatch selectie;
- vaststelling validatie;
- queue/sync gedrag;
- rapport/export trigger.
2. Stabilisatie en false-positive cleanup.

Definition of Done week 6:
1. 1 stabiele rooktest in CI voor ketenflow.

## 6. Testkwaliteit: wanneer een test goed is

Een test is "goed" als:
1. hij een functionele invariant bewaakt (niet een interne codevorm);
2. falen duidelijke context geeft (wat/waarom/waar eerst);
3. hij niet breekt bij onschuldige refactors;
4. hij weinig mocks nodig heeft voor interne logica.

## 7. Wat we vermijden (anti-patterns uit de blog)

1. Overgespecificeerde tests op interne structuur.
2. Veel overlap tussen tests die hetzelfde afdwingen via andere routes.
3. Mocken van intern gedrag dat snel evolueert.
4. Testfixes die enkel "groen maken" zonder invariant te herstellen.

## 8. Koppeling met lopende planning

1. PX-plan:
- `docs/uitvoering/PLATFORMUITBREIDING_UITVOERINGSPLAN_PX01_PX02_PX08.md`
2. Rapportplan:
- `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`
3. Executie:
- `docs/uitvoering/EXECUTIEBOARD.md`

## 9. Concreet minimum testpakket voor volgende iteratie

1. `T01-CNTR-001` Sync endpoint idempotency mismatch + duplicate.
2. `T02-DISP-001` Capacity edge cases (5/6) met continuity.
3. `T03-VST-001` Failed sync recovery end-to-end in modulelogica.
4. `T04-RPT-001` CSV/JSON export parity voor `inspection_export_flat`.
5. `T05-E2E-001` Kernflow smoke (dispatch -> vaststelling -> sync -> rapport).

## 10. Bedenking op de blogpost voor dit project

Sterk toepasbaar:
1. Dominator-denken past goed op jullie modulaire architectuur.
2. Contract-first aanpak maakt "test as proof" haalbaar.

Waar we pragmatisch moeten blijven:
1. "Mostly integration" is goed, maar behoud enkele pure unittests op kritieke rekenlogica.
2. Niet alles hoeft E2E; 1 stabiele rooktest is waardevoller dan 20 fragiele UI-tests.
