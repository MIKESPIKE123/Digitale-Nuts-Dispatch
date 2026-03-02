# DN GIPOD Notificatie-Inbox - Stories (DN-GIPOD-NOTIF-001..005)

Datum: 2026-02-28  
Status: Backlog v1  
Doel: concreet uitvoerbare stories voor de notificatie-inbox.

## DN-GIPOD-NOTIF-001 - Notifications gateway contract en factory

Doel:
1. contract-first integratiebasis voorzien voor notificaties.

Scope:
1. `NotificationsGateway` contract;
2. api/mock gateway scaffolds;
3. factory + flag wiring.

Acceptatiecriteria:
1. contracts en gateways compileren zonder runtime regressie;
2. factory kan `getNotificationsGateway()` leveren;
3. mock/api mode is schakelbaar via feature flag.

## DN-GIPOD-NOTIF-002 - Taxonomie synchronisatie en mapping

Doel:
1. labels voor type/categorie/status stabiel tonen in DN.

Scope:
1. methodes voor types/categorieën/statussen;
2. basis-mappinglaag naar DN UI labels.

Acceptatiecriteria:
1. taxonomiepayloads worden geparsed naar `NotificationTaxonomyEntry[]`;
2. UI kan op id én label filteren;
3. fallbacklabel bestaat voor onbekende ids.

## DN-GIPOD-NOTIF-003 - Governance Inbox MVP

Doel:
1. centrale inbox voor operationele opvolging in governance.

Scope:
1. lijstweergave met filters;
2. detailpaneel;
3. statusactieknop.

Acceptatiecriteria:
1. "Nieuw/Task/Warning" notificaties zijn zichtbaar in governance;
2. detail toont kerncontext (gipodId, type, categorie, createdOn);
3. statusupdatefeedback zichtbaar in UI.

## DN-GIPOD-NOTIF-004 - Dispatch actieblok "Actie vereist"

Doel:
1. dispatchers sneller laten reageren op urgente notificaties.

Scope:
1. compact blok in dispatchview;
2. top-N taak/warning notificaties;
3. deeplink naar context/dossier.

Acceptatiecriteria:
1. dispatch toont alleen actiegerichte notificaties;
2. klik opent relevante context;
3. blok degradeert netjes bij API-fout.

## DN-GIPOD-NOTIF-005 - Hardening (polling, rate limit, observability)

Doel:
1. productie-robuust gedrag garanderen.

Scope:
1. poll-interval + handmatige refresh;
2. backoff op 429;
3. basis telemetry en runbook.

Acceptatiecriteria:
1. geen agressieve retry-loop bij 429;
2. fouttypes (401/403/429/5xx) zijn onderscheiden in feedback;
3. supportdocument bevat diagnose- en herstelstappen.

## DN-GIPOD-OPS-001 - Real-tenant beta validatie uitvoeren

Doel:
1. bevestigen dat notificatieflow stabiel werkt op echte beta-tenant.

Scope:
1. smoke run met echte token/scope;
2. evidence-export (`GIPOD_SMOKE_REPORT_PATH`);
3. validatiematrix en go/no-go voorbereiding.

Acceptatiecriteria:
1. bewijsrapport opgeslagen in `docs/uitvoering/evidence/`;
2. validatiescenario's `VT-01..VT-05` beoordeeld;
3. blockerlijst per severity beschikbaar.

## DN-GIPOD-OPS-002 - 7-dagen operationele acceptatie

Doel:
1. operationele betrouwbaarheid aantonen in reële dispatchwerking.

Scope:
1. dagelijkse metingen op notificatieopvolging;
2. issueboard met severity en owner;
3. KPI-evaluatie op dag 7.

Acceptatiecriteria:
1. acceptatielog ingevuld voor volledige testweek;
2. KPI's geëvalueerd met GO/NO-GO voorstel;
3. open issues hebben owner en herstelversie.

## DN-GIPOD-OPS-003 - Release gate v1.7 uitvoeren

Doel:
1. formele releasepoort met kwaliteit, security en operationele checks.

Scope:
1. gate-checklist invullen;
2. cutover/rollback bevestigen;
3. eindbeslissing documenteren.

Acceptatiecriteria:
1. gate matrix volledig ingevuld;
2. formele beslissing `GO` of `NO-GO` vastgelegd;
3. release-notes en runbookreferentie opgenomen.
