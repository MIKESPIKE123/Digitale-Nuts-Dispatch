# DN_DISPATCH Docs - Structuur en Leeswijzer

Laatste update: 2026-02-21  
Doel: snelle oriëntatie, consistente naamgeving en duidelijke leesvolgorde voor projectsturing.

## 1. Wat is hernoemd

Deze bestandsnamen zijn gestandaardiseerd:

| Oude naam | Nieuwe naam |
|---|---|
| `DN_ 60-DAGEN INTERSTEDELIJKE Samenwerking.md` | `docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md` |
| `DN Herijking & AI-Transform.md` | `docs/strategie/DN_HERIJKING_EN_AI_TRANSFORMATIE.md` |
| `DN_Herijking ten opzichte van subsidiedossier .md` | `docs/strategie/DN_HERIJKING_TOV_SUBSIDIEDOSSIER.md` |
| `DN_VASTSTELLING_VELDENSET_V2_MD.md` | `docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md` |

## 2. Aanbevolen leesvolgorde (nieuwe projectleider)

1. `docs/strategie/PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md`
2. `docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md`
3. `docs/strategie/GIPOD_POSITIONERING_EN_SAMENWERKING.md`
4. `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md`
5. `docs/uitvoering/PLATFORMUITBREIDING_UITVOERINGSPLAN_PX01_PX02_PX08.md`
6. `docs/uitvoering/EXECUTIEBOARD.md`
7. `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md`

## 3. Documentstructuur en samenvatting

### A. Strategie en positionering

| Bestand | Samenvatting |
|---|---|
| `docs/strategie/PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md` | Concreet 60-dagen plan voor consolidatie, AI-ready voorbereiding en leerloops. |
| `docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md` | Interstedelijk afstemmingstraject in 3 fasen, met GIPOD/backbone en governancefocus. |
| `docs/strategie/GIPOD_POSITIONERING_EN_SAMENWERKING.md` | Positionering van GIPOD als enige structurele dataontsluiting en AI in schil 3. |
| `docs/strategie/DN_HERIJKING_TOV_SUBSIDIEDOSSIER.md` | Strategische herijking van subsidieverhaal naar huidige realiteit en keuzes. |
| `docs/strategie/DN_HERIJKING_EN_AI_TRANSFORMATIE.md` | Architectuuranalyse + AI-opportuniteiten van quick win tot transformatief. |
| `docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md` | Groot evaluatiedocument met faseplan naar volledige productarchitectuur. |

### B. Uitvoering, sprint en demonstratie

| Bestand | Samenvatting |
|---|---|
| `docs/uitvoering/DN_KPI_REGISTER_OVERZICHT.md` | Centraal KPI-register met status per KPI: beschreven, operationeel of nog te beschrijven. |
| `docs/uitvoering/DN_GIPOD_EXPORT_VISUALISATIE_ACTIEPLAN.md` | Actieplan voor inlezen nieuwste GIPOD-export, veldmapping, vergunningkoppeling en kaartvisualisatie met filters. |
| `docs/uitvoering/DN_KNOWN_ADDRESS_REGRESSIECHECK.md` | Vaste regressiecheck op bekende adressen (datasetpunt vs adresgeocode) met runlog. |
| `docs/uitvoering/DN_TEST_ACTIEPLAN_VANUIT_BLOGPOST.md` | Concreet testactieplan voor DN op basis van dominator/gamut-principes (met 6-weken uitvoering). |
| `docs/uitvoering/DN_RAPPORTEN_WORKFLOW_EN_VRAAGLIJST.md` | Workflow + volledige vragenlijst om DN Rapporten (dag, week, API-export) uit te werken zonder rework. |
| `docs/uitvoering/DN_RAPPORTEN_V1_STARTVERSIE.md` | Ingevulde v1-startversie met voorgestelde antwoorden en direct planbare rapport-backlog. |
| `docs/uitvoering/PLATFORMUITBREIDING_UITVOERINGSPLAN_PX01_PX02_PX08.md` | Concreet 6-weken uitvoeringsplan (doel, acties, owner, timing) voor PX-01, PX-02, PX-08. |
| `docs/uitvoering/EXECUTIEBOARD.md` | Dagelijkse status van sprintstories, PX-modules en topprioriteiten. |
| `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md` | User stories, acceptatiecriteria en demo-output voor pitch sprint. |
| `docs/uitvoering/DEMO_SCRIPT_DAG_IN_HET_LEVEN.md` | 9-minuten klikscript inclusief fallback bij sync/internetproblemen. |
| `docs/uitvoering/ITERATIE1_OPTIMALISATIEPLAN_STABILITEIT_SNELHEID.md` | Technische optimalisaties op performance, sync en kwaliteitspipeline. |
| `docs/uitvoering/DN_TOEWIJZING_TOEZICHTERS_RICHTLIJNEN.md` | Richtlijnen voor inzettermijn, reserveplanning, backupvolgorde en dispatchlogica. |

### C. DN Vaststelling architectuur en implementatie

