# GitHub Account Analyse

Datum: 2026-03-13  
Account: `MIKESPIKE123`  
Aanvullende bron: `C:\Users\5129\OneDrive - digipolis.onmicrosoft.com\Apps`

## Scope

Deze analyse combineert:

- de huidige GitHub-accountinhoud
- lokale repositories en remotes
- lokale kandidaat-projecten die nog niet op GitHub staan
- een eerste curator/architectuurbeoordeling voor twee ecosystemen:
  - persoonlijke experimenten en tools
  - publieke samenwerking rond Digitale Nuts

## Bronnen en beperkingen

- GitHub accounttoegang is gevalideerd via de git credential helper.
- GitHub bevat momenteel 4 repositories in eigendom van `MIKESPIKE123`.
- De lokale map `Apps` bevat daarnaast meerdere extra apps, prototypes en datasets die nog niet als afzonderlijke GitHub-repo bestaan.
- Geen destructieve acties uitgevoerd.

---

## 1. Overzicht van alle GitHub-repositories

| Repository | Private | Doel | Stack | Type | Maturity | DN relevantie |
|---|---:|---|---|---|---|---|
| `Apps` | ja | historische verzamelrepo / legacy monorepo | HTML, JS, gemengd | app / experiment / archive-hybrid | maintenance / archive | medium |
| `Besluitvorming_Overdrachten_App` | ja | besluitbouwer voor overdrachten publiek domein | Next.js, TypeScript, Tailwind | app | prototype / active | medium |
| `Digitale-Nuts-Dispatch` | nee | dispatch- en planningtool voor Digitale Nuts | React, Vite, TypeScript, MapLibre, Vitest | app | active | high |
| `rapport-bedrijfsdirecteur` | ja | rapportering en directie-overzicht | Python, Streamlit, pandas, plotly | app / data-analysis | active | medium-high |

---

## 2. Detailanalyse per GitHub-repository

### 2.1 `Apps`

- Doel:
  - oude verzamelrepo met meerdere civieke tools, dashboards en prototypes
- Tech stack:
  - voornamelijk HTML/JS
  - deels .NET / statische tools in oudere paden
  - branch `feature/DIGITALE_NUTS` bevat een andere inhoudslogica dan `main`
- Type:
  - `app` + `experiment` + `archive`
- Maturity:
  - `maintenance` met sterke legacy-kenmerken
- Digitale Nuts relevantie:
  - `medium`
- README kwaliteit:
  - ontbreekt op root
- Code structuur:
  - niet professioneel consistent
  - branch-afhankelijk
  - `main` en `feature/DIGITALE_NUTS` vertegenwoordigen feitelijk verschillende productwerelden
- Documentatie niveau:
  - laag op repo-root

Beoordeling:

- Bruikbaarheid voor professionele doorontwikkeling: `laag-midden`
- Potentieel als module in groter ecosysteem: `laag`
- Geschikt voor dashboarding / analyse / AI / documentatie: `laag`, behalve als archiefbron
- Bouwsteen voor publieke-ruimte / nuts-tools: `midden`, maar alleen na opsplitsing

Problemen:

- generieke repo-naam
- geen root README
- geen duidelijke productgrens
- branch-silo in plaats van heldere repo-splitsing
- historische build-output en browserprofielen in sommige oudere paden

Aanbeveling:

- behandelen als `legacy workspace monorepo`
- niet verder laten groeien als productrepo
- enkel nog gebruiken als transitielaag voor extractie naar aparte repo’s

### 2.2 `Besluitvorming_Overdrachten_App`

- Doel:
  - local-first besluitbouwer voor overdrachten
- Tech stack:
  - Next.js 16
  - TypeScript
  - Tailwind
  - Zod
  - Zustand
  - IndexedDB
- Type:
  - `app`
- Maturity:
  - `prototype` richting `active`
- Digitale Nuts relevantie:
  - `medium`
- README kwaliteit:
  - goed als technische start-README
