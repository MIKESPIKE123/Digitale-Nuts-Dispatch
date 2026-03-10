# DN_DISPATCH Docs - Structuur en Leeswijzer

Laatste update: 2026-03-06  
Doel: snelle oriëntatie, consistente naamgeving en duidelijke leesvolgorde voor projectsturing.
Huidige release in app-hoofdbalk: `v1.7+` (build `0.1.0`).

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
| `docs/strategie/DN_TERREINAPP_TRANSITIE_EN_GAP_ANALYSE_COT2025.md` | Gap-analyse van desktop naar offline-first terreinapp, met COT-challenges, quick wins en gefaseerd transitiepad. |

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
| `docs/uitvoering/DN_GIPOD_NOTIFICATIE_INBOX_WERKPAD.md` | Diepteanalyse en gefaseerd implementatiepad voor GIPOD notificatie-inbox in DN Governance/Dispatch. |
| `docs/uitvoering/DN_GIPOD_NOTIFICATIE_INBOX_STORIES.md` | Backlog met uitvoerbare stories `DN-GIPOD-NOTIF-001..005` en `DN-GIPOD-OPS-001..003` inclusief scope en acceptatiecriteria. |
| `docs/uitvoering/DN_GIPOD_BETA_REAL_TENANT_VALIDATIEPLAN.md` | Uitvoerplan voor echte beta-tenant validatie met scenario's, smoke-command en go/no-go criteria. |
| `docs/uitvoering/DN_GIPOD_OPERATIONELE_ACCEPTATIE_7_DAGEN.md` | Dagelijks acceptatieraamwerk (7 dagen) met KPI's, issueboard en eindevaluatie. |
| `docs/uitvoering/DN_RELEASE_GATE_V1_7_CHECKLIST.md` | Formele releasepoort v1.7 (kwaliteit, security/governance, operatie, cutover/rollback). |
| `docs/uitvoering/DN_OSLO_WERKPAKKET_HOMOLOGATIE_ANALYSE.md` | Analyse van het OSLO werkpakket (NL) naast de huidige DN-werking, met geïntegreerd homologatiepad en budgetkader. |
| `docs/uitvoering/evidence/README.md` | Bewijsmap voor smoke-rapporten en validatie-artifacts zonder temp-bestanden. |
| `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md` | User stories, acceptatiecriteria en demo-output voor pitch sprint. |
| `docs/uitvoering/DEMO_SCRIPT_DAG_IN_HET_LEVEN.md` | 9-minuten klikscript inclusief fallback bij sync/internetproblemen. |
| `docs/uitvoering/ITERATIE1_OPTIMALISATIEPLAN_STABILITEIT_SNELHEID.md` | Technische optimalisaties op performance, sync en kwaliteitspipeline. |
| `docs/uitvoering/DN_TOEWIJZING_TOEZICHTERS_RICHTLIJNEN.md` | Richtlijnen voor inzettermijn, reserveplanning, backupvolgorde, manuele override, toewijzingsarchief, popupstart vaststelling en action-card contextlinks. |
| `docs/uitvoering/PX04_GIPOD_BETA_ONBOARDING_CHECKLIST.md` | Praktische checklist voor API-toegang, GIPOD-vragenlijst, NIS-filterkeuze en gefaseerde PX-04 uitrol op beta. |

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
| `docs/techniek/DN_GIPOD_NOTIFICATIE_INBOX_TECHNISCH_ONTWERP.md` | Technisch ontwerp voor GIPOD notificatie-inbox: contracts, gateways, flow, errorhandling en implementatiefases. |

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
| `docs/ANALYSE_GRB_LUCHTFOTO_GIPOD_CSS.md` | Analyse + gerealiseerde implementatie van GRB/Luchtfoto Vlaanderen als kaartlagen en GIPOD CSS-stijl. |

### G. Governance workspace en docs-herorganisatie