| Bestand | Samenvatting |
|---|---|
| `docs/techniek/DN_VASTSTELLING_INTEGRATIE_EVALUATIE.md` | Integratieanalyse van Vaststelling in DN_DISPATCH met modulaire aanpak. |
| `docs/techniek/DN_VASTSTELLING_FULL_ADOPTION_STATUS.md` | Status van operationele adoptie (sessie, validatie, syncflow). |
| `docs/techniek/DN_VASTSTELLING_FASE0_STATUS.md` | Historische baseline van fase 0 en opgeleverde basiscontracten. |
| `docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md` | Canonieke veldenset v2 met activatiestatus en validatiepoortjes. |
| `docs/techniek/ARCHITECTUUR_DATAONTSLUITING_VASTSTELLINGEN.md` | Migratiepad weg van localStorage-only naar centrale bron van waarheid. |
| `docs/techniek/API_CONTRACT_SYNC_ENDPOINT_V1.md` | Contract en idempotencyregels voor `POST /api/inspecties/sync`. |
| `docs/techniek/DN_OSLO_COMPONENTEN_REGISTER.md` | Werkregister van appcomponenten en veldmapping naar OSLO-kandidaten voor latere standaardisatie. |
| `docs/techniek/DN_CODETABELLEN_INPASSING_ANALYSE.md` | Analyse van voorgestelde codetabellen versus huidige code, met gefaseerde invoerstrategie. |
| `docs/techniek/DN_VASTSTELLING_PDF_RAPPORTSTIJL_ANALYSE.md` | BONU-stijl analyse en vertaling naar huidige PDF-export v1. |

### D. Impactprioritering en opleiding

| Bestand | Samenvatting |
|---|---|
| `docs/opleiding/TOEPASSING_05_IMPACT_PRIORITERING_OPLEIDING.md` | Opleidingsfiche met architectuur, methode en implementatiefasen. |
| `docs/techniek/IMPACT_PIPELINE_FASE1_HANDLEIDING.md` | Pipeline voor impactdatageneratie op basis van open data. |
| `docs/techniek/IMPACT_FASE2_SCORING_ENGINE.md` | Scoringmodel en integratie van impact in de decision engine. |
| `docs/techniek/IMPACT_FASE3_UI_FILTERS.md` | UI-badges en filters voor operationeel gebruik van impactniveau. |
| `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md` | Evaluatie- en kalibratieprocedure met JSON/CSV output. |

### E. Platformuitbreidingen en adoptie

| Bestand | Samenvatting |
|---|---|
| `docs/strategie/PLATFORMUITBREIDINGEN_CATALOGUS.md` | Uitgebreide catalogus met PX-01 t.e.m. PX-14, fases en acceptatiecriteria. |
| `docs/opleiding/QUICK_GUIDES_PER_ROL.md` | Index van operationele one-pagers per rol. |
| `docs/opleiding/QUICK_GUIDE_TOEZICHTER.md` | Dagstart, verplichte invulling en foutenlijst voor terrein. |
| `docs/opleiding/QUICK_GUIDE_DISPATCHER.md` | Dagplanning, toewijzing en sync-opvolging voor dispatch. |
| `docs/opleiding/QUICK_GUIDE_PROJECTLEIDER.md` | Sturingsfocus, weekafsluiting en typische projectfouten. |

### F. Mobiel platform en kaartintegratieanalyses

| Bestand | Samenvatting |
|---|---|
| `docs/IPAD_APP_EVALUATIE.md` | Evaluatie iPad-app via Capacitor: ontbrekende elementen, kostenstructuur en roadmap. |
| `docs/ANDROID_APP_EVALUATIE.md` | Evaluatie Android-app via Capacitor: kostenstructuur, hardware-vergelijking en dual-platform strategie. |
| `docs/ANALYSE_GRB_LUCHTFOTO_GIPOD_CSS.md` | Analyse GRB/Luchtfoto Vlaanderen als kaartlagen en GIPOD CSS-stijl als ontwerp-referentie. |

## 4. Versiebeheer en Backup (Git)

**Repository:** `https://github.com/MIKESPIKE123/Apps.git`

### Tags (snapshots)

| Tag | Datum | Beschrijving |
|---|---|---|
| `v1.4` | — | Isolatie digitale-nuts-app en opschoning repo root |
| `v1.5-pre-css` | 2026-02-21 | **Backup vóór GRB/Luchtfoto/GIPOD CSS wijzigingen.** Volledig werkende staat van dispatch, vaststelling, impact scoring en alle modules. |

### Branches

| Branch | Doel | Status |
|---|---|---|
| `main` | Stabiele productie-baseline | Beschermd |
| `feature/objectbeheer-v2-2` | Hoofdontwikkelbranch (v1.5 functionaliteit) | Actief, up-to-date met remote |
| `feature/gipod-css-grb-kaart` | GRB kaartlagen, Luchtfoto Vlaanderen, GIPOD CSS-stijl | Actief — wijzigingen geïsoleerd |

### Terugkeren naar een veilig punt

```bash
# Terug naar staat vóór CSS-wijzigingen (exact snapshot)
git checkout v1.5-pre-css

# Terug naar werkende ontwikkelbranch (zonder CSS-wijzigingen)
git checkout feature/objectbeheer-v2-2

# Verder werken aan CSS/kaart feature
git checkout feature/gipod-css-grb-kaart
```

### Workflow bij nieuwe features

1. **Tag** de huidige werkende staat: `git tag -a v1.X-pre-<feature> -m "Beschrijving"`
2. **Push** de tag: `git push origin v1.X-pre-<feature>`
3. **Maak feature-branch:** `git checkout -b feature/<naam>`
4. **Werk, commit, test** op de feature-branch.
5. **Merge** naar ontwikkelbranch na validatie: `git checkout feature/objectbeheer-v2-2 && git merge feature/<naam>`
6. **Tag** de nieuwe versie: `git tag -a v1.X -m "Release beschrijving"`

## 5. Werkafspraken voor documentatie

1. Gebruik voortaan uppercase `snake_case` bestandsnamen.
2. Voeg bij strategische docs bovenaan altijd `Datum`, `Status` en `Doel` toe.
3. Houd tactische status enkel in `docs/uitvoering/EXECUTIEBOARD.md`; vermijd dubbele statustabellen.
4. Gebruik dit bestand als centrale index; voeg nieuwe docs ook hier toe.
5. Vermeld bij elke significante wijziging de bijhorende Git-tag en branch in het relevante document.