- Code structuur:
  - redelijk modern en herkenbaar
  - `src/app`, `components`, `lib`, `store`
- Documentatie niveau:
  - laag-midden

Beoordeling:

- Bruikbaarheid voor professionele doorontwikkeling: `midden-hoog`
- Potentieel als module in groter ecosysteem: `hoog`
- Geschikt voor dashboarding / analyse / AI / documentatie:
  - documentgeneratie: `hoog`
  - AI-assist: `midden`
- Bouwsteen voor publieke-ruimte / nuts-tools: `midden`

Technische signalen:

- build slaagt
- lint faalt op veel `any`-types en een paar JSX-issues
- geen zichtbare testbasis

Aanbeveling:

- behouden als aparte productrepo
- positioneren als document/workflow-engine
- klaar te maken voor samenwerking met standaardsjablonen, CI en docs

### 2.3 `Digitale-Nuts-Dispatch`

- Doel:
  - dispatch-, planning-, monitoring- en inspectieondersteuning voor Digitale Nuts
- Tech stack:
  - React
  - Vite
  - TypeScript
  - MapLibre
  - jsPDF
  - Vitest
- Type:
  - `app`
- Maturity:
  - `active`
- Digitale Nuts relevantie:
  - `high`
- README kwaliteit:
  - inhoudelijk sterk
- Code structuur:
  - modern
  - `src`, `scripts`, `public`, `docs`, tests aanwezig
- Documentatie niveau:
  - midden-hoog

Beoordeling:

- Bruikbaarheid voor professionele doorontwikkeling: `hoog`
- Potentieel als module in groter ecosysteem: `hoog`
- Geschikt voor dashboarding / analyse / AI / documentatie:
  - dashboarding: `hoog`
  - data-analyse: `midden-hoog`
  - AI-uitbreidingen: `hoog`
- Bouwsteen voor publieke-ruimte / nuts-tools: `zeer hoog`

Technische signalen:

- build slaagt
- typecheck slaagt
- 122 tests slagen
- kwaliteitsscript faalt momenteel op foutieve testdetectie in `.codex-edge-profile`
- grote bundle chunks

Aanbeveling:

- behandelen als primaire Digitale Nuts core app
- samenwerking-klaar maken met CI, cleaner ignore-beleid, governance-bestanden en strakkere repo-root

### 2.4 `rapport-bedrijfsdirecteur`

- Doel:
  - directierapportering en exports
- Tech stack:
  - Python
  - Streamlit
  - pandas
  - plotly
  - openpyxl
  - reportlab
- Type:
  - `app`
  - `data-analysis`
- Maturity:
  - `active`
- Digitale Nuts relevantie:
  - `medium-high`
- README kwaliteit:
  - ontbreekt
- Code structuur:
  - compact en begrijpelijk
- Documentatie niveau:
  - laag

Beoordeling:

- Bruikbaarheid voor professionele doorontwikkeling: `midden`
- Potentieel als module in groter ecosysteem: `midden-hoog`
- Geschikt voor dashboarding / analyse / AI / documentatie:
  - dashboarding: `hoog`
  - data-analyse: `hoog`
  - AI: `laag-midden`
- Bouwsteen voor publieke-ruimte / nuts-tools: `midden-hoog`

Technische signalen:

- Python syntax-check slaagt
- repo heeft minimale structuur
- runtime-/exportbestanden zitten in root

Aanbeveling:

- behouden als aparte reporting repo
- normaliseren met README, `.gitignore`, `docs/`, runbook en data-uitleg

---

## 3. Lokale kandidaat-projecten in `Apps` die nog niet als afzonderlijke GitHub-repo bestaan

### Hoog potentieel

