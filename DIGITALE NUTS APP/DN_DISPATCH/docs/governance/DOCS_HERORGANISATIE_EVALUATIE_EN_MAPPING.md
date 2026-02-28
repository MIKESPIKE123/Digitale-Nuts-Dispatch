# DN Docs Herorganisatie - Evaluatie en Mapping

Datum: 2026-02-28  
Status: voorstel met ADR-start uitgevoerd (geen fysieke herstructurering uitgevoerd)  
Doel: beoordelen of herorganisatie van de docs-map zinvol is, en een risicobeperkte migratieroute vastleggen.

## 1. Korte evaluatie

1. De zip-workspace (`digitale-nuts-workspace.zip`) is een nuttige referentiestructuur, maar inhoudelijk vooral een template met lege v0.1-sjablonen.
2. De huidige `docs/`-structuur is al functioneel en bevat operationele inhoud die actief gebruikt wordt.
3. Een directe fysieke mapmigratie nu verhoogt risico op brekende links/imports in app en documentatie.
4. Conclusie: herorganisatie is zinvol als "logisch raamwerk", maar best gefaseerd en zonder big-bang verplaatsing.

## 2. Referentiestructuur (doelbeeld)

Deze structuur wordt als doelbeeld gebruikt:

```text
digitale-nuts/
├── 00_governance/
├── 01_architectuur/
├── 02_oslo/
├── 03_field_ui/
├── 04_regielaag/
├── 05_saas_integratie/
└── 06_architecture_decisions/
```

## 3. Mapping van huidige docs naar doelbeeld

| Doeldomein | Bestaande bronbestanden (huidige locatie) | Advies nu |
|---|---|---|
| `00_governance` | `docs/strategie/REGIELAAG_GOVERNANCE_INTEGRATIES_ROLLENMODEL.md`, `docs/uitvoering/DN_GOVERNANCE_MASTERPLAN.md`, `docs/strategie/DN_ROLLENBEZETTING_INVULMATRIX.md`, `docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md` | Niet verplaatsen, wel labelen als governance-kern |
| `01_architectuur` | `docs/techniek/DN_REFERENTIEARCHITECTUUR.md`, `docs/techniek/ARCHITECTUUR_DATAONTSLUITING_VASTSTELLINGEN.md`, `docs/Digitale_Nuts_Hybride_Architectuur_Governance.xml`, `docs/opleiding/Digitale_Nuts_Hybride_Architectuur_Governance.drawio` | Geen verplaatsing; centrale architectuurindex voorzien |
| `02_oslo` | `docs/techniek/DN_OSLO_COMPONENTEN_REGISTER.md`, `docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md`, `docs/strategie/GIPOD_POSITIONERING_EN_SAMENWERKING.md` | Geen verplaatsing; expliciete OSLO-tag in index |
| `03_field_ui` | `docs/opleiding/QUICK_GUIDE_TOEZICHTER.md`, `docs/opleiding/QUICK_GUIDE_DISPATCHER.md`, `docs/opleiding/QUICK_GUIDE_PROJECTLEIDER.md`, `docs/opleiding/QUICK_GUIDES_PER_ROL.md`, `docs/IPAD_APP_EVALUATIE.md`, `docs/ANDROID_APP_EVALUATIE.md` | Huidige map `opleiding/` behouden |
| `04_regielaag` | `docs/uitvoering/EXECUTIEBOARD.md`, `docs/uitvoering/DN_TOEWIJZING_TOEZICHTERS_RICHTLIJNEN.md`, `docs/uitvoering/DN_KPI_REGISTER_OVERZICHT.md`, `docs/techniek/IMPACT_FASE2_SCORING_ENGINE.md`, `docs/techniek/IMPACT_FASE3_UI_FILTERS.md`, `docs/techniek/IMPACT_FASE4_VALIDATIE_EN_KALIBRATIE.md` | Geen verplaatsing; groepering via index |
| `05_saas_integratie` | `docs/techniek/API_CONTRACT_SYNC_ENDPOINT_V1.md`, `docs/uitvoering/PX04_GIPOD_BETA_ONBOARDING_CHECKLIST.md`, `docs/uitvoering/DN_GIPOD_EXPORT_VISUALISATIE_ACTIEPLAN.md`, `docs/strategie/PLATFORMUITBREIDINGEN_CATALOGUS.md` | Geen verplaatsing; integratie-overzicht toevoegen |
| `06_architecture_decisions` | `docs/architectuur-beslissingen/ADR-001-hybride-model.md`, `docs/architectuur-beslissingen/ADR-002-oslo-first.md`, `docs/architectuur-beslissingen/ADR-003-ai-buiten-saas.md` | ADR-reeks opgestart, verder aanvullen per poortbeslissing |

## 4. Waarom geen directe mapmigratie

1. Governance-tab in de app verwijst naar vaste documentpaden in code (`src/App.tsx`).
2. De centrale docs-index (`docs/README.md`) bevat expliciete paden die nu kloppen.
3. Big-bang verplaatsing vraagt tegelijk updates in app, docs en eventueel scripts; dat verhoogt regressierisico.

## 5. Gefaseerde aanpak (aanbevolen)

1. Fase A - Logische herorganisatie: behoud fysieke mappen, maar beheer via mapping/index per doeldomein.
2. Fase B - ADR-start: uitgevoerd op 2026-02-28 met `ADR-001/002/003`.
3. Fase C - Selectieve migratie: verplaats alleen stabiele bestanden in batches van 2-4 met redirect-notes in oude locatie.
4. Fase D - App/README updates per batch: pas importpaden en bronverwijzingen onmiddellijk mee aan.

## 6. Beslissing op dit moment

1. Geen fysieke herstructurering van `docs/` uitvoeren.
2. Wel de zip-structuur gebruiken als governance-raamwerk en beslissingskader.
3. Volgende stap: domeinlabels consistent maken en ADR-004+ koppelen aan poortmomenten.
