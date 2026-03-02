# DN GIPOD Notificatie-Inbox - Technisch Ontwerp

Datum: 2026-02-28  
Status: Ontwerp v1 (implementatie scaffolding gestart)  
Doel: technisch ontwerp voor een operationele notificatie-inbox in DN Governance/Dispatch.

## 1. Scope

In scope:
1. ophalen van GIPOD-notificaties;
2. taxonomie-ophaling (types, categorieën, statussen);
3. statusupdate van notificatie;
4. UI-consumptie in Governance en Dispatch.

Niet in scope (v1):
1. realtime push/webhooks;
2. automatische bulk-acties;
3. productie-SSO/IAM implementatie (wel contractvoorbereid).

## 2. GIPOD API-capabilities

Primaire endpoints:
1. `GET /api/v1/notifications`
2. `GET /api/v1/notifications/{notificationid}`
3. `PUT /api/v1/notifications/{notificationid}`
4. `GET /api/v1/taxonomies/notificationtypes`
5. `GET /api/v1/taxonomies/notification-categories`
6. `GET /api/v1/taxonomies/statuses`

Vereiste scope:
1. `gipod_notifications`

## 3. Integratiearchitectuur in DN

Patroon:
1. contract-first interfaces in `src/modules/integrations/contracts.ts`;
2. dual gateway (`Api...Gateway` + `Mock...Gateway`);
3. factory-resolutie via `src/modules/integrations/factory.ts`;
4. feature-flag voor mock/API wissel.

Toegevoegde componenten:
1. `NotificationsGateway` contract;
2. `ApiNotificationsGateway` (skeleton);
3. `MockNotificationsGateway` (deterministisch testbaar gedrag).

## 4. Datamodel (DN intern)

Kernobjecten:
1. `NotificationTaxonomyEntry`
2. `NotificationRecord`
3. `NotificationSearchQuery`
4. `NotificationSearchResult`
5. `NotificationStatusUpdateCommand`
6. `NotificationStatusUpdateResult`

Belangrijkste velden in `NotificationRecord`:
1. `notificationId`
2. `statusId`, `statusLabel`
3. `notificationTypeId`, `notificationTypeLabel`
4. `notificationCategoryId`, `notificationCategoryLabel`
5. `createdOn`, `expiresOn`
6. `gipodId`, `resourceUrl`
7. `isActionRequired`
8. `data` (key/value context)

## 5. Runtimeflow

### 5.1 Readflow

1. UI vraagt taxonomieën op bij load;
2. UI vraagt notificaties op met filters en paging;
3. UI toont relevante subset (`Task`, `Warning`, `Nieuw`).

### 5.2 Updateflow

1. gebruiker kiest statusactie (bv. `Afgehandeld`);
2. gateway roept update-endpoint aan;
3. UI herlaadt detail/zoekresultaten na succesvolle update.

## 6. Error handling

1. `401/403`: toon autorisatieprobleem met actiehint;
2. `404`: notificatie niet meer beschikbaar;
3. `429`: backoff en duidelijke rate-limit melding;
4. `5xx`: retrybare serverfout.

## 7. Kwaliteit en tests

Contracttests:
1. `ApiNotificationsGateway.contract.test.ts` voor contractshape;
2. `MockNotificationsGateway.test.ts` voor deterministisch gedrag.

Build checks:
1. `npm run typecheck`
2. volledige `npm run quality` bij feature-integratie in UI.

## 8. Implementatievolgorde

1. Contracts + gateways + tests (nu gestart);
2. UI inbox kaart in Governance;
3. dispatch "actie vereist"-blok;
4. persistente polling + backoff;
5. operationele metrics en runbook.

## 9. Security en governance

1. token en scope centraal beheren;
2. geen persoonlijke accounttokens in code;
3. acties op notificaties opnemen in auditspoor;
4. scopebeperking volgens least privilege.