| Lokale app | Verwacht type | Maturity | DN relevantie | Opmerking |
|---|---|---|---|---|
| `ARCHISNAPPER BONU RAPPORT` | app / analytics | active | high | sterke kandidaat voor aparte DN analytics repo |
| `ARCHISNAPPER DOSSIERLOG` | data / integration | active | high | goede integratie- en ETL-bouwsteen |
| `RAPPORTERING PROJECTEN` | app / data-analysis | active | high | sterke dashboard- en kwaliteitscontroletool |
| `WEBSITE VASTSTELLINGEN` | app | prototype / active hybrid | high | inhoudelijk sterk, maar versie-sprawl |
| `OPMEET_APP` | app | prototype / active hybrid | high | potentieel veldinstrument, nu versnipperd |
| `PRISMA` | app / docs / AI-knowledge | prototype | medium-high | sterke kennis- en AI-contextlaag |

### Middelmatig potentieel

| Lokale app | Verwacht type | Maturity | DN relevantie | Opmerking |
|---|---|---|---|---|
| `GRAFIEKENBOUWER Rapportering budget` | app / analytics | prototype | medium | bruikbaar voor reportinglaag |
| `bewonersbrief_app` | experiment / docs-tool | prototype | medium | communicatietool, nog niet productklaar |
| `DASHBOARD VERSCHUIVING PLANNING_APP` | app / analytics | archive / maintenance | medium | eerder legacy, mogelijk als referentiebron |

### Lage prioriteit / archive / unclear

| Lokale map | Type | Opmerking |
|---|---|---|
| `ALLE DEKSELS NOG AAN TOE` | unknown | geen duidelijke functie |
| `GEMEENTEWEGENREGISTER` | unknown | leeg / onduidelijk |
| `ZWITSERS ZAKMES` | unknown / umbrella | nog geen concrete repo-grens |
| `TEST` | experiment | geen duurzame productgrens |
| `EVALUATIE B toezichter` | docs / experiment | document/prototype |
| `EVALUATIE C toezichter` | docs / experiment | document/prototype |
| `FLOW VASTSTELLINGEN` | docs / experiment | niet als productrepo behandelen |
| `FLOW wat doe ik op het terrein` | docs / experiment | niet als productrepo behandelen |

---

## 4. Overlap, duplicaten en onduidelijke zones

### Duplicaten / overlap

- `Apps` en `Digitale-Nuts-Dispatch`
  - gedeeltelijke overlap rond `DN_DISPATCH`
  - `Apps` bevat historische of branch-specifieke variant
- `WEBSITE VASTSTELLINGEN`
  - meerdere versies: `projectmap.v1.2`, `v1.3`, `v3`, `v4`, `ARCHIEF`
- `OPMEET_APP`
  - veel HTML-versies van hetzelfde product
- `DIGITALE NUTS APP`
  - mix van prototypes, slides, HTML-concepten en de dispatch-app

### Repositories / projecten zonder heldere functie

- `DIGITALE-NUTS` remote lijkt niet meer te bestaan
- `Apps` is te generiek en heeft geen heldere moderne scope
- meerdere lokale mappen hebben waarde, maar nog geen repo-grens

### Duidelijk Digitale Nuts-gerelateerd

- `Digitale-Nuts-Dispatch`
- `ARCHISNAPPER BONU RAPPORT`
- `ARCHISNAPPER DOSSIERLOG`
- `RAPPORTERING PROJECTEN`
- `WEBSITE VASTSTELLINGEN`
- `OPMEET_APP`
- delen van `PRISMA`

---

## 5. Ecosysteemvoorstel

## A. Persoonlijke workspace

Doel:

- snelle experimentatie
- lage overhead
- niet meteen collaboration-ready

Voorgestelde categorieën:

- `experiments/`
- `tools/`
- `data/`
- `archive/`

Hieronder vallen voorlopig:

- `ADHD FOUNDER PLANNER`
- `TEST`
- evaluatie- en flowmappen
- losse assets en diagrammen
- ruwe prototypes zoals `bewonersbrief_app`

## B. Digitale Nuts ecosysteem

Doel:

- publieke of teamgerichte samenwerking
- duidelijke repo-grenzen
- herbruikbare bouwstenen

Voorgestelde structuur:

- `digitale-nuts/apps`
- `digitale-nuts/libraries`
- `digitale-nuts/data`
- `digitale-nuts/docs`
- `digitale-nuts/experiments`

Voorgestelde primaire bouwstenen:

- `digitale-nuts-dispatch` of `digitale-nuts-dispatch-app`
- `digitale-nuts-field-inspection-tools`
- `digitale-nuts-archisnapper-ingest`
- `digitale-nuts-reporting`
- `digitale-nuts-data-schema`
- `digitale-nuts-kpi-engine`

---

## 6. Beoordeling op professioneel potentieel

| Project | Professionele doorontwikkeling | Modulepotentieel | Dashboard / analyse / AI / docs | Publieke ruimte / nuts-bouwsteen |
|---|---|---|---|---|
| `Digitale-Nuts-Dispatch` | hoog | hoog | hoog | zeer hoog |
| `Besluitvorming_Overdrachten_App` | midden-hoog | hoog | documentatie / workflow hoog | midden |
| `rapport-bedrijfsdirecteur` | midden | midden-hoog | dashboarding / analyse hoog | midden-hoog |
| `ARCHISNAPPER BONU RAPPORT` | midden | hoog | KPI-dashboarding hoog | hoog |
| `ARCHISNAPPER DOSSIERLOG` | midden | hoog | integratie / ETL hoog | hoog |
| `RAPPORTERING PROJECTEN` | midden | midden-hoog | data-analyse hoog | hoog |
| `WEBSITE VASTSTELLINGEN` | laag-midden | hoog | workflow en later analyse | zeer hoog |
| `OPMEET_APP` | laag | midden-hoog | veldtool / output | hoog |
| `PRISMA` | midden | hoog | documentatie / AI-context hoog | midden-hoog |
| `GRAFIEKENBOUWER Rapportering budget` | laag-midden | midden | dashboarding | midden |

---

## 7. Quick wins per bestaande GitHub-repo

### `Apps`

- root `README.md` toevoegen
- root `docs/` toevoegen met inventaris en migratieplan
- repository description verduidelijken als legacy workspace
- topics toevoegen
- geen inhoudelijke herschikking zonder expliciete repo-splitsingsstap

### `Besluitvorming_Overdrachten_App`

