# Digitale Nuts - Evaluatie Subsidiedossier vs Huidige App + Realisatieplan

Datum: 2026-02-17  
Project: `DN_DISPATCH` (met geintegreerde module `DN Vaststelling`)

## 1. Doel van deze nota
Deze nota evalueert in detail hoe ver de huidige Digitale Nuts-app al staat tegenover het subsidiedossier (City of Things 2025), en welke stappen nog nodig zijn om de volledige doelarchitectuur te realiseren.

De analyse is gemaakt op basis van:
- `city_of_things_2025_formulier_projectaanvraag Digitale Nuts.pdf`
- `Digitale_Nuts_CoT2025_BIJLAGEN.pdf`
- Huidige codebase en documentatie in `DN_DISPATCH`
- Huidige dataflow en scripts (`import:data`, `import:impact`)

## 2. Korte managementsamenvatting
1. De huidige app is sterk als operationele front-end voor dispatch, kaartwerking en terreincontext.
2. De app dekt al een relevant deel van het MVP-verhaal (schil 1), maar vooral op UI/UX en lokale workflow.
3. De grootste gaten zitten in de gedeelde dataketen: echte API-integraties, OSLO-conform datamodel, identity/security, centrale opslag en governance-by-design.
4. Schil 2 en schil 3 (AI, bewonerscommunicatie, retributie, opschaling over steden heen) zijn grotendeels nog niet productierijp uitgewerkt.
5. De cruciale doorbraak is niet nog een extra scherm, maar een betrouwbare ketenarchitectuur met centrale backend, data-contracten en federatieve samenwerking (stad-nuts-Vlaanderen).

## 3. Doelbeeld uit het subsidiedossier (samengevat)
Het dossier verwacht een platform dat uitgroeit van lokale MVP naar Vlaamse schaal, in drie schillen:

1. Schil 1 (2026 Q2 - 2027 Q2): kern-MVP
- Mobiele toezichtapp (offline-first) met locatie, foto, vaststellingen
- Basis GIPOD-koppeling
- Uniform OSLO-datamodel + OpenAPI
- API/portaal voor nutsbedrijven en aannemers
- KPI-starterset
- Basis beveiliging (SSO, audittrail, DPIA), eerste pilot en opleiding

2. Schil 2 (2027 Q2 - 2028 Q1): functionele uitbreiding
- Automatische controles (Code Nuts + vergunning)
- BI-dashboard met kwaliteit/retributie
- Koppelingen met klachten, signalisatie en wegeninfo
- AI-pilot voor beeldcontrole
- Communicatiekanaal naar bewoners/handelaars

3. Schil 3 (2028 Q1 - 2028 Q4): geavanceerd + opschaling
- Predictieve planning
- Geautomatiseerde retributie met juridisch logboek
- Vlaamse data-uitwisseling met OSLO/Athumi policies
- Opschalingspakket: modelbestek, dataconvenant, SLA, raamcontract, onboarding en TCO

## 4. Huidige appstatus (feitelijke observatie)

### 4.1 Wat al sterk is uitgewerkt
- Modulaire React + TypeScript-architectuur met duidelijke scheiding tussen config, domeinlogica en UI.
- Dispatchengine met capaciteit, prioriteit, cadansbezoeken en continuiteit van toezichters.
- Geavanceerde kaartervaring met filters, routevolgorde, zoekfunctie en dossierpopup.
- Integratie van `DN Vaststelling` met contextprefill (BONU, referentie/GW, GIPOD, adres, nutsmaatschappij).
- Lokale validatieflow, handover-flow en sync-queue voor vaststellingen.
- Handleidingmodule in mensentaal (`DN Handleiding`).
- Data-importscripts op basis van DIGITALE NUTS data + open geodata impactprofielen.
- Basis kwaliteitspipeline: typecheck + unit tests (huidig resultaat: 10 tests geslaagd).

### 4.2 Wat momenteel structureel beperkt is
- Geen centrale productieb backend als bron van waarheid (runtime is file/localStorage-gedreven).
- Geen echte bidirectionele GIPOD/A-SIGN/klachtenintegratie op API-niveau.
- Geen OSLO datamodel in de operationele keten (nog geen semantische contractlaag).
- Geen SSO/RBAC/audittrail op enterprise-niveau.
- Foto-evidenceflow en AI-ready beeldpijplijn nog niet productierijp.
- Geen multi-tenant portaal voor nutsbedrijven/aannemers.

## 5. Detail-evaluatie per subsidieluik

