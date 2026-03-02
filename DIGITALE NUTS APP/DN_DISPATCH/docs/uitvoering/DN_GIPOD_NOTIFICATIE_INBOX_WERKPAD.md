# DN GIPOD Notificatie-Inbox - Diepteanalyse en Werkpad

Datum: 2026-02-28  
Status: Analyse + implementatiepad v1  
Doel: een werkbaar en gefaseerd pad opzetten om GIPOD-notificaties operationeel bruikbaar te maken in DN Governance/Dispatch.

## 1. Probleem en doel

### Probleem

Te late opvolging van GIPOD-acties/events leidt tot:
1. gemiste deadlines;
2. hogere operationele rework;
3. minder betrouwbare ketensturing in dispatch.

### Doel

Een `Notificatie-Inbox` in DN die:
1. relevante GIPOD-notificaties tijdig zichtbaar maakt;
2. prioritering ondersteunt (Information/Warning/Task);
3. statusafhandeling terugschrijft naar GIPOD waar toegelaten.

## 2. GIPOD API-basis voor deze use case

API-bouwblokken:
1. `GET /api/v1/notifications` (lijst met filtercriteria).
2. `GET /api/v1/notifications/{notificationid}` (detail).
3. `PUT /api/v1/notifications/{notificationid}` (statusupdate).
4. Taxonomieën:
   - `GET /api/v1/taxonomies/notificationtypes`
   - `GET /api/v1/taxonomies/notification-categories`
   - `GET /api/v1/taxonomies/statuses`

Belangrijke scope:
1. `gipod_notifications` (lezen + status updaten notificaties).

## 3. Fit met huidige DN_DISPATCH architectuur

Huidige sterke basis:
1. contract-first integratielaag in `src/modules/integrations/contracts.ts`;
2. API/mock split met factory in `src/modules/integrations/factory.ts`;
3. governance- en dispatchschermen waar inbox-elementen meteen waarde geven.

Architecturale aansluiting:
1. nieuwe `NotificationsGateway` toevoegen naast Works/Inspections/Permits/Complaints;
2. zelfde patroon voor `Api...Gateway` + `Mock...Gateway`;
3. contracttests zoals bestaande integratiecontracten.

## 4. Functioneel ontwerp MVP

### 4.1 Inbox in DN Governance

Tonen:
1. teller `Nieuw`, `Task`, `Warning`, `Afgehandeld`;
2. lijst met: type, categorie, createdOn, expiresOn, triggering organisatie;
3. snelle acties:
   - `Open dossier` (indien linkbare resource in `data[]`);
   - `Markeer afgehandeld`.

### 4.2 Dispatch-impact

Tonen:
1. compacte "Actie vereist" zone met taak-/warningnotificaties;
2. prioriteitsbadge per relevant dossier/werk.

## 5. Technisch ontwerp MVP

### 5.1 Nieuwe contracts

Toevoegen in `contracts.ts`:
1. `NotificationRecord`
2. `NotificationSearchQuery`
3. `NotificationTaxonomyEntry`
4. `NotificationStatusUpdateCommand`
5. `NotificationsGateway`

Methodes (minimum):
1. `getNotificationTypes()`
2. `getNotificationCategories()`
3. `getNotificationStatuses()`
4. `searchNotifications(query)`
5. `getNotificationDetail(notificationId)`
6. `updateNotificationStatus(command)`

### 5.2 API-gateway

Toevoegen:
1. `src/modules/integrations/api/ApiNotificationsGateway.ts`
2. auth header met bearer token;
3. foutmapping (`401/403/429/5xx`);
4. parsing van `data[]` key/value payload.

### 5.3 Mock-gateway

Toevoegen:
1. `src/modules/integrations/mock/MockNotificationsGateway.ts`
2. scenario's:
   - alleen Information;
   - gemixte Task/Warning;
   - update-status succes/failure.

### 5.4 Factory + feature flags

Toevoegen:
1. factory wiring in `factory.ts`;
2. optionele flag `useMockNotifications` in `flags.ts`.

## 6. Niet-functionele eisen

### 6.1 Polling + stabiliteit