- README professionaliseren
- `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- description en topics verbeteren

### `Digitale-Nuts-Dispatch`

- `.gitignore` uitbreiden
- governance-bestanden toevoegen
- docs structureren
- repo description en topics verbeteren
- testscope corrigeren zodat lokale browserprofielen niet in quality-check vallen

### `rapport-bedrijfsdirecteur`

- `README.md` toevoegen
- `.gitignore` toevoegen
- `docs/` toevoegen
- description en topics verbeteren

---

## 8. Evidente tijdelijke bestanden en artefacten

Niet verwijderen zonder bevestiging, maar wel markeren:

### In `Digitale-Nuts-Dispatch`

- `.codex-cdp-profile2/`
- `.codex-edge-profile/`
- `tmp.devserver.log`
- `*.tsbuildinfo`
- `*.lnk`

### In `Besluitvorming_Overdrachten_App`

- `devserver.log`
- `.next/`

### In `rapport-bedrijfsdirecteur`

- `.rapport-bedrijfsdirecteur.pid`
- `__pycache__/`

### In legacy / lokale kandidaatprojecten

- `.vscode/chrome-debug-profile/`
- dated exports `*.csv`, `*.xlsx`
- losse `zip`- en `backup`-artefacten
- `desktop.ini`
- tijdelijke `tmp_*.txt`

---

## 9. Aanbevolen eerstvolgende uitvoeringsvolgorde

1. `Digitale-Nuts-Dispatch` collaboration-ready maken
2. `Besluitvorming_Overdrachten_App` structureren en lintschuld terugbrengen
3. `rapport-bedrijfsdirecteur` normaliseren als reporting-repo
4. `Apps` voorzien van rootdocumentatie als legacy-transitierepo
5. `ARCHISNAPPER BONU RAPPORT`, `ARCHISNAPPER DOSSIERLOG` en `RAPPORTERING PROJECTEN` voorbereiden op afzonderlijke GitHub-repo’s
6. `WEBSITE VASTSTELLINGEN` en `OPMEET_APP` eerst intern saneren vooraleer ze publiek of teamgericht te publiceren

---

## 10. Samenvatting

De account heeft vandaag 4 echte GitHub-repositories, maar de werkelijke portfolio is groter en zit in de lokale `Apps`-workspace. De architecturale kern voor een professioneel Digitale Nuts ecosysteem ligt vooral in:

- `Digitale-Nuts-Dispatch`
- `ARCHISNAPPER DOSSIERLOG`
- `ARCHISNAPPER BONU RAPPORT`
- `RAPPORTERING PROJECTEN`
- `WEBSITE VASTSTELLINGEN`
- `OPMEET_APP`

De grootste structurele problemen zijn:

- onduidelijke repo-grenzen
- legacy monorepo-structuur in `Apps`
- ontbreken van standaardbestanden
- tijdelijke / lokale artefacten in werkmappen
- meerdere producten die nog niet als aparte repo bestaan

De aanbevolen strategie is:

- `Apps` degraderen tot transitielaag / legacy monorepo
- Digitale Nuts-projecten afzonderlijk en collaboration-ready maken
- persoonlijke en experimentele projecten apart classificeren en lichter beheren

---

## 11. Uitvoerbaar migratieplan per bestaande GitHub-repo

| Repo | Fase 1: veilig en direct uitvoerbaar | Fase 2: structureel | Niet in fase 1 |
|---|---|---|---|
| `Apps` | root `README.md`, `docs/`, description, topics, legacy-waarschuwing | extractieplan naar aparte repo's, branchdocumentatie, archiveringsstrategie | repo rename, branch cleanup, grootschalige inhoudelijke herschikking |
| `Besluitvorming_Overdrachten_App` | README uitbreiden, `.gitignore` finetunen, `docs/`, governance-bestanden, description/topics | lint debt reduceren, CI, eerste tests, mogelijk hernoemen naar bredere civic-workflow repo | grote functionele refactor |
| `Digitale-Nuts-Dispatch` | `.gitignore` uitbreiden, governance-bestanden, `docs/ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`, description/topics | testscope fixen, CI, data/generated artefacten herbekijken, library-extracties voorbereiden | history cleanup, repo flattening, data-verplaatsing naar aparte repo |
| `rapport-bedrijfsdirecteur` | README, `.gitignore`, `docs/`, description/topics, runbook | tests/lint, sample-data opsplitsen van runtime-data, reporting-module abstraheren | grote functionele uitbreiding of visual rewrite |

### Detail per repo

#### `Apps`

Doel van fase 1:

- de repo begrijpelijk maken
- de repo duidelijk labelen als transitielaag
- migratie voorbereiden zonder bestaande branchgeschiedenis te verstoren

Concrete deliverables:

- `README.md` met:
  - uitleg dat dit een legacy workspace-repo is
  - verwijzing naar actieve productrepo's
  - branchmapping: `main` versus `feature/DIGITALE_NUTS`
- `docs/REPOSITORY_MAP.md`
- `docs/MIGRATION_PLAN.md`

#### `Besluitvorming_Overdrachten_App`

Doel van fase 1:

- repo collaboration-ready maken
- scope verduidelijken
- repo geschikt maken voor klein teamwerk

Concrete deliverables:

- README met context, status, installatie, gebruik, roadmap
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- `.gitignore` aanvullen met lokale artefacten

#### `Digitale-Nuts-Dispatch`

Doel van fase 1:

- de sterkste repo als publieke samenwerkingbasis verstevigen
- repo hygiënisch maken
- governance expliciteren

Concrete deliverables:

- `.gitignore` uitbreiden voor lokale browser- en codex-profielen
- README aanscherpen naar publieke collaboration-readiness
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

#### `rapport-bedrijfsdirecteur`

Doel van fase 1:

- van werkende tool naar beheersbare repo evolueren

Concrete deliverables:

- eerste README
- eerste `.gitignore`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`
- korte `docs/RUNBOOK.md`