Legenda:
- `STERK`: operationeel aanwezig en bruikbaar
- `GEDEELTELIJK`: aanwezig in beperkte of lokale vorm
- `NOG NIET`: ontbreekt of enkel conceptueel

| Subsidievereiste | Huidige status in DN app | Beoordeling | Noodzakelijke vervolgstap |
|---|---|---|---|
| Mobiele toezichtflow voor terrein | `DN Vaststelling` aanwezig met schema-gedreven input en validatie | GEDEELTELIJK | Uitbreiden met productieklare foto/GPS/asset-flow en centrale opslag |
| Offline-first werking | Lokale queue/localStorage en auto-sync bij online | GEDEELTELIJK | Service worker + conflictresolutie + offline datamodel + retry policy |
| Foto + locatie + bewijs per vaststelling | Locatie/context aanwezig, fotopijplijn nog beperkt | GEDEELTELIJK | Centrale fotodatabank, metadata, kwaliteitscontrole, bewaartermijnen |
| Basis GIPOD-koppeling | GIPOD IDs/links zichtbaar, geen echte API-sync keten | GEDEELTELIJK | Bidirectionele GIPOD adapter + statusmapping + event processing |
| GIS-viewer en kaartlagen | Kaartmodule sterk aanwezig | STERK | Verrijken met themalagen uit vergunning/wegen/klachten |
| Portaal/API-laag voor nutsbedrijven/aannemers | Nog geen volwaardig portaal/rollenbeheer | NOG NIET | Extern portaal met workflow, dossierstatus en actieafhandeling |
| OSLO datamodel + OpenAPI specificaties | Nog geen end-to-end semantische contractlaag | NOG NIET | Canoniek datamodel opzetten en API-contracten publiceren |
| Athumi toegangsbeheer + logging | Nog niet geintegreerd | NOG NIET | Datacontracten + policy enforcement + federatieve logging |
| KPI starterset en kwaliteitsmodule | Dashboard aanwezig, maar KPI-families nog niet volledig dossierconform | GEDEELTELIJK | KPI-engine aligneren op Bijlage E met brondata en targetwaarden |
| Backoffice voor stad/nuts | Basis data/sync en settings aanwezig | GEDEELTELIJK | Workflowbeheer, assignment, escalatie, dossierhistoriek centraliseren |
| SSO + audittrail + DPIA | Lokale sessie bestaat, enterprise security ontbreekt | NOG NIET | Entra SSO, RBAC, audit logging, DPIA en security controls |
| Automatische Code Nuts-controles | Validatie op verplichte velden/NOK aanwezig | GEDEELTELIJK | Rule engine met vergunning + signalisatie + herstelvoorwaarden |
| BI-dashboard kwaliteit/retributie | Operationeel dashboard aanwezig, retributie nog niet | GEDEELTELIJK | Datamart + retributiemodule + beleidsrapportering |
| Koppelingen klachten/signalisatie/WIS | Toggle-niveau in UI, geen productiekoppelingen | NOG NIET | Concrete adapters en reconciliatieprocessen |
| AI beeldcontrole | Nog niet operationeel | NOG NIET | Gelabelde fotodataset + explainable AI pilot + governance |
| Bewonerscommunicatie | Nog niet als module | NOG NIET | Notificatieflow via stedelijke kanalen/GIPOD-info |
| Predictieve planning | Route/impactlogica aanwezig, nog niet predictief | GEDEELTELIJK | Historische featurestore + voorspellend model + plannerscherm |
| Geautomatiseerde retributie + juridisch logboek | Niet aanwezig | NOG NIET | Regels, tarieven, bewijsketen en juridisch auditspoor implementeren |
| Opschalingspakket (modelbestek/SLA/TCO/onboarding) | Nog beperkt tot interne docs | GEDEELTELIJK | Formeel pakket opstellen met governance en uitrolstandaard |

## 6. KPI-dekking tegenover Bijlage E

| KPI-familie uit dossier | Huidige dekking | Gat |
|---|---|---|
| Kwaliteit herstel (KPI 1.1-1.3) | Gedeeltelijke veldregistratie en NOK-data | Geen uniforme hersteluitkomst + geen uitvoerderprestatiemodel |
| Operationele efficientie toezicht (KPI 2.1-2.3) | Vaststellingen per toezichter kunnen lokaal gemeten worden | Geen centrale ketentiming en nog geen 100% foto-evidence |
| Datakwaliteit en integratie (KPI 3.1-3.3) | Basis dossierdata met IDs aanwezig | Geen echte GIPOD-syncscore, geen OSLO-conformiteitsscore, geen dataportaalpublicatie |
| Hinder en bewonerservaring (KPI 4.1-4.3) | Impactprofielen uit open data bestaan | Geen klachtenkoppeling en geen bewonersfeedback-closed-loop |
| Beleidsopvolging en samenwerking (KPI 5.1-5.3) | Dashboard en interne docs aanwezig | Geen federatief partnerdashboard en geen formele schaalmetrics |