1. poll-interval default 5 minuten;
2. handmatige refreshknop;
3. deltafilter op `createdOn` en/of `statusId`.

### 6.2 Rate-limiting

1. 429 afhandelen met backoff;
2. geen agressieve korte polling;
3. cache taxonomieën lokaal in-memory per sessie.

### 6.3 Eventual consistency

1. statusupdate kan tijdelijk niet direct reflecteren;
2. na `PUT` heropvragen met korte retry/backoff.

### 6.4 Governance/compliance

1. acties in DN audittrail opnemen (wie markeerde wat afgehandeld);
2. rollen en scopes expliciet documenteren in onboarding.

## 7. Gefaseerd implementatiepad

### Fase 0 - Toegang en contractvoorbereiding (1-2 dagen)

1. scope `gipod_notifications` laten activeren op beta;
2. endpoint/scope valideren met smoke test;
3. queryparam-varianten (`typeId` vs `notificationTypeId`) afstemmen met swagger.

### Fase 1 - Integratiekern (2-4 dagen)

1. contracts + api/mock gateway + factory;
2. contracttests op search/detail/update;
3. fout- en retrybeleid coderen.

### Fase 2 - Governance Inbox UI (2-3 dagen)

1. inboxcomponent in DN Governance;
2. statusfilter + categoriechips;
3. statusupdate-actie.

### Fase 3 - Dispatch integratie (1-2 dagen)

1. "Actie vereist" zone in dispatch;
2. link met bestaande werk/dossiercontext.

### Fase 4 - Hardening (1-2 dagen)

1. rate-limit/backoff tuning;
2. observability en supportrunbook.

## 8. Acceptatiecriteria MVP

1. Notificaties kunnen opgehaald en gefilterd worden in DN.
2. `Task` en `Warning` zijn visueel onderscheiden.
3. Status van notificatie kan vanuit DN naar "Afgehandeld" gezet worden.
4. Bij 429/403 toont DN duidelijke foutstatus i.p.v. stille mislukking.
5. Logging/audit toont wie een notificatie heeft behandeld.

## 9. Open vragen aan Athumi/GIPOD

1. Welke queryparamnaam is leidend voor typefilter (`typeId` of `notificationTypeId`)?
2. Bestaat een vaste mapping voor "Afgehandeld" statusId per omgeving?
3. Wat is aanbevolen poll-ritme voor notificaties onder standaard quotum?
4. Zijn er endpointwijzigingen gepland voor notificaties in v2?

## 10. Risico-inschatting en mitigatie

1. Onzekere parameternamen / payloaddetails:
   - mitigatie: swagger-contracttests vóór UI-ontwikkeling.
2. Scope ontbreekt in productie:
   - mitigatie: fase 0 als expliciete go/no-go poort.
3. Te veel ruis in notificaties:
   - mitigatie: type/categorie allowlist voor MVP.

## 11. Support runbook (NOTIF-005)

### 11.1 Polling en refresh

1. Standaard pollinginterval: 60 seconden.
2. Handmatige refresh blijft altijd mogelijk via knop in Governance en Dispatch.
3. Polling draait alleen in de views `DN Governance` en `DN Dispatch`.

### 11.2 429 backoff gedrag

1. Bij `HTTP 429` verhoogt DN automatisch het poll-interval met exponentiële backoff.
2. Maximaal backoff-interval: 15 minuten.
3. Bij succesvolle poll reset backoff naar het basisinterval.

### 11.3 Diagnostiekvelden in UI

1. `Laatste laadmoment`
2. `Laatste poging`
3. `Laatste statuscode`
4. `Huidig poll-interval`
5. `429-streak`

### 11.4 Eerstelijns troubleshooting

1. Controleer of statuscode `429`, `401` of `403` zichtbaar is in de notificatiezone.
2. Bij `429`: wacht op backoff-interval en herprobeer daarna handmatig.
3. Bij `401/403`: verifieer token/scope (`gipod_notifications`) en omgevingsvariabelen.
4. Als notificaties leeg blijven maar geen foutstatus: activeer mock-notificaties om UI-flow te verifiëren.
