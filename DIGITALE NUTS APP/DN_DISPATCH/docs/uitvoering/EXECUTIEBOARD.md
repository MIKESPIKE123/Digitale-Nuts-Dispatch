# DN Dispatch - EXECUTIEBOARD

Datum laatste update: 2026-03-06 (status bijgewerkt op live modules, kaartlagen en documentatie)  
Doel: 1 werkdocument voor dagelijkse opvolging van sprintitems (`PRV`), platformuitbreidingen (`PX`) en veldenset-stappen (`Stap A/B/C`).
Termijnkader: formele planning start op 2026-03-20; tot en met 2026-03-19 werken we in pre-fase (vibe coding + structuur).
Governance-overzicht: zie `docs/uitvoering/DN_GOVERNANCE_MASTERPLAN.md` en app-tab `DN Governance`.

## 1. Statuslegenda
| Status | Betekenis |
|---|---|
| `done` | Geleverd en aantoonbaar in code/docs/tests |
| `in_progress` | Gestart, maar nog niet volledig volgens acceptatiecriteria |
| `blocked` | Niet verder zonder externe input/dependency |
| `todo` | Nog niet gestart |

## 2. Sprint Pitch Ready v1 (PRV)
ScopeTag bron: `docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md` en `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md`.

| ID | Status | Schil | ScopeTag | Volgende actie | Bewijs |
|---|---|---|---|---|---|
| `PRV1-US-001` Stabiele terreinflow | `in_progress` | Schil 1 | `MH` | Formeel afronden met regressierun (happy path + failed sync + retry + grote foto upload) | `src/modules/vaststelling/VaststellingView.tsx`, `src/modules/vaststelling/storage.ts` |
| `PRV1-US-002` Demo resetknop | `done` | Schil 1 | `NN` | Geen | `src/modules/vaststelling/VaststellingView.tsx:1362`, `src/App.tsx:1017` |
| `PRV1-US-003` KPI-kaarten v1 | `done` | Schil 1 | `NN` | Volgende stap: KPI snapshot export (markdown/csv) | `src/modules/kpi/pitchKpiEngine.ts`, `src/modules/kpi/dashboardKpiEngine.ts`, `src/modules/kpi/trendKpiEngine.ts` |
| `PRV1-US-004` KPI-definitietabel | `done` | Schil 1 | `NN` | Geen | `src/modules/kpi/definitions.ts`, `src/App.tsx` |
| `PRV1-US-005` Gateway interfaces | `done` | Schil 1 | `MH` | Contractversie in changelog opnemen | `src/modules/integrations/contracts.ts` |
| `PRV1-US-006` Mock + feature flags | `done` | Schil 1 | `MH` | `.env` voorbeeld opnemen in docs | `src/modules/integrations/factory.ts`, `src/modules/integrations/flags.ts:40` |
| `PRV1-US-007` Contracttests | `done` | Schil 1 | `MH` | Negatieve scenario's uitbreiden (malformed payload) | `src/modules/integrations/api/*.contract.test.ts` |
| `PRV1-US-008` Pitch dataset scenario's | `in_progress` | Schil 1 | `NN` | Dataset expliciet markeren + scenario-index toevoegen | `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md` |
| `PRV1-US-009` Demo script | `done` | Schil 1 | `NN` | Geen | `docs/uitvoering/DEMO_SCRIPT_DAG_IN_HET_LEVEN.md` |
| `PRV1-US-010` Quick guides per rol | `done` | Schil 1 | `NN` | Geen | `docs/opleiding/QUICK_GUIDE_TOEZICHTER.md`, `docs/opleiding/QUICK_GUIDE_DISPATCHER.md`, `docs/opleiding/QUICK_GUIDE_PROJECTLEIDER.md` |
| `PRV1-US-011` Integratie-overzicht slide | `todo` | Schil 1 | `NN` | Slide/1-pager toevoegen aan `DN Handleiding` of `docs` | `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md:171` |

## 2.1 Schil-1 must-have gaten (buiten PRV)
Bron: `docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md`.

