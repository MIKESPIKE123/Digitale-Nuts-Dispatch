# DN Rapporten - V1 Startversie (Voorstel Antwoorden)

Datum: 2026-02-20  
Status: Beslisvoorstel voor projectleider  
Gebaseerd op: `docs/uitvoering/DN_RAPPORTEN_WORKFLOW_EN_VRAAGLIJST.md`

## 1. Doel

Deze startversie geeft voorgestelde antwoorden op de workflowvragen, zodat de module `DN Rapporten` direct planbaar wordt zonder extra analyse-iteratie.

## 2. Samenvatting voorgestelde v1-keuzes

1. Start met 3 outputs:
- Dagrapport dispatch (operationeel)
- Weekrapport district (management)
- Export API-ready datasets (technisch/partner)
2. Gebruik bestaande PDF's (dispatch + vaststelling) als bron en voeg consolidatielaag toe, geen vervanging.
3. Publiceer v1 in 3 formaten:
- PDF voor leesrapporten
- CSV voor snelle analyse
- JSON voor API-ready koppeling
4. Hanteer strict schema voor kernvelden, warnings voor niet-kritieke velden.
5. Voeg auditmetadata toe aan elke export (generatedAt, actor, filters, contractVersion).

## 3. Ingevulde antwoorden per workflowstap

## Stap 1 - Rapportdoel en doelgroep

| Vraag | Voorstel antwoord v1 |
|---|---|
| Primaire gebruiker | Dagrapport: dispatcher. Weekrapport: projectleider/management. Export: data/integratiepartner. |
| Beslissing op basis van rapport | Dag: herplannen, escaleren, retry-sync. Week: districtbijsturing en capaciteitssturing. Export: koppelen, vergelijken, valideren. |
| Operationeel vs sturend | Dagrapport = operationeel dagelijks. Weekrapport = sturend wekelijks. Export = technisch periodiek. |
| Must-have v1 | Kern-KPI's, vaste definities, PDF+CSV+JSON, auditmetadata. |
| Later (v2) | Geavanceerde trendanalyse, auto-samenvatting, geautomatiseerde distributie per stakeholder. |

## Stap 2 - Rapportcatalogus v1

| Vraag | Voorstel antwoord v1 |
|---|---|
| Dagrapportvorm | 1 geconsolideerd dagrapport + optioneel subsectie per toezichter. |
| Weekrapport scope | Verplicht per district, plus 1 stedelijk totaalblad. |
| Uniforme lay-out | Ja, 1 DN-rapporttemplate met variabele inhoudsblokken. |
| Formaatkeuze | Dagrapport: PDF + CSV. Weekrapport: PDF + CSV. API-export: JSON + CSV. |

## Stap 3 - KPI, velden en definities

### 3.1 Dagrapport dispatch - verplichte KPI's (v1)
1. `dossiers_in_scope`
2. `toegewezen_dossiers`
3. `niet_toegewezen_dossiers`
4. `failed_sync_items`
5. `open_nok_items`
6. `handover_ingevuld_pct`
7. `records_met_context_pct`
8. `high_impact_dossiers`

### 3.2 Weekrapport district - verplichte KPI's (v1)
1. `aantal_vaststellingen_per_district`
2. `nok_ratio`
3. `gemiddelde_checklistscore`
4. `failed_sync_ratio`
5. `gemiddelde_doorlooptijd_status_open_tot_closed`
6. `herbezoek_ratio`
7. `high_impact_share`
8. `top_3_risicodossiers`

### 3.3 Definitieregels
1. KPI-definitie uit `DN Handleiding/KPI-definities` is leidend.
2. Bij conflict tussen dashboard en rapport telt rapport-definitie met versie-id.
3. Kleurcodes:
- `LAAG`: groen
- `MIDDEL`: oranje
- `HOOG`: rood
4. Indicatieve velden altijd labelen met: `v1 indicatief, geen beleidsrapportering`.

## Stap 4 - Datakwaliteit en audit

| Vraag | Voorstel antwoord v1 |
|---|---|
| Blokkeren op ontbrekende data | Ja, voor kernvelden: `recordId`, `workId`, `status`, `updatedAt`, `inspectorId` bij dag/weekly aggregatie. |
| Warnings zonder blokkering | Missende optionele velden zoals `permitReference`, `contractorId`, detailfoto-url. |
| Verplichte auditmetadata | `reportType`, `generatedAt`, `generatedBy`, `filterSet`, `sourceWindow`, `contractVersion`, `rowCount`. |
| Reproduceerbaarheid | Ja, rapport moet hermaakbaar zijn op basis van dezelfde filterset + timestampvenster. |
| Bewaartermijn exports | V1 voorstel: operationeel 90 dagen, management 365 dagen, API-exports 180 dagen. |

