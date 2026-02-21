# DN Rapporten - Workflow en Vragenlijst

Datum: 2026-02-20  
Status: Voorbereiding volgende iteratie  
Scope: consolidatie dagrapportering, managementrapportering en API-ready exports

Ingevulde startversie met voorgestelde antwoorden:
`docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md`

## 1. Context (huidige situatie)

Wat bestaat al:
1. `DN Rapporten` staat als roadmap-view in de navigatie (`src/App.tsx`).
2. PDF-export per toezichter vanuit dispatch bestaat (`src/lib/pdfExport.ts`).
3. PDF-export per vaststellingsfiche bestaat (`src/modules/vaststelling/pdfReport.ts`).

Wat ontbreekt nog:
1. geconsolideerd dagrapport dispatch over alle toezichters;
2. geconsolideerd weekrapport per district;
3. gestandaardiseerde exportdatasets (API-ready) voor partners/BI.

## 1.1 Overzicht bestaande rapportoutputs (as-is)

| Output nu | Broncode | Trigger in UI | Inhoud | Huidige beperking |
|---|---|---|---|---|
| Dispatch PDF per toezichter | `src/lib/pdfExport.ts` | knop `PDF` in dispatchboard | opdrachtlijst dag, terreinacties, opleveringsopvolging | geen consolidatie over alle toezichters/districten |
| Vaststelling PDF per fiche | `src/modules/vaststelling/pdfReport.ts` | export in vaststellingsflow | dossiercontext, vaststellingsregels, NOK-samenvatting, foto-evidence | recordniveau, geen dag/week aggregatie |

Doel voor DN Rapporten:
1. deze twee bestaande outputs niet vervangen, maar combineren in een rapportoverzicht met dag-, week- en exportniveaus.

## 2. Doel van deze workflow

In 1 iteratie van analyse en besluitvorming alle noodzakelijke keuzes vastleggen zodat ontwikkeling van de module "DN Rapporten" zonder rework kan starten.

## 3. Workflow in 7 stappen

## Stap 1 - Rapportdoel en doelgroep vastleggen

Output:
1. lijst van rapporttypes met primaire doelgroep;
2. doel van elk rapport in 1 zin.

Vragen:
1. Wie is de primaire gebruiker van elk rapport? (dispatcher, projectleider, management, partner)
2. Welke beslissing moet de gebruiker nemen op basis van dit rapport?
3. Welk rapport is operationeel (dagelijks) en welk rapport is sturend (wekelijks/maandelijks)?
4. Wat is "must-have" in v1 en wat mag pas in v2?

## Stap 2 - Rapportcatalogus v1 afbakenen

Output:
1. v1 catalogus met 3 rapporttypes:
- Dagrapport dispatch
- Weekrapport district
- Export API-ready datasets
2. scope in/out per rapporttype.

Vragen:
1. Moet dagrapport 1 rapport per toezichter zijn of 1 geconsolideerd rapport per dag?
2. Is weekrapport per district verplicht of ook stedelijk totaal?
3. Moet er 1 uniforme lay-out zijn voor alle rapporten?
4. Welke rapporten moeten direct als PDF, welke als CSV/JSON, en welke beide?

## Stap 3 - KPI, velden en definities bepalen

Output:
1. definitietabel per rapportveld;
2. bronmapping (uit welk object/veld het komt).

Vragen:
1. Welke KPI's zijn verplicht in dagrapport? (bv. toegewezen dossiers, open NOK, failed sync)
2. Welke KPI's zijn verplicht in weekrapport district? (bv. doorlooptijd, kwaliteitsscore, herstelstatus)
3. Welke definities zijn leidend als dezelfde KPI op meerdere plekken bestaat?
4. Welke drempels/kleurcodes gebruiken we (`LAAG`, `MIDDEL`, `HOOG`)?
5. Welke velden zijn indicatief en mogen niet als beleidscijfer gepresenteerd worden?

## Stap 4 - Datakwaliteit, validatie en auditregels

Output:
1. datakwaliteitsregels per rapporttype;
2. validatiepoort voor publiceerbare rapporten.

Vragen:
1. Wanneer blokkeren we rapportgeneratie wegens ontbrekende data?
2. Welke missende velden mogen wel met waarschuwing (maar zonder blokkering)?
3. Welke auditinformatie is verplicht in elke export? (generatedAt, actor, bronversie, filterset)
4. Moeten rapporten herproduceerbaar zijn met exact dezelfde inputset?
5. Welke retention/bewaartermijnen gelden voor exports?

## Stap 5 - Formaat en distributie