| ID | Status | Volgende concrete stap | Bewijs/doeldoc |
|---|---|---|---|
| `MH-03` Entra login + basis RBAC | `todo` | Authflow en rolmatrix vastleggen + acceptatietest definiëren | `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md` |
| `MH-04` Audittrail kritieke acties | `todo` | Eventset (`create/update/handover/sync`) formaliseren + loggingcontract | `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md` |
| `MH-06` Idempotency + retry releasecriteria | `in_progress` | Formele gate-check toevoegen aan DoD/releasechecklist | `scripts/inspecties-sync-endpoint.mjs`, `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md` |
| `MH-08` Runbook + incidentflow v1 | `todo` | Runbook template opstellen + 2 incident-simulaties plannen | `docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md` |
| `MH-09` Scope- en poortdiscipline | `in_progress` | Poortbeslissingen registreren per sprintreview | `docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md` |

## 3. DN Vaststelling Veldenset v2 (Stap A/B/C)
| Stap | Status | Schil | Wat is al gedaan | Open werk |
|---|---|---|---|---|
| `Stap A` ACTIVEER_SNEL + validatiepoortjes | `done` | Schil 1 | Canonieke velden, defaults, validaties, stricte checklistkoppeling | Geen |
| `Stap B` MANUEEL_NU + checklistkoppeling | `done` | Schil 2 | `verhardingType`, `kritiekeZone`, `aannemer` + expliciete mapping in code + checklistscore (0-100) | Kalibratie scoregewichten op terreinfeedback |
| `Stap C` API_OF_NIEUWE_DATA | `in_progress` | Schil 2/3 | `herstelbonNr` + fotovelden geactiveerd, camera/file picker live, foto-optimalisatie voor storage, storage-crashfix (quota), PDF met ingesloten foto-sectie + opgeschoonde fototekst | Centrale media-opslag/backend upload + herstelbon API-koppeling |

## 4. Platformuitbreidingen (PX)
| PX | Schil | Status | Volgende concrete stap |
|---|---|---|---|
| `PX-01` Vaststelling+ Evidentieflow | Schil 1 | `in_progress` | Volgende stap: blur/privacy controls + backend media-opslag + cleanup van lokale payload na sync |
| `PX-02` Vergunning/Signalisatiecontrole | Schil 2 | `todo` | Rule engine v1 op `signVergNr`, `fase`, `status` |
| `PX-03` Checklist + kwaliteitsscore | Schil 2 | `in_progress` | Scoreaggregatie per aannemer/district + drempelalerts (<70) |
| `PX-04` GIPOD Connect in/out | Schil 1 | `in_progress` | Beta onboarding afronden (`gipod_pdo_read`), read-adapter op `public-domain-occupancies` met NIS-filter, daarna pas signalisatiestromen |
| `PX-05` Partnerportaal nuts/aannemers | Schil 1 | `todo` | Skeleton met role-based schermen |
| `PX-06` Bewonerscommunicatie + QR | Schil 2 | `todo` | 5 standaard berichttemplates + publieke samenvatting |
| `PX-07` GIS communicatieviewer | Schil 2 | `todo` | Publieke kaartmodus met beperkte dataset |
| `PX-08` KPI datamart + beleidspanel | Schil 1 | `in_progress` | Week-op-week trendweergave live; volgende stap snapshot export + negatieve-trend filter |
| `PX-09` Retributie + juridisch logboek | Schil 3 | `todo` | Eventlog model + concept dossierbundle |
| `PX-10` AI assist | Schil 2 | `todo` | Rule-based risicoscore + explainability |
| `PX-11` OSLO contract center | Schil 1 | `in_progress` | Versioning en mapping publicatie |
| `PX-12` Privacy/security/toegang | Schil 1 | `todo` | Audit events uitbreiden + DPIA checklijst |
| `PX-13` QA gate framework | Schil 1 | `in_progress` | Formele gate-template opnemen in docs |
| `PX-14` Opschaling/disseminatie | Schil 3 | `todo` | Onboarding kit + partner intake template |

## 4.2 DN Rapporten stories (RPT-US)
Bron: `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`