---

## 12. Fase 1 quick wins die zonder grote risico's uitgevoerd kunnen worden

### GitHub metadata

- repository descriptions uniformiseren
- topics toevoegen
- geen repo's hernoemen in fase 1

### Repository hygiene

- README's verbeteren of toevoegen
- `.gitignore` verbeteren of toevoegen
- `docs/` toevoegen waar afwezig
- tijdelijke artefacten expliciet documenteren

### Governance

- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `DECISIONS.md`

### Belangrijke nuance over `LICENSE`

Een echte open-source licentie kiezen is juridisch en organisatorisch betekenisvol. Daarom is de veiligste aanpak:

- in fase 1: `LICENSE` nog niet automatisch invullen tenzij jij expliciet een licentiekeuze bevestigt
- alternatief: tijdelijk vermelden in README dat licentie nog te bepalen is

---

## 13. Nieuwe repo-kandidaten uit de lokale `Apps`-workspace

| Lokale bron | Voorgestelde repo-naam | Ecosysteem | Argument |
|---|---|---|---|
| `ARCHISNAPPER BONU RAPPORT` | `digitale-nuts-bonu-reporting` | `digitale-nuts/apps` | volwassen genoeg voor aparte analytics-repo |
| `ARCHISNAPPER DOSSIERLOG` | `digitale-nuts-archisnapper-ingest` | `digitale-nuts/data` of `libraries` | sterke integratie- en ETL-bouwsteen |
| `RAPPORTERING PROJECTEN` | `digitale-nuts-portfolio-reporting` | `digitale-nuts/apps` | reporting en datakwaliteit horen samen |
| `WEBSITE VASTSTELLINGEN` | `digitale-nuts-field-inspection-tools` | `digitale-nuts/apps` | inhoudelijk zeer relevant, maar eerst saneren |
| `OPMEET_APP` | `digitale-nuts-opmeet-tools` | `digitale-nuts/apps` | veldtool met domeinwaarde |
| `PRISMA` | `digitale-nuts-knowledge-base` of `workspace-prisma` | afhankelijk van scope | pas scheiden na scherpere productdefinitie |
| `GRAFIEKENBOUWER Rapportering budget` | `workspace-budget-reporting-tools` | `workspace/tools` | nuttig, maar niet per se Digitale Nuts core |
| `bewonersbrief_app` | `workspace-bewonersbrief-prototype` | `workspace/experiments` | eerst experiment houden |

### Nieuwe repo's die ik nog niet automatisch moet aanmaken

Nog niet automatisch aanmaken zonder extra validatie:

- repo's waarvan privacy/public status niet vanzelfsprekend is
- repo's met sterke versie-sprawl zoals `WEBSITE VASTSTELLINGEN`
- repo's zonder canonieke root zoals `OPMEET_APP`

---

## 14. Praktische uitvoeringsvolgorde na deze analyse

### Stap A

- fase 1 quick wins uitvoeren op:
  - `Digitale-Nuts-Dispatch`
  - `Besluitvorming_Overdrachten_App`
  - `rapport-bedrijfsdirecteur`
  - `Apps` rootdocumentatie

### Stap B

- GitHub descriptions en topics bijwerken

### Stap C

- `ARCHISNAPPER BONU RAPPORT`
- `ARCHISNAPPER DOSSIERLOG`
- `RAPPORTERING PROJECTEN`

Voor deze drie:

