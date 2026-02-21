# DN KPI Register - Overzicht

Datum: 2026-02-21  
Status: Werkregister v1  
Doel: 1 centrale lijst met KPI's die al beschreven zijn, operationeel gebruikt worden, of nog beschreven moeten worden.

## 1. Legenda

1. `BESCHREVEN`: KPI heeft al expliciete definitie/formule in docs of handleiding.
2. `OPERATIONEEL`: KPI wordt al berekend/getoond in de app.
3. `TE BESCHRIJVEN`: KPI is voorzien, maar formule/bron/beperking is nog niet formeel vastgelegd.

## 2. KPI's met bestaande formele definitie (KPI-module v1)

Bron: `src/modules/kpi/definitions.ts`

| KPI | Status | Waar gebruikt | Referentie |
|---|---|---|---|
| Dossiers in scope | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |
| Vaststellingen per toezichter (huidige week) | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |
| % records met context (adres + nutsmaatschappij + referentie + GIPOD) | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |
| % handover ingevuld | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |
| Gemiddelde checklistscore (0-100) | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |
| Trend week op week | `BESCHREVEN` + `OPERATIONEEL` | Dashboard trendblok + DN Handleiding | `src/modules/kpi/definitions.ts` |
| Queue: queued / failed / synced | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |
| Top 5 prioriteitsdossiers | `BESCHREVEN` + `OPERATIONEEL` | Dashboard KPI-paneel v1 + DN Handleiding | `src/modules/kpi/definitions.ts` |

## 3. Aanvullende operationele dashboard-KPI's (in code)

Bron: `src/modules/kpi/dashboardKpiEngine.ts`  
Opmerking: deze KPI's zijn operationeel, maar niet allemaal al formeel beschreven in KPI-definitietabel.

| KPI | Status | Referentie |
|---|---|---|
| Startbezoeken vandaag | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Eindbezoeken vandaag | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Tussenbezoeken vandaag | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Toewijzingsgraad | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Niet-toegewezen verplicht | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Capaciteitsdruk (>=5) | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Overbelast (>=6) | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Eindigt binnen 3 dagen | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Over tijd (IN EFFECT) | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Vergund start <=7 dagen | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Follow-up open | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Locatiekwaliteit exact | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Datacompleetheid | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Spreiding werkdruk | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Top district | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |
| Top postcode | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/dashboardKpiEngine.ts` |

## 4. Week-op-week trend-KPI's (operationeel)

Bron: `src/modules/kpi/trendKpiEngine.ts`

| KPI | Status | Referentie |
|---|---|---|
| Vaststellingen (huidige week) | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/trendKpiEngine.ts` |
| Gemiddelde checklistscore | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/trendKpiEngine.ts` |
| Handover ingevuld | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/trendKpiEngine.ts` |
| Records met score < 70 | `OPERATIONEEL` + `TE BESCHRIJVEN` | `src/modules/kpi/trendKpiEngine.ts` |

## 5. KPI's voorzien in DN Rapporten v1

Bron: `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`

## 5.1 Dagrapport dispatch

| KPI key | Status | Referentie |
|---|---|---|
| `dossiers_in_scope` | `BESCHREVEN` + `OPERATIONEEL` (via bestaand KPI-paneel) | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:52` |
| `toegewezen_dossiers` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:53` |
| `niet_toegewezen_dossiers` | `OPERATIONEEL` + `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:54` |
| `failed_sync_items` | `OPERATIONEEL` + `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:55` |
| `open_nok_items` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:56` |
| `handover_ingevuld_pct` | `BESCHREVEN` + `OPERATIONEEL` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:57` |
| `records_met_context_pct` | `BESCHREVEN` + `OPERATIONEEL` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:58` |
| `high_impact_dossiers` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:59` |

## 5.2 Weekrapport district

| KPI key | Status | Referentie |
|---|---|---|
| `aantal_vaststellingen_per_district` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:63` |
| `nok_ratio` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:64` |
| `gemiddelde_checklistscore` | `BESCHREVEN` + `OPERATIONEEL` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:65` |
| `failed_sync_ratio` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:66` |
| `gemiddelde_doorlooptijd_status_open_tot_closed` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:67` |
| `herbezoek_ratio` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:68` |
| `high_impact_share` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:69` |
| `top_3_risicodossiers` | `TE BESCHRIJVEN` | `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md:70` |

## 6. Strategische KPI-families uit subsidiedossier

Bron: `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md:112`

| KPI-familie | Status nu | Referentie |
|---|---|---|
| Kwaliteit herstel (KPI 1.1-1.3) | `GEDEELTELIJK` | `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md:113` |
| Operationele efficientie toezicht (KPI 2.1-2.3) | `GEDEELTELIJK` | `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md:114` |
| Datakwaliteit en integratie (KPI 3.1-3.3) | `GEDEELTELIJK` | `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md:115` |
| Hinder en bewonerservaring (KPI 4.1-4.3) | `GEDEELTELIJK` | `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md:116` |
| Beleidsopvolging en samenwerking (KPI 5.1-5.3) | `GEDEELTELIJK` | `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md:117` |

## 7. Impactkalibratie-KPI's (monitoring)

Bron: `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md`

| KPI | Status | Referentie |
|---|---|---|
| Dossiers geevalueerd | `BESCHREVEN` + `OPERATIONEEL` | `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md:21` |
| Dossiers met scorewijziging | `BESCHREVEN` + `OPERATIONEEL` | `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md:22` |
| Promotie naar HOOG (`promotedToHigh`) | `BESCHREVEN` + `OPERATIONEEL` | `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md:23` |
| Gemiddelde prioriteit oud -> nieuw | `BESCHREVEN` + `OPERATIONEEL` | `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md:24` |

## 8. Prioritaire KPI-definitiebacklog (voor rapportering v1)

Deze KPI's eerst formaliseren (formule, bron, beperking, owner) om DN Rapporten v1 correct te kunnen opleveren:

1. `toegewezen_dossiers`
2. `open_nok_items`
3. `high_impact_dossiers`
4. `aantal_vaststellingen_per_district`
5. `nok_ratio`
6. `failed_sync_ratio`
7. `gemiddelde_doorlooptijd_status_open_tot_closed`
8. `herbezoek_ratio`
9. `high_impact_share`
10. `top_3_risicodossiers`

## 9. Koppeling met bestaande documenten

1. Rapportworkflow: `docs/uitvoering/DN_RAPPORTEN_WORKFLOW_EN_VRAAGLIJST.md`
2. Rapport startversie: `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`
3. Uitvoeringsplanning: `docs/uitvoering/EXECUTIEBOARD.md`
4. Strategisch kader KPI-families: `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md`
