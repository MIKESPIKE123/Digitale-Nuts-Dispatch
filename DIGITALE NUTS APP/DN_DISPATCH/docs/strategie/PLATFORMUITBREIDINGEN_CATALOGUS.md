# DN Platformuitbreidingen - Implementatiecatalogus v2

Datum: 2026-02-18  
Status: Werkdocument voor product, development en pitch  
Scope: `DN_DISPATCH` + geintegreerde module `DN Vaststelling`

## 1. Doel van deze catalogus
Deze catalogus vertaalt de vroegere CoT-nota (met use cases, persona's en challenges) naar concrete platformuitbreidingen die direct in backlog-items kunnen omgezet worden.

Dit document is bedoeld om:
1. keuzes te prioriteren met het projectteam;
2. modules te bouwen zonder te wachten op alle externe API's;
3. duidelijk te maken welke data en afspraken nog ontbreken.

## 2. Bronnen en uitgangspunten
Gebruikte basis:
1. CoT-vooraanmelding "Full version met challenges" (Top 10 use cases, persona's, OSLO/GIPOD/GDPR/KPI/QA-luiken).
2. Huidige appstatus in `DN_DISPATCH`.
3. Reeds uitgewerkte notities (`docs/strategie/SUBSIDIEDOSSIER_EVALUATIE_EN_REALISATIEPLAN.md`, `docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md`).

Architectuuruitgangspunten voor alle uitbreidingen:
1. Contract-first (TypeScript interfaces + JSON schema/OpenAPI).
2. Mock-first (nu bouwen met `Mock...Gateway`, later vervangen door `Api...Gateway`).
3. OSLO-aligned model als canonieke kern.
4. Mobile-first en terreinworkflow eerst.
5. Auditability by design (traceerbaar wie/wat/wanneer).

## 3. Persona's als ontwerpanker

| Persona | Kerndoel | Grootste pijn vandaag | Wat de app moet leveren |
|---|---|---|---|
| S1 Toezichter (Hendrik) | Snel en correct vaststellen op terrein | Losse foto's, Excel, dubbele input | 1 schermflow met context, checklist, bewijs, sync |
| S2 Bewoner (Fatima) | Begrijpen wat/waar/wanneer en melding doen | Laattijdige of onduidelijke communicatie | QR + statusupdates + feedbackloop |
| S3 Nutsmaatschappij (Thomas) | Overzicht en snelle bijsturing op eigen werken | Reactieve klachten, weinig gedeelde waarheid | Realtime status, herstelterugkoppeling, bewijs |
| S4 Beleidsmedewerker (Sarah) | Objectieve rapportering en sturing | Data sprokkelen uit losse bronnen | KPI-dashboard met trends en benchmark |
| S5 Stadsaannemer (Karim) | Duidelijke herstelopdrachten en vlotte goedkeuring | Onduidelijke opdracht, discussie achteraf | Taak met foto-bewijs, materiaalvereisten, snelle review |

## 4. Top 10 use cases vertaald naar modules

| Use case uit nota | Doelmodule(s) | Huidige status | Volgende implementatiestap |
|---|---|---|---|
| Vaststellingen op werf met foto/GPS/timestamp | `PX-01` | gedeeltelijk | evidentieflow en metadata-contract afronden |
| Controle signalisatievergunning | `PX-02` | gedeeltelijk | rule engine en vergunningstatus in UI |
| Herstelcontrole met checklist | `PX-03` | gedeeltelijk | checklistscore en materiaalcontrole toevoegen |
| GIPOD-koppeling | `PX-04` | gedeeltelijk | bidirectionele sync + statusmapping |
| Bewonerscommunicatie | `PX-06` + `PX-07` | beperkt | QR-flow, update templates, feedbackkoppeling |
| Rapportering/retributie | `PX-08` + `PX-09` | beperkt | KPI datamart en juridisch logboek |
| Samenwerking nutsbedrijven | `PX-05` | beperkt | partnerportaal met rolrechten |
| Juridisch bewijs | `PX-01` + `PX-09` + `PX-12` | beperkt | bewijsketen + audittrail + bewaartermijnen |
| AI beeldherkenning | `PX-10` | niet operationeel | rule-based pilot en datasetopbouw |
| Out-of-the-box domeinen (hinderindex, materiaal, preventie) | `PX-10` + `PX-08` + `PX-14` | concept | modulair innovatiepakket met feature flags |

### 4.1 Schiltoewijzing per PX
Deze toewijzing volgt de subsidielogica:
1. `Schil 1`: kern-MVP en fundering.
2. `Schil 2`: functionele uitbreiding.
3. `Schil 3`: geavanceerd, juridische automatisering en opschaling.

| PX | Voorstel | Schil | Reden |
|---|---|---|---|
| `PX-01` | Vaststelling+ en Evidentieflow | `Schil 1` | Kern van mobiele toezichtflow en bewijsregistratie |
| `PX-02` | Vergunning en Signalisatiecontrole | `Schil 2` | Automatische controles op reglement/vergunning |
| `PX-03` | Herstelcontrole, Checklist en Kwaliteitsscore | `Schil 2` | Kwaliteitsuitbreiding op herstelcontrole |
| `PX-04` | GIPOD Connect (In en Out) | `Schil 1` | Basis GIPOD-dataketen |
| `PX-05` | Partnerportaal Nuts en Aannemers | `Schil 1` | API/portaal-luik voor ketensamenwerking |
| `PX-06` | Bewonerscommunicatie en QR | `Schil 2` | Proactieve bewonerscommunicatie |
| `PX-07` | GIS Communicatieviewer | `Schil 2` | Publieksgerichte kaartverrijking |
| `PX-08` | KPI Datamart en Beleidspanel | `Schil 1` | KPI-starterset en basismonitoring |
| `PX-09` | Retributie en Juridisch Logboek | `Schil 3` | Juridische/financiele automatisering |
| `PX-10` | AI Assist | `Schil 2` | AI-pilot en slimme ondersteuning |
| `PX-11` | OSLO Contract Center | `Schil 1` | Uniform datamodel en contractfundering |
| `PX-12` | Privacy, Security en Toegang | `Schil 1` | Basisbeveiliging, audittrail, DPIA |
| `PX-13` | QA Gate Framework | `Schil 1` | Kwaliteitsborging vanaf MVP |
| `PX-14` | Opschaling, Disseminatie en Uitrolmodel | `Schil 3` | Vlaamse schaal en overdraagbaarheid |

## 5. Platformuitbreidingen (implementatieklaar)

### PX-01 - Vaststelling+ en Evidentieflow
Doel:
1. Vaststellingen juridisch en operationeel sluitend maken.

Scope MVP:
1. verplicht contextpakket (`gipodId`, `adres`, `district`, `nutsmaatschappij`, `toezichter`);
2. foto-VOOR en foto-DETAIL met metadata;
3. status/handover/sync vanuit 1 workflow.

User stories:
1. Als toezichter wil ik met 1 knop context invullen zodat ik sneller registreer.
2. Als juridische dienst wil ik een complete evidence chain zodat betwistingen aantoonbaar zijn.
3. Als dispatcher wil ik syncstatus per record zien zodat ik weet wat nog niet verzonden is.

Implementatiestappen:
1. activeer velden uit `docs/techniek/DN_VASTSTELLING_VELDENSET_V2.md` met status `ACTIVEER_SNEL`;
2. voeg media-contract toe (`photoId`, `takenAt`, `lat`, `lon`, `actorId`, `hash`);
3. bouw validatieregel: publiceren blokkeert zonder verplichte kernvelden.

Kan zonder externe API:
1. ja, met lokale/mock opslag;
2. backend storage later vervangbaar via gateway.

Acceptatiecriteria:
1. record kan niet naar `queued` zonder verplichte context;
2. export bevat alle evidence metadata;
3. sync failure blijft zichtbaar en retry werkt.

### PX-02 - Vergunning en Signalisatiecontrole
Doel:
1. afwijkingen sneller detecteren dan vandaag.

Scope MVP:
1. regelset op `signVergNr`, `fase`, `status`, `zone`;
2. waarschuwing in dossierdetail als data ontbreekt of inconsistent is.

User stories:
1. Als toezichter wil ik meteen zien of signalisatievergunning ontbreekt zodat ik gericht controleer.
2. Als nutscoordinator wil ik een lijst met open afwijkingen zodat ik snel kan bijsturen.

Implementatiestappen:
1. rule engine v1 in frontend/service laag (zonder externe API);
2. mock `PermitsGateway` toevoegen met standaard scenario's;
3. mismatch-badge tonen in kaartpopup en vaststellingsformulier.

Kan zonder externe API:
1. ja, met mock vergunningstatus;
2. echte A-SIGN integratie later.

Acceptatiecriteria:
1. 3 testscenario's (ok, ontbrekend, conflict) werken;
2. regels zijn configureerbaar, niet hardcoded in UI-component.

### PX-03 - Herstelcontrole, Checklist en Kwaliteitsscore
Doel:
1. policy-implementation gap verkleinen met objectieve checks.

Scope MVP:
1. checklist sleufherstel in app;
2. materiaaltype + fase + termijnHerstel;
3. eenvoudige kwaliteitsscore (0-100) op checklistuitkomst.

User stories:
1. Als toezichter wil ik een korte checklist zodat ik minder vergeet op terrein.
2. Als beleidsmedewerker wil ik score per aannemer zien zodat ik gericht kan verbeteren.

Implementatiestappen:
1. map checklistitems op nieuwe velden (`verhardingType`, `kritiekeZone`, `termijnHerstel`);
2. voeg scorefunctie toe in domeinlaag;
3. toon score in dossierdetail en dashboard aggregaties.

Kan zonder externe API:
1. ja, volledig.

Acceptatiecriteria:
1. score wordt automatisch berekend bij opslaan;
2. ontbrekende verplichte checklistitems blokkeren afsluiten.

### PX-04 - GIPOD Connect (In en Out)
Doel:
1. 1 gedeelde bron van waarheid tussen stad en nuts.

Scope MVP:
1. inkomende status sync (read);
2. uitgaande update queue (write waar toegelaten);
3. idempotente events + auditlog.

User stories:
1. Als toezichter wil ik actuele GIPOD-status zien zodat ik geen verouderde context gebruik.
2. Als nutsbedrijf wil ik terugkoppeling van vaststellingen ontvangen zonder manuele export.

Implementatiestappen:
1. definieer `WorksGateway` en `InspectionsGateway` payloads;
2. voeg statusmappingtabel toe (`planned`, `in_progress`, `temporary_restore`, `closed`);
3. implementeer outbox/inbox patroon met retries.

Kan zonder externe API:
1. ja, met mock gateway en contracttests;
2. echte koppeling vraagt toegang en afspraken.

Acceptatiecriteria:
1. statusmapping is expliciet gedocumenteerd;
2. dubbele events leiden niet tot dubbele records.

### PX-05 - Partnerportaal Nuts en Aannemers
Doel:
1. samenwerking en opvolging versnellen zonder mailketens.

Scope MVP:
1. partner ziet enkel eigen dossiers;
2. herstelupdate + bewijsfoto upload;
3. opmerkingen en statusreactie op vaststelling.

User stories:
1. Als nutscoordinator wil ik mijn open afwijkingen per district zien.
2. Als aannemer wil ik na herstel foto en status terugsturen voor snelle goedkeuring.

Implementatiestappen:
1. rolmodel toevoegen (`city_inspector`, `dispatcher`, `utility_partner`, `contractor`);
2. partnerview met beperkte velden;
3. reviewflow `submitted -> reviewed -> accepted/rework`.

Kan zonder externe API:
1. gedeeltelijk, in demo met lokale accounts;
2. productie vraagt SSO/RBAC backend.

Acceptatiecriteria:
1. partner kan geen dossiers van andere partner zien;
2. reviewstatus is volledig traceerbaar.

### PX-06 - Bewonerscommunicatie en QR
Doel:
1. reactieve communicatie omzetten naar proactieve updates.

Scope MVP:
1. QR-link op dossierniveau;
2. statusberichten in begrijpbare taal;
3. feedbackstatus gekoppeld aan dossier.

User stories:
1. Als bewoner wil ik op werfbord scannen en direct zien wat er gebeurt.
2. Als stadsmedewerker wil ik updates niet manueel copy-pasten tussen systemen.

Implementatiestappen:
1. templatebibliotheek voor 5 kernberichten (start, vertraging, hinder, herstel bezig, afgerond);
2. QR endpoint naar publieke work summary;
3. feedbackveld met SLA-indicatie.

Kan zonder externe API:
1. ja, met interne dataset en statische templates;
2. klachtenkoppeling later via API.

Acceptatiecriteria:
1. elk dossier kan publieke samenvatting tonen;
2. berichtgeschiedenis blijft zichtbaar per dossier.

### PX-07 - GIS Communicatieviewer
Doel:
1. 1 kaartbeeld voor intern en extern gebruik.

Scope MVP:
1. kaart met actieve werken + statuskleur;
2. filters op adres, wijk, nutsmaatschappij;
3. dossierkaart met foto's, timing, verantwoordelijke.

User stories:
1. Als bewoner wil ik weten welke werken mijn straat raken.
2. Als toezichter wil ik overlap met andere werken zien voor betere planning.

Implementatiestappen:
1. bundel bestaande kaartlagen in aparte layer presets;
2. voeg "publieke modus" toe met beperkte dataset;
3. koppel QR-deeplink naar kaartfocus.

Kan zonder externe API:
1. ja, op basis van bestaande brondata en open geodata;
2. realtime volledigheid stijgt na GIPOD API.

Acceptatiecriteria:
1. focus op dossier werkt zonder UI-overlap op mobiel;
2. layer toggles blijven bruikbaar op smalle schermen.

### PX-08 - KPI Datamart en Beleidspanel
Doel:
1. objectieve KPI's automatisch uit operationele data.

Scope MVP:
1. kern-KPI's uit pitch v1 + uitbreiding uit CoT-nota;
2. trendweergave per week;
3. KPI-definitietabel in handleiding.

User stories:
1. Als beleidsmedewerker wil ik doorlooptijd en kwaliteit per partner opvolgen.
2. Als projectleider wil ik bewijsbare impact tonen in kwartaalrapport.

Implementatiestappen:
1. KPI-calculatielaag centraliseren (geen UI-duplicatie);
2. voeg tijdvenster + vergelijkingsbaseline toe;
3. exporteer KPI snapshot als markdown/csv.

Kan zonder externe API:
1. ja, voor interne operationele KPI's;
2. voor volledige keten-KPI's zijn externe databronnen nodig.

Acceptatiecriteria:
1. elke KPI heeft formule, bron en beperking;
2. dashboard update reageert op filters en sessiecontext.

### PX-09 - Retributie en Juridisch Logboek
Doel:
1. administratieve afhandeling en bewijsvoering automatiseren.

Scope MVP:
1. beslisboom op basis van vaststelling + herstelstatus;
2. juridisch log met onwijzigbare events;
3. conceptdossier voor facturatie/retributie.

User stories:
1. Als jurist wil ik complete tijdslijn met bewijs per dossier.
2. Als administratie wil ik minder manuele bundeling voor retributie.

Implementatiestappen:
1. eventtype-lijst vastleggen (`finding_created`, `partner_notified`, `repair_verified`, `case_closed`);
2. generate dossier bundle (pdf/json) met hash van evidence;
3. voeg tarifering placeholders toe (config-based).

Kan zonder externe API:
1. gedeeltelijk (simulatie en conceptbundel);
2. finale facturatie vraagt financieel systeem.

Acceptatiecriteria:
1. logboekentries zijn niet stilzwijgend overschrijfbaar;
2. dossierbundle kan per case gereproduceerd worden.

### PX-10 - AI Assist (Detectie, Planning, Prioritering)
Doel:
1. toezichters slimmer inzetten en fouten sneller vinden.

Scope MVP:
1. rule-based risicoscore (geen ML afhankelijkheid);
2. AI-ready fotodataset tagging;
3. suggestie "controle eerst deze 5 dossiers".

User stories:
1. Als toezichter wil ik prioriteitsadvies op mijn daglijst.
2. Als beleidsmedewerker wil ik trenddetectie op terugkerende fouten.

Implementatiestappen:
1. bouw explainable risk rules op bestaande features;
2. labelworkflow voor foto's (`ok`, `nok_signage`, `nok_material`, `unknown`);
3. meet model-readiness KPI's (volledigheid, labelkwaliteit).

Kan zonder externe API:
1. ja, volledig voor rule-based fase;
2. ML-model later op centrale dataset.

Acceptatiecriteria:
1. elke score heeft uitlegbare factoren;
2. false positives kunnen manueel gecorrigeerd worden.

### PX-11 - OSLO Contract Center
Doel:
1. semantische interoperabiliteit als vaste laag.

Scope MVP:
1. canonieke entiteiten (`Work`, `Inspection`, `Finding`, `Handover`, `MediaEvidence`);
2. mappingtabellen lokale velden -> OSLO;
3. contractvalidatie in CI.

User stories:
1. Als integratieteam wil ik stabiele contracten zodat koppelingen minder risico hebben.
2. Als partner wil ik weten welke velden minimaal verplicht zijn.

Implementatiestappen:
1. publiceer schema v1 per entiteit;
2. voeg validator tests toe op mock payloads;
3. versiebeheer voor contractwijzigingen (`v1`, `v1.1`).

Kan zonder externe API:
1. ja, volledig.

Acceptatiecriteria:
1. contracttests blokkeren merge bij breaking change;
2. mappingdocument is publiek voor partners.

### PX-12 - Privacy, Security en Toegang
Doel:
1. vertrouwen en compliance borgen vanaf MVP.

Scope MVP:
1. SSO voorbereiding + rolmodel;
2. audittrail op kritieke acties;
3. DPIA register met maatregelen.

User stories:
1. Als security officer wil ik weten wie welk dossier heeft bekeken of aangepast.
2. Als toezichter wil ik privacy by design zodat beelden veilig bruikbaar blijven.

Implementatiestappen:
1. implementeer blur-vereiste in fotoflow;
2. voeg audit events toe op create/update/sync/export;
3. documenteer bewaartermijnen per datatype.

Kan zonder externe API:
1. ja voor audit events en lokale policy checks;
2. SSO productie vraagt IAM-integratie.

Acceptatiecriteria:
1. elke kritieke actie heeft actor + timestamp;
2. DPIA-checklist is ingevuld per nieuwe module.

### PX-13 - QA Gate Framework
Doel:
1. kwaliteit afdwingen tussen fasen.

Scope MVP:
1. formele gates voor functioneel, security, performance, contractconformiteit;
2. gate owner per domein;
3. release checklist in repo.

User stories:
1. Als productboard wil ik objectief beslissen of een module release-klaar is.
2. Als ontwikkelaar wil ik duidelijke DoD en gatecriteria.

Implementatiestappen:
1. definieer 4 standaard gates:
   - `G1 Functioneel`
   - `G2 Data/Contract`
   - `G3 Security/Privacy`
   - `G4 Operatie/Support`;
2. koppel testoutput aan gate template;
3. maak gate approval log in markdown.

Kan zonder externe API:
1. ja, volledig.

Acceptatiecriteria:
1. geen release zonder gate-status `approved`;
2. gatebeslissingen zijn terugvindbaar in audittrail/documentatie.

### PX-14 - Opschaling, Disseminatie en Uitrolmodel
Doel:
1. oplossing overdraagbaar maken naar andere steden en partners.

Scope MVP:
1. onboarding kit (draaiboek, datacontract, minimaal veldenset);
2. uitrolscenario's (centrale webapp, raamcontract, API-partner);
3. adoptie-KPI's per bestuur/partner.

User stories:
1. Als andere stad wil ik snel starten zonder maatwerkproject.
2. Als programmaleider wil ik lock-in vermijden en marktneutraliteit bewaken.

Implementatiestappen:
1. documenteer deployment varianten met voor- en nadelen;
2. maak standaard "partner intake form" voor minimumvelden;
3. publiceer implementatiechecklist voor lokale besturen.

Kan zonder externe API:
1. ja, grotendeels documentair en organisatorisch.

Acceptatiecriteria:
1. externe partij kan op basis van kit een proof-of-concept opzetten;
2. juridische randvoorwaarden zijn expliciet beschreven.

## 6. Backlogvoorstel per fase

### Fase A - Nu bouwen zonder externe API (hoog rendement)
1. `PX-01` (kernvelden + evidentieregels, mock media)
2. `PX-02` (rule engine vergunning/signalering v1)
3. `PX-03` (checklist + kwaliteitsscore)
4. `PX-08` (KPI trendpanel)
5. `PX-10` (rule-based prioritering)
6. `PX-11` (contract center)
7. `PX-13` (QA gates)

### Fase B - API-ready voorbereiden (parallel)
1. `PX-04` met mock/api gateways en contracttests.
2. `PX-05` partnerportaal skeleton met rolafbakening.
3. `PX-06` communicatie templates + QR.

### Fase C - Externe integraties en governance
1. echte GIPOD/A-SIGN/KLM adapters;
2. SSO/RBAC productie-uitrol;
3. retributieflow met financieel systeem;
4. formeel disseminatiepakket.

## 7. Minimale datavraag aan partners (cruciaal)
Voor snelle doorbraak minimaal nodig:
1. `externalWorkId`
2. `gipodReference`
3. `status`
4. `statusTimestamp`
5. `permitReference`
6. `contractorId`
7. `restoreDueDate`
8. `photoEvidence[]` (url/hash/timestamp/location)
9. `updateSource`
10. `lastUpdateAt`

## 8. Definition of Ready voor nieuwe platformvoorstellen
Een voorstel komt pas in sprintplanning als dit ingevuld is:
1. probleem en persona zijn expliciet;
2. KPI-impact is benoemd;
3. data-input en eigenaar zijn gekend;
4. "kan zonder externe API?" is beantwoord;
5. acceptatiecriteria zijn testbaar geformuleerd.

## 9. Definition of Done voor platformuitbreidingen
1. stories voldoen aan acceptatiecriteria;
2. typecheck/tests slagen;
3. handleiding en operationele uitleg zijn bijgewerkt;
4. contracten en datavelden zijn gedocumenteerd;
5. QA-gate status is `approved`.

## 10. Gebruik in de app
Deze catalogus voedt de sectie `DN Instellingen > Platformuitbreiding`.

Nieuwe knop `Nieuw platformuitbreidingsvoorstel` moet per voorstel minimaal opslaan:
1. titel;
2. gekoppelde persona;
3. probleemstelling;
4. voorgestelde waarde;
5. benodigde data;
6. verwachte KPI-impact;
7. inschatting: `nu bouwbaar` of `API-afhankelijk`.