## 7. Welke data ontbreekt nog (kritiek voor doorbraak)

Prioriteit:
- `P0`: blokkerend voor ketenwerking
- `P1`: nodig voor kwaliteitssturing
- `P2`: nodig voor optimalisatie/opschaling

| Ontbrekende data | Waarom cruciaal | Prioriteit | Verwachte bron/owner |
|---|---|---|---|
| Realtime GIPOD event- en statusdata | Basis van gedeelde waarheid en ketensync | P0 | Digitaal Vlaanderen / GIPOD API |
| Vergunnings- en signalisatievoorwaarden (A-SIGN) | Nodig voor automatische conformiteitscontrole | P0 | Stad Antwerpen A-SIGN |
| Herstelbonnen en uitvoeringsstatus aannemers | Nodig voor KPI kwaliteit + doorlooptijd | P0 | Nutsbedrijven/aannemers (bv. Fluvius) |
| Centrale foto-opslag met metadata (tijd, GPS, actor, dossier) | Nodig voor bewijs, audit en AI | P0 | Nieuwe centrale DN backend/storage |
| SSO-identiteit en rollen (toezichter, beheerder, nuts, aannemer) | Nodig voor traceerbaarheid, beveiliging en governance | P0 | Entra ID + stedelijke IAM |
| Klachtendata (KLM) en terugkoppelingsstatus | Nodig voor hinder-KPI's en bewonerservaring | P1 | Stedelijk klachtenplatform |
| Wegen/materialendata (WIS of equivalent) | Nodig voor herstelkwaliteit, risico en planning | P1 | Wegenbeheer systemen |
| Financiele/retributieregels + contractuele parameters | Nodig voor schil 3 retributie en juridische onderbouwing | P1 | Juridisch/financieel domein stad + nuts |
| Vlaamse datacontracten en OSLO-profielen per entiteit | Nodig voor opschaling en interoperabiliteit | P1 | Digitaal Vlaanderen + Athumi |
| Historische ketendata voor voorspellende modellen | Nodig voor betrouwbare AI/predictie | P2 | Geconsolideerde datamart |

## 8. Wat is cruciaal voor een echte doorbraak

### Doorbraak 1: Van schermen naar ketenplatform
Zonder centrale backend met eventgedreven synchronisatie blijft de app een sterke lokale tool, maar geen Vlaamse dataketen. De belangrijkste stap is dus een production-grade ketenarchitectuur.

### Doorbraak 2: Identity + vertrouwen als fundament
SSO, rollen, audittrail, DPIA en datacontracten zijn geen "later toe te voegen security". Dit is het fundament voor samenwerking tussen stad, nutsbedrijven en Vlaamse partners.

### Doorbraak 3: Bewijsgedreven kwaliteitsmodel
Foto's, geolocatie, herstelstatus en vergunningregels moeten samenkomen in een auditeerbaar model. Pas dan worden KPI's juridisch, operationeel en beleidsmatig bruikbaar.

### Doorbraak 4: Productiseerbare standaard
Het project wordt pas schaalbaar als API's, OSLO-mapping, onboardingkit en uitrolstandaard even sterk zijn als de UI.

## 9. Concreet stappenplan naar "zo volledig mogelijke app"

Uitgangspunt: start vanaf 2026-03 en werk in oplopende complexiteit, met snelle terreinwaarde in elke fase.

### Fase 1 - Fundament dataketen en identity (2026-03 t.e.m. 2026-04)
Doel:
- Centrale backend opzetten als source of truth
- Entra SSO + RBAC
- Migratie van lokale sessie/records naar servermodel

Inschatting:
- 320-420 uur

Deliverables:
- Domain model v1 (`Work`, `Inspection`, `Finding`, `Handover`, `SyncEvent`)
- API v1 + audit logging
- Eerste centrale sync voor `DN Vaststelling`

Quick wins:
- Geen dataverlies meer tussen toestellen
- Volledige traceerbaarheid per toezichter

### Fase 2 - Productiekoppelingen en OSLO-contracten (2026-04 t.e.m. 2026-06)
Doel:
- Echte GIPOD/A-SIGN ketenkoppelingen
- OSLO mapping en contractvalidatie
- Event processing en monitoring

Inschatting:
- 420-560 uur