| ID | Status | Schil | Volgende concrete stap | Bewijs |
|---|---|---|---|---|
| `RPT-US-001` Dagrapport dispatch generator (PDF + CSV) | `todo` | Schil 1 | Reportspec dagrapport bevestigen + veldenmap uitwerken | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md` |
| `RPT-US-002` Weekrapport district generator (PDF + CSV) | `todo` | Schil 1 | Weekaggregaties en districtscope definitief maken | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md` |
| `RPT-US-003` JSON exportcontract v1 + CSV mirror | `todo` | Schil 1 | Datasetcontract `dispatch_daily_summary`, `district_weekly_summary`, `inspection_export_flat` vastleggen | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md` |
| `RPT-US-004` Auditmetadata en exportlog | `todo` | Schil 1 | Verplichte metadata (`generatedAt`, `generatedBy`, `filterSet`, `contractVersion`) implementatieplan opstellen | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md` |
| `RPT-US-005` Contracttests en validatieregels rapporten | `todo` | Schil 1 | Testmatrix opstellen (schema, verplichte velden, statusmapping, foutpaden) | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md` |
| `RPT-US-006` Rapporten-view activeren (roadmap -> live v1) | `todo` | Schil 1 | Minimaal rapportenscherm met 3 acties (dag, week, export) ontwerpen | `src/App.tsx:3240` |

## 4.1 Data-ontsluiting architectuurfasen
| Fase | Status | Wat is al gedaan | Volgende stap |
|---|---|---|---|
| `Fase 1` Repository + IndexedDB | `done` | `VaststellingRepository` toegevoegd met `IndexedDbVaststellingRepository` (default) en `LocalStorageVaststellingRepository` (fallback/migratie), storage API asynchroon gemaakt, `App` + `VaststellingView` + `VaststellingPhase0View` gekoppeld | `Fase 2`: centrale API + dual-write voorbereiden |
| `Fase 2` Centrale API + dual-write | `done` | Sync-contract uitgebreid met `inspectionId`, `idempotencyKey`, `mutationVersion`; API gateway stuurt `X-Idempotency-Key`; endpoint `POST /api/inspecties/sync` actief op backend-middleware; persistente idempotency store + eventlog in `DATA/*.json`; finale backend statusmapping naar `planned/in_progress/temporary_restore/closed`; queue toont `serverOutcome` + `serverMappedStatus` | Volgende fase: dedicated backend service naast Vite middleware |

## 5. Deze week topprioriteiten (week 2026-03-02 t.e.m. 2026-03-06)
1. Postcoderanden stabiel zichtbaar houden over alle kaartstijlen.
2. Documentatie en quick guides synchroniseren met live appstatus.
3. `PRV1-US-001` formeel afsluiten via regressie-checklist inclusief foto-stresstest.
4. `PX-08` volgende stap bepalen: snapshot export en negatieve-trend filter.
5. `PX-02` regelset v1 voorbereiden (`ok`, `missing`, `conflict`) + testcases afbakenen.
6. `RPT-US-003/004` kickoff: datasetcontract + auditmetadata definitief maken.

## 5.1 Concrete weekplanning PX-01 / PX-02 / PX-08 (2026-03-20 t.e.m. 2026-05-01)
Bronplan: `docs/uitvoering/PLATFORMUITBREIDING_UITVOERINGSPLAN_PX01_PX02_PX08.md`

| Week | Periode | Harde deadline | Focus | Minimaal op te leveren | Owner(s) | Status |
|---|---|---|---|---|---|---|
| W1 | 2026-03-23 t.e.m. 2026-03-27 | 2026-03-27 | `PX-01` stabilisatie + `PX-08` KPI-baseline | `PX-01`: payload cleanup + regressierun afgerond. `PX-08`: 8 KPI-definities + baseline snapshot v1. | Tech lead, Frontend lead, QA owner, Product owner | `todo` |
| W2 | 2026-03-30 t.e.m. 2026-04-03 | 2026-04-03 | `PX-01` afronden + `PX-08` trendstart | `PX-01`: DoD afgevinkt en status naar `done` of expliciet blocker. `PX-08`: week-op-week trendweergave live. | Tech lead, Projectleider, Product owner | `todo` |
| W3 | 2026-04-06 t.e.m. 2026-04-10 | 2026-04-10 | `PX-02` rule engine v1 | Regelset v1 (`signVergNr`, `fase`, `status`) + mock `PermitsGateway` scenario's. | Business analyst, Frontend/dev | `todo` |
| W4 | 2026-04-13 t.e.m. 2026-04-17 | 2026-04-17 | `PX-02` UI + tests | Badge in kaartpopup/vaststelling + 3 contracttests (`ok`, `missing`, `conflict`). | Frontend/dev, QA owner | `todo` |
| W5 | 2026-04-20 t.e.m. 2026-04-24 | 2026-04-24 | `PX-08` export en sturing | KPI snapshot export (`markdown/csv`) + reviewset voor projectoverleg. | Dev lead, Projectleider | `todo` |
| W6 | 2026-04-27 t.e.m. 2026-05-01 | 2026-05-01 | Stabilisatie en beslispunt | Gezamenlijke stabilisatieronde `PX-01/02/08` + Go/No-go voor volgende uitbreidingsset. | Projectleider, Product owner, Tech lead | `todo` |

## 5.2 Concrete weekplanning RPT-US (2026-03-20 t.e.m. 2026-05-01)
Bronplan: `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`

| Week | Periode | Harde deadline | Focus | Minimaal op te leveren | Owner(s) | Status |
|---|---|---|---|---|---|---|
| W1 | 2026-03-23 t.e.m. 2026-03-27 | 2026-03-27 | Scope + contractbasis | `RPT-US-003`: datasetcontract v1. `RPT-US-004`: auditmetadata afgesproken. | Dev lead, Product owner, Projectleider | `todo` |
| W2 | 2026-03-30 t.e.m. 2026-04-03 | 2026-04-03 | Datamodel + exportfundering | Eerste exportpipeline JSON/CSV met versieveld en filterset. | Dev lead, Tech lead | `todo` |
| W3 | 2026-04-06 t.e.m. 2026-04-10 | 2026-04-10 | `RPT-US-001` implementatie | Dagrapport dispatch v1 (PDF + CSV) met kern-KPI's en niet-toegewezen lijst. | Frontend/dev, QA owner | `todo` |
| W4 | 2026-04-13 t.e.m. 2026-04-17 | 2026-04-17 | `RPT-US-002` implementatie | Weekrapport district v1 (PDF + CSV) met trend en kwaliteitssectie. | Frontend/dev, Product owner | `todo` |
| W5 | 2026-04-20 t.e.m. 2026-04-24 | 2026-04-24 | Validatie + tests | `RPT-US-005`: contracttests en validatieregels actief in quality flow. | QA owner, Dev lead | `todo` |
| W6 | 2026-04-27 t.e.m. 2026-05-01 | 2026-05-01 | UI activatie + go-live beslissing | `RPT-US-006`: Rapporten-view live v1 + Go/No-go op basis van QA-gates. | Projectleider, Tech lead, Product owner | `todo` |

## 6. Werkritme voor overzicht
1. Na elke feature of hotfix: meteen `Status`, `Wat is al gedaan` en `Bewijs` updaten in dit document (zelfde werkblok).
2. Dagelijks: update minimaal `Status` en `Volgende concrete stap`.
3. Wekelijks: herprioriteer top 4 in sectie 5.
4. Elke demo/pitch: voeg 1 regel toe bij uitgevoerde bewijsbestanden.

## 7. Laatste gerealiseerd (hotfix/feed)
1. Foto-upload bug (wit scherm na bestand kiezen) opgelost via storage-quota hardening en foto-optimalisatie.
2. Camera/file picker voor foto-velden staat live als primaire flow (URL enkel optioneel).
3. PDF toont geen base64-dumps meer in tabel; foto's staan in aparte sectie `Ingesloten foto's`.
4. Kwaliteitscheck na fixes: `npm run quality` geslaagd.
5. Nieuw architectuurvoorstel voor data-ontsluiting toegevoegd: `docs/techniek/ARCHITECTUUR_DATAONTSLUITING_VASTSTELLINGEN.md`.
6. Fase 1 data-ontsluiting opgeleverd in code (Repository + IndexedDB default + localStorage fallback/migratiepad).
7. Fase 2 gestart: idempotency in sync-contract + dual-write sync-poging bij queueen.
8. Fase 2 contractlaag uitgebreid: `docs/techniek/API_CONTRACT_SYNC_ENDPOINT_V1.md`, gateway ack parsing, queue kolom `serverOutcome`.
9. Fase 2 backend opgeleverd: `POST /api/inspecties/sync` met persistente idempotency-store en finale statusmapping.
10. GIPOD-export inleeslogica omgebouwd naar nieuwste `Export_*.xlsx` met fallback op weekrapport.
11. Nieuwe GIPOD-filters live in DN Dispatch: bronfase, categorie en vergunningstatus.
12. Kaartpopup en action cards tonen nu vergunningstatus + GIPOD-contextvelden.
13. DN Vaststelling bevat nu dropdown `Nuts-bedrijf (beheerder)` op basis van unieke datasetwaarden.
14. Routeringsvoorstel per toezichter staat live op kaart.
15. GRB grijs/kleur en Luchtfoto Vlaanderen staan live als kaartstijlen.
16. GIPOD/Webuniversum CSS-stijl staat live in de app.
17. Postcoderandenkaartlaag met labels is toegevoegd als toggle.
18. Tijdlijn, Handleiding en Governance zijn live views.