| Bestand | Samenvatting |
|---|---|
| `docs/governance.ini` | Referentiestructuur van de governance-workspace (template uit zip, niet de fysieke docs-boom). |
| `docs/uitvoering/DN_GOVERNANCE_MASTERPLAN.md` | Hoofdplan voor governance, poorten, budget en uitvoeringssporen. |
| `docs/techniek/DN_REFERENTIEARCHITECTUUR.md` | Referentiearchitectuur voor DN met modulegrenzen, integraties en evolutiepad. |
| `docs/governance/DOCS_HERORGANISATIE_EVALUATIE_EN_MAPPING.md` | Evaluatie of herorganisatie zinvol is, met mapping van huidige docs naar doelstructuur en gefaseerde aanpak zonder big-bang migratie. |
| `docs/governance/digitale-nuts-workspace.zip` | Bron-zip met template-structuur voor governance/architectuur/OSLO/regielaag/integratie/ADR. |
| `docs/governance/00_governance/nis2.md` | Baseline voor NIS2-controls, eigenaarschap en opvolging in Schil 1. |
| `docs/governance/00_governance/avg_logging.md` | Baseline voor AVG-conforme auditlogging, bewaartermijnen en toegangsafbakening. |
| `docs/governance/00_governance/vendor_exit.md` | Baseline voor vendor-exit, dataportabiliteit en lock-in reductie. |

### H. Architecture Decision Records (ADR)

| Bestand | Samenvatting |
|---|---|
| `docs/architectuur-beslissingen/ADR-001-hybride-model.md` | Formele keuze voor gelaagd hybride model als kernarchitectuur. |
| `docs/architectuur-beslissingen/ADR-002-oslo-first.md` | Formele keuze voor OSLO-first semantiek en versieerbare contractdiscipline. |
| `docs/architectuur-beslissingen/ADR-003-ai-buiten-saas.md` | Formele keuze om AI buiten Schil 1-kern te houden (modulair + HITL). |

## 4. Versiebeheer en Backup (Git)

**Repository:** `https://github.com/MIKESPIKE123/Digitale-Nuts-Dispatch.git`

### Tags (snapshots)

| Tag | Datum | Beschrijving |
|---|---|---|
| `v1.4` | 2026-02-09 | Isolatie digitale-nuts-app en opschoning repo root |
| `v1.5` | 2026-02-21 | Release met GRB/Luchtfoto-analyse, mobile evaluaties en versiebeheerupdates |
| `v1.6` | 2026-02-27 | Release met toewijzingsarchief, inspecteurinstellingen import/export, kaartpopup-start van vaststelling en extra action-card contextlinks |
| `v1.5-pre-css` | 2026-02-21 | **Backup vóór GRB/Luchtfoto/GIPOD CSS wijzigingen.** Volledig werkende staat van dispatch, vaststelling, impact scoring en alle modules. |

### Branches

| Branch | Doel | Status |
|---|---|---|
| `main` | Stabiele productie-baseline | Beschermd |
| `feature/objectbeheer-v2-2` | Historische ontwikkelbranch voor v1.6-traject | Alleen referentie indien nog lokaal nodig |
| `feature/gipod-css-grb-kaart` | Historische featurebranch voor kaartlagen/CSS | Functioneel ingehaald; wijzigingen zitten live in `main` |

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

## 6. Back-up toezichters (import/export)

Gebruik in de app `Instellingen > Back-up toezichters (import/export)`:

1. `Exporteer toezichters (.json)` maakt een bestand met alle toezichterconfiguratie:
   - custom toezichters (`I8`, `I9`, ...),
   - overrides op standaardtoezichters,
   - afwezigheidsplanning,
   - dispatchcapaciteit (globaal + per toezichter).
2. Beheer dit JSON-bestand extern (bijv. in OneDrive/Git).
3. `Importeer toezichters (.json)` zet die configuratie terug in de app.

Dit is bedoeld om verschillen tussen lokale instanties (bv. `localhost:3012` en `localhost:3016`) gecontroleerd te kunnen synchroniseren.