Deliverables:
- GIPOD adapter (in+uit)
- Vergunningsadapter (A-SIGN)
- Contracttests en conformiteitsrapport

Quick wins:
- Realtime statusupdates per dossier
- Minder manuele contextcontrole op terrein

### Fase 3 - Evidentie, validatie en KPI-engine (2026-06 t.e.m. 2026-08)
Doel:
- Volledige foto/GPS-bewijsketen
- Code Nuts rule engine
- KPI's uit Bijlage E in operationeel dashboard

Inschatting:
- 420-520 uur

Deliverables:
- Fotodatabank + metadata + kwaliteitschecks
- Regelbibliotheek conformiteit
- KPI datamart v1 (kwaliteit, doorlooptijd, datakwaliteit)

Quick wins:
- "KPI 2.3 % met geolocatie en foto" direct meetbaar
- Snelle objectieve feedback naar aannemers

### Fase 4 - Portaal en feedbacklus stad-nuts-burger (2026-08 t.e.m. 2026-10)
Doel:
- Extern portaal voor nuts/aannemers
- Klachtenkoppeling en bewonersstatus
- End-to-end workflow met escalaties

Inschatting:
- 360-460 uur

Deliverables:
- Portaal met rolgebaseerde toegang
- KLM-koppeling en terugkoppelingsstatus
- Notificatieflow bewonersinformatie

Quick wins:
- Gesloten feedbackloop op vaststellingen
- Duidelijkere communicatie naar bewoners

### Fase 5 - AI pilot + predictieve planning (2026-10 t.e.m. 2026-12)
Doel:
- Auditeerbare AI-assistent op fotoherstelkwaliteit
- Predictieve planning op historische data

Inschatting:
- 300-420 uur

Deliverables:
- AI pilot met accuratesse-rapport
- Planner v2 met risicovoorspelling
- Mens-in-de-lus beslisflow

Quick wins:
- Snellere triage van herstelfoto's
- Betere inzet van toezichtcapaciteit

### Fase 6 - Opschaling en governancepakket (2027-01 t.e.m. 2027-02)
Doel:
- Van project naar schaalbaar product
- Formele overdraagbaarheid en beheer

Inschatting:
- 220-320 uur

Deliverables:
- Modelbestek, dataconvenant, SLA-sjablonen
- Onboardingkit en TCO-model
- Governance runbook voor beheer na subsidie

Quick wins:
- Snellere aansluiting van nieuwe steden
- Lager implementatierisico bij opschaling

### Totale richtinschatting
- 2.040 - 2.700 uur (excl. externe aanbestedingstijd en partnerafstemming)

## 10. Aanbevolen uitvoeringsvolgorde (praktisch)
1. Eerst backend + identity + contracts.
2. Dan pas API-koppelingen en OSLO.
3. Daarna evidentiestroom en KPI's.
4. Vervolgens portaal/communicatie.
5. Als laatste AI/predictie en opschaling.

Reden: deze volgorde minimaliseert rework en voorkomt dat AI/rapportering gebouwd wordt op instabiele brondata.

## 11. Belangrijkste risico's en mitigatie

| Risico | Impact | Mitigatie |
|---|---|---|
| Integraties vertragen door externe afhankelijkheden | Hoog | Adapter-first aanpak + sandbox-contracttests + fallback queue |
| Scope creep door veel stakeholders | Hoog | Productboard met harde releasegates per fase |
| Datakwaliteit onvoldoende voor KPI/AI | Hoog | DQ-regels vanaf fase 2 + verplichte metadata + meetbare volledigheid |
| Security/privacy te laat opgepakt | Hoog | DPIA en IAM in fase 1 verplicht inbouwen |
| Onvoldoende terreinadoptie | Middel | Co-creatie met toezichters per sprint + quick guide updates |

## 12. Conclusie
De huidige Digitale Nuts-app is een sterke operationele basis en bewijst al veel terreinwaarde. Om volledig te voldoen aan het subsidiedossier moet de volgende stap nu duidelijk verschuiven naar een robuuste ketenarchitectuur met echte datadeling, identity/security, contractuele interoperabiliteit en meetbare KPI-governance.

Met het voorgestelde faseringsplan kan de app evolueren van een goede dispatch- en vaststellingstool naar een volwaardige Vlaamse referentie-oplossing zoals beschreven in het subsidiedossier.

## 13. Pitchklaar maken (concreet, nu)

### 13.1 Wat we direct kunnen tonen aan het projectteam (2-4 weken)
1. Toon een live "dag in het leven van een toezichter":
- Start sessie toezichter
- Mijn lijst vandaag
- Kaartfocus per actiekaart
- DN Vaststelling met contextprefill
- Handover + sync queue