## Stap 5 - Formaat en distributie

| Vraag | Voorstel antwoord v1 |
|---|---|
| Distributie | Download in app (v1). Geen automatische mailflow in v1. |
| Max grootte | PDF 15 MB, CSV 25 MB, JSON 25 MB per exportbestand. |
| Bestandsnaam | `dn_<rapporttype>_<scope>_<yyyymmdd>_<hhmm>.ext` |
| Header/footer metadata | Rapporttype, datumvenster, filterset, gegenereerd door, versie. |
| Versiebeheer | Ja: `reportSpecVersion` verplicht in elke export. Start op `v1.0`. |

## Stap 6 - API-ready datasets

### 6.1 Eerste 3 datasets (v1)
1. `dispatch_daily_summary`
2. `district_weekly_summary`
3. `inspection_export_flat`

### 6.2 Sleutels en statusmapping
1. Dagrapport key: `dispatchDate + inspectorId`
2. Weekrapport key: `weekStart + district`
3. Inspectie-export key: `inspectionId` (fallback `recordId`)
4. Canonieke statusmapping:
- `planned`
- `in_progress`
- `temporary_restore`
- `closed`

### 6.3 Formaat en leverwijze
1. JSON + CSV beide ondersteunen in v1.
2. Delta-export in v1 beperkt tot `sinceTimestamp` filterparameter.
3. Volledige bulk-export blijft beschikbaar.

## Stap 7 - Acceptatie en governance

| Vraag | Voorstel antwoord v1 |
|---|---|
| Inhoudelijke goedkeuring | Dagrapport: dispatcher lead. Weekrapport: projectleider. API-export: tech lead + data owner. |
| KPI-eigenaar | Product owner + projectleider (joint owner). |
| Verplichte QA gates | `G1 Functioneel`, `G2 Data/Contract`, `G3 Security/Privacy`. |
| Fallback bij rapportfout | Export faalt soft met foutrapport + retry-optie; vorige succesvolle snapshot blijft raadpleegbaar. |
| Communicatie beperkingen | Bovenaan elk rapport een blok `Bekende beperkingen v1`. |

## 4. Ingevulde rapportspecs per type

## 4.1 Dagrapport dispatch (v1)

Voorstel inhoud:
1. Overzichtsblok (datum, totaal dossiers, toegewezen/niet-toegewezen).
2. Toezichtertabel (werkdruk, high-impact, failed sync).
3. NOK-sectie met top prioritaire open punten.
4. Sync-sectie met retry-lijst.
5. Bijlage: link/refs naar bestaande fiche-PDF's.

Cutoff:
1. Dagrapport sluit om `17:30` lokale tijd.

## 4.2 Weekrapport district (v1)

Voorstel inhoud:
1. Districtscorecard per KPI.
2. Trend t.o.v. vorige week.
3. Kwaliteitssectie (NOK-rate, checklistscore, herstelstatus).
4. Capaciteitssectie (toezichtbelasting per district).
5. Samenvatting met 3 actiepunten.

Standaardperiode:
1. Maandag 00:00 t.e.m. zondag 23:59.

## 4.3 Export API-ready datasets (v1)

Voorstel velden `inspection_export_flat`:
1. `inspectionId`
2. `recordId`
3. `workId`
4. `gipodId`
5. `district`
6. `inspectorId`
7. `statusCanonical`
8. `handoverDecision`
9. `nokCount`
10. `checklistScore`
11. `updatedAt`
12. `photoEvidenceCount`
13. `syncStatus`
14. `serverOutcome`
15. `contractVersion`

Privacyvoorstel:
1. Geen persoonsnamen exporteren, enkel IDs/initialen indien nodig.
2. Geen vrije tekstvelden exporteren naar partnerdataset in v1.

## 5. Beslispunten projectleider (status)

Beslisstatus op 2026-02-20:
1. Cutoff `17:30` voor dagrapport: `OK`.
2. Retentionvoorstel (`90/365/180`): `OK`.
3. JSON+CSV beide voor v1: `OK`.
4. `sinceTimestamp` delta-export in v1: `OK`.
5. Warning-policy voor niet-kritieke ontbrekende velden: `OK`.

## 6. Voorstel backlogstories (direct planbaar)

1. `RPT-US-001` Dagrapport dispatch generator (PDF + CSV)
2. `RPT-US-002` Weekrapport district generator (PDF + CSV)
3. `RPT-US-003` JSON exportcontract v1 + CSV mirror
4. `RPT-US-004` Auditmetadata en exportlog
5. `RPT-US-005` Contracttests en validatieregels rapporten
6. `RPT-US-006` Rapporten-view activeren in `DN Rapporten` (roadmap -> live v1)