- repo-grens valideren
- README en `.gitignore` opstellen
- beslissen of private of publieke samenwerking wenselijk is

### Stap D

- `WEBSITE VASTSTELLINGEN` en `OPMEET_APP` eerst intern normaliseren
- pas daarna eventueel als aparte repo publiceren

---

## 15. Beslispunten die nog expliciete bevestiging vragen

- gewenste licentie per repo
- welke nieuwe Digitale Nuts repo's publiek mogen zijn
- of `Apps` op termijn archived moet worden
- of `Besluitvorming_Overdrachten_App` binnen Digitale Nuts valt of in de persoonlijke workspace
- of `PRISMA` een Digitale Nuts module is of een generieke kennis/tooling-repo

---

## 16. Uitvoeringshistoriek

### 2026-03-14 - DN_DISPATCH - fase 1 quick wins uitgevoerd

Context:

- uitgevoerd in lokale repo `DN_DISPATCH`, overeenkomend met GitHub-repo `Digitale-Nuts-Dispatch`
- doel: collaboration-readiness verbeteren zonder functionele refactor of destructieve opschoning

Uitgevoerd:

- `.gitignore` uitgebreid met lokale artefacten en tijdelijke bestanden:
  - `.codex-cdp-profile*/`
  - `.codex-edge-profile/`
  - `.codex-dispatch-*.json`
  - `.codex-dispatch-*.png`
  - `*.tsbuildinfo`
  - `tmp.devserver.log`, `devserver.log`
  - `*.pid`
  - `.vscode/`
  - `*.lnk`
- `vite.config.ts` aangepast zodat Vitest expliciet `.codex-*` mappen uitsluit van testdetectie
- `CODE_OF_CONDUCT.md` toegevoegd
- `CONTRIBUTING.md` toegevoegd
- `docs/ARCHITECTURE.md` toegevoegd als korte architectuur-index bovenop bestaande technische documentatie
- `docs/ROADMAP.md` toegevoegd als korte roadmap-index bovenop bestaande uitvoeringsdocumenten
- `docs/DECISIONS.md` toegevoegd als beslissingsindex bovenop de bestaande ADR-map
- `README.md` aangevuld met zichtbare samenwerkingslinks en de expliciete noot dat `LICENSE` nog niet automatisch gekozen is

Bewust niet uitgevoerd in deze stap:

- geen `LICENSE` toegevoegd
- geen GitHub description/topics aangepast
- geen CI-workflow toegevoegd
- geen bestaande data- of codewijzigingen van de werkboom teruggedraaid

Validatie:

- `npm run quality` uitgevoerd op `2026-03-14`
- resultaat: geslaagd
- detail:
  - typecheck geslaagd
  - 31 testbestanden geslaagd
  - 122 tests geslaagd

Opmerking:

- bestaande lokale wijzigingen in onder meer `src/App.tsx`, `src/lib/pdfExport.ts`, `DATA/*` en gegenereerde impactbestanden zijn ongemoeid gelaten

### 2026-03-14 - DN_DISPATCH - licentiebasis toegevoegd

Context:

- op basis van expliciete licentiewensen: publieke doelbinding, geen winstbejag, wel kostenterugwinning, en verplichte naamsvermelding
- auteursvermelding opgenomen als `Stad Antwerpen / Publieke Ruimte / Nuts`
- inhoudelijk afgestemd op de City of Things 2025 projectcontext van Digitale Nuts

Uitgevoerd:

- root `LICENSE` toegevoegd als aangepaste `Digitale Nuts Public Purpose License 1.0`
- root `NOTICE` toegevoegd met verplichte attributietekst
- `README.md` bijgewerkt zodat de licentielogica zichtbaar is op repo-root

Belangrijk:

- dit is bewust geen standaard open-source licentie zoals `MIT`, `Apache-2.0` of `GPL`
- de licentie is `purpose-limited` en dus niet `OSI`-conform
- commerciële software-exploitatie wordt niet toegestaan zonder aparte schriftelijke toestemming
- kostenterugwinning voor implementatie, hosting, onderhoud, opleiding en ondersteuning blijft wel toegelaten binnen de doelbinding