2. Maak een demo-dashboard met 6 kern-KPI's:
- # dossiers in scope
- # vaststellingen per toezichter/week
- % dossiers met GPS + context
- % dossiers met handover-beslissing
- % synced vs queued
- Top 5 risicodossiers (impactscore)

3. Bouw een "integratieklaar" slide:
- Wat al werkt zonder externe API
- Welke adapters klaar staan voor GIPOD/A-SIGN/KLM
- Welke data nog nodig is van partners

4. Lever een korte quick guide (1 pagina) per rol:
- Toezichter
- Dispatcher
- Projectleider

5. Voorzie een demo-omgeving met vaste testdata:
- 20-30 representatieve dossiers
- 5 met NOK en escalatie
- 3 met sync failure scenario

### 13.2 Ontwikkelen zonder API-kennis (ja, dit kan)
Ja. We kunnen nu al implementeren met een adapter-architectuur en later enkel de connectoren vervangen.

Aanpak:
1. Definieer contract-first interfaces:
- `WorksGateway`
- `InspectionsGateway`
- `PermitsGateway`
- `ComplaintsGateway`

2. Voorzie per gateway twee implementaties:
- `Mock...Gateway` (nu actief)
- `Api...Gateway` (later invullen)

3. Gebruik feature flags per databron:
- `USE_MOCK_GIPOD`
- `USE_MOCK_ASIGN`
- `USE_MOCK_KLM`

4. Leg payloads vast in JSON schema/OpenAPI:
- vandaag al contracttests mogelijk
- later minder integratierisico

5. Bouw outbox/inbox patroon nu al in:
- lokale queue + retries + idempotency key
- later direct bruikbaar voor echte eventstromen

### 13.3 Concrete ontwikkelingen die nu al kunnen (zonder externe API)
1. Rule engine Code Nuts v1 op bestaande velden.
2. KPI-engine v1 op lokale data + syncstatus.
3. Evidentieflow v1 (foto-metadata contract + opslagstrategie, ook al is backend nog mock).
4. Integratietest-harnas met mock responses voor GIPOD/A-SIGN/KLM.
5. Pitchmodule "DN Story" in de app (navigatiescherm met use-cases, resultaten en roadmap).

### 13.4 Open data die vandaag al bruikbaar is
Status gecontroleerd op 2026-02-17.

Direct bruikbaar:
1. Stad Antwerpen Open Data info:
- https://www.antwerpen.be/info/open-data-stad-antwerpen

2. Antwerpen geodata ArcGIS REST (nu al gebruikt in DN):
- Services root: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal?f=pjson
- Bevolkingsdichtheid wijk: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek9/MapServer/867
- Tekortzone gebruiksgroen: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek12/MapServer/89
- Tekortzone dienstencentrum: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek12/MapServer/94
- Flaneerzone: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek8/MapServer/845
- Parkeertariefzone: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek3/MapServer/212

3. Aanvullende lagen voor impact/risico:
- Wegenregister straatas: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek9/MapServer/904
- Gewestweg: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek1/MapServer/68
- Fietsinfrastructuur: https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek11/MapServer/1054

4. Geocoding fallback (reeds in gebruik):
- https://nominatim.openstreetmap.org

Te evalueren/beperkt relevant voor huidige scope:
1. WEWIS open data catalogus:
- https://opendata.wewis.vlaanderen.be/explore/
- API catalogus: https://opendata.wewis.vlaanderen.be/api/explore/v2.1/catalog/datasets
- Vaststelling 2026-02-17: catalogus is technisch bereikbaar, maar inhoud is momenteel vooral WEWIS-domein (werk/sociale economie), niet direct nuts-werfgericht.

### 13.5 Beslissing voor volgende sprint (aanbevolen)
1. Sprintdoel "Pitch Ready v1":
- demoflow stabiel
- KPI-paneel v1
- adapter-architectuur met mocks
- 1 slide met datagaten + partnerinput

2. Parallel voorbereiden:
- datacontract draft voor GIPOD/A-SIGN/KLM
- shortlist van 8 velden die partners minimaal moeten aanleveren

Resultaat: de app is dan tegelijk toonbaar, geloofwaardig en technisch klaar om snel echte API-koppelingen op te nemen zodra die beschikbaar zijn.

Uitwerking sprintniveau:
- Zie `docs/uitvoering/SPRINT_PITCH_READY_V1_BACKLOG.md` voor user stories, acceptatiecriteria, schatting en demo-checklist.