Output:
1. distributiematrix per rapporttype;
2. naming- en versieconventie.

Vragen:
1. Hoe wordt elk rapport verspreid? (download, mail, API, gedeelde map)
2. Is er een maximumgrootte voor PDF/CSV/JSON?
3. Welke bestandsnaamconventie gebruiken we? (bv. `dagrapport_dispatch_YYYYMMDD.pdf`)
4. Welke metadata moet in de bestandsheader/footers staan?
5. Moeten we rapportversies nummeren (`v1`, `v1.1`)?

## Stap 6 - API-ready dataset contracten

Output:
1. contractdefinitie voor exportdatasets;
2. mapping naar `WorksGateway/InspectionsGateway/PermitsGateway/ComplaintsGateway`.

Vragen:
1. Welke dataset is minimaal nodig voor externe consumptie in v1?
2. Welke kolommen zijn verplicht vs optioneel?
3. Welke sleutel gebruiken we als stabiele id (`recordId`, `inspectionId`, `workId`)?
4. Welke statusmapping gebruiken we als canoniek model (`planned`, `in_progress`, `temporary_restore`, `closed`)?
5. Welk formaat ondersteunen we eerst: CSV, JSON of beide?
6. Moeten we incremental exports voorzien (delta sinds timestamp)?

## Stap 7 - Acceptatie, governance en release

Output:
1. Definition of Done per rapporttype;
2. release-gates en eigenaarschap.

Vragen:
1. Wie keurt inhoudelijk elk rapporttype goed?
2. Wie is eigenaar van KPI-definities bij wijzigingen?
3. Welke QA-gates moeten "approved" zijn voor release?
4. Welk fallbackscenario gebruiken we bij rapportfout of ontbrekende brondata?
5. Hoe communiceren we beperkingen expliciet naar gebruikers?

## 4. Uitwerking per rapporttype (vragenlijst)

## 4.1 Dagrapport dispatch

Doel:
1. dagelijkse operationele sturing van dispatch en terreinwerking.

Noodzakelijke vragen:
1. Welke operationele KPI's moeten erin op 1 pagina?
2. Moet routevolgorde en werkdrukverdeling per toezichter zichtbaar zijn?
3. Moeten failed sync-items en retry-status expliciet in een sectie?
4. Moet lijst "niet-toegewezen dossiers" verplicht worden opgenomen?
5. Welke cutoff-tijd geldt voor "dagrapport van vandaag"?

## 4.2 Weekrapport district

Doel:
1. managementoverzicht per district met trend en kwaliteitsbeeld.

Noodzakelijke vragen:
1. Welke districten en aggregatieniveaus ondersteunen we in v1?
2. Welke trendperiode tonen we standaard? (vorige week, 4 weken, kwartaal)
3. Welke kwaliteitsindicatoren zijn verplicht? (NOK-rate, checklistscore, doorlooptijd)
4. Moet vergelijking tussen districten zichtbaar zijn of niet?
5. Moet er een managementsamenvatting in tekst gegenereerd worden?

## 4.3 Export API-ready datasets

Doel:
1. herbruikbare, consistente exports voor partners, BI en beleidsrapportering.

Noodzakelijke vragen:
1. Welke 3 datasets leveren we eerst? (dispatch, vaststelling, KPI-summary)
2. Welke dataset gebruikt welke sleutel als primary key?
3. Welke privacyvelden moeten geanonimiseerd of uitgesloten worden?
4. Moet de export filterbaar zijn op datum, district, toezichter?
5. Welke contracttests moeten slagen voor publicatie?

## 5. Beslissingslog (verplicht bij elke sessie)

Gebruik dit blok per workshop/beslismoment:

1. Datum:
2. Rapporttype:
3. Beslissing:
4. Reden:
5. Impact op data/model/UI:
6. Owner:
7. Deadline:
8. Open risico:

## 6. Aanbevolen workshopvolgorde (3 sessies)

1. Sessie 1 (90 min): doelgroepen, rapportcatalogus, KPI-definities.
2. Sessie 2 (90 min): datakwaliteit, auditregels, formaat/distributie.
3. Sessie 3 (60 min): API-contracten, DoD, releaseplanning.

## 7. Eerste implementatie-output na deze workflow

1. `DN Rapporten` functionele scope v1 (goedgekeurd).
2. veld- en KPI-definitietabel (canoniek).
3. datasetcontract v1 (CSV/JSON) met testregels.
4. backlog met stories voor:
- Dagrapport dispatch
- Weekrapport district
- Export API-ready datasets