Bronbasis:

- City of Things 2025 projectaanvraag `Digitale Nuts`
- lokale subsidie- en projectdocumentatie in `docs/uitvoering/CITY_OF_THINGS_2025_VOORAANMELDING_BRONTEKST.txt`

Validatie:

- geen code- of datavalidatie nodig; wijziging beperkt tot licentie- en documentatiebestanden

### 2026-03-14 - DN_DISPATCH - collaboration-ready afronding lokaal

Context:

- doel: de resterende fase-1 drempels verder wegwerken voor `Digitale-Nuts-Dispatch`
- focus op CI en nette repo-identiteit als zelfstandige GitHub-repo

Uitgevoerd:

- `.github/workflows/ci.yml` toegevoegd
  - draait op `push`, `pull_request` en `workflow_dispatch`
  - gebruikt `npm ci`
  - voert `npm run quality` uit
- remotes opgeschoond:
  - `origin` wijst nu naar `https://github.com/MIKESPIKE123/Digitale-Nuts-Dispatch.git`
  - oude verwijzing naar `Apps` blijft behouden als `legacy-apps`
- upstreams opgeschoond:
  - `main` volgt nu `origin/main`
  - `feature/objectbeheer-v2-2-clean` volgt nu `origin/main`
  - `backup-2026-03-10-canonical-seed` volgt nu `origin/backup-2026-03-10-canonical-seed`

Validatie:

- `npm run quality` opnieuw uitgevoerd op `2026-03-14`
- resultaat: geslaagd
- detail:
  - typecheck geslaagd
  - 31 testbestanden geslaagd
  - 122 tests geslaagd

Statusbeoordeling:

- `DN_DISPATCH` is hiermee lokaal inhoudelijk `fase 1 collaboration-ready`
- nog niet formeel als afgeronde GitHub-status beschouwen zolang:
  - de huidige wijzigingen niet gecommit en gepusht zijn
  - de werkbranch nog `backup-2026-03-10-canonical-seed` is
  - de GitHub metadata (description/topics) nog niet expliciet op de remote bevestigd is

Aanbevolen GitHub metadata zodra push/moment juist is:

- description:
  - `Digitale Nuts Dispatch: collaboration-ready dispatch, inspection and monitoring app for utility works in public space.`
- topics:
  - `digitale-nuts`
  - `dispatch`
  - `inspection`
  - `utility-works`
  - `public-space`
  - `gipod`
  - `react`
  - `vite`
  - `typescript`
  - `city-of-things`

### 2026-03-14 - DN_DISPATCH - branch gepusht en GitHub metadata ingesteld

Context:

- uitgevoerd vanaf schone branch `dn-dispatch-collab-ready-main`
- branch vertrekt van `origin/main` en bevat alleen de collaboration-ready set

Uitgevoerd:

- branch `dn-dispatch-collab-ready-main` gepusht naar `origin`
- GitHub repository description ingesteld op:
  - `Digitale Nuts Dispatch: collaboration-ready dispatch, inspection and monitoring app for utility works in public space.`
- GitHub topics ingesteld op:
  - `digitale-nuts`
  - `dispatch`
  - `inspection`
  - `utility-works`
  - `public-space`
  - `gipod`
  - `react`
  - `vite`
  - `typescript`
  - `city-of-things`

Validatie:

- push naar `origin/dn-dispatch-collab-ready-main` geslaagd
- GitHub API-verificatie bevestigt description en topics

Statusbeoordeling:

- `Digitale-Nuts-Dispatch` kan hiermee op GitHub als `collaboration-ready` beschouwd worden op repository-niveau
- de collaboration-ready wijzigingen staan momenteel op de branch `dn-dispatch-collab-ready-main`
- formele opname in `main` vraagt nog een merge of pull request
