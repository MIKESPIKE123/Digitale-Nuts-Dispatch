# DN Vaststelling - Sync Endpoint Contract v1

Datum: 2026-02-18  
Status: Fase 2 geimplementeerd in Vite backend middleware (dev/preview)

## 1. Endpoint
`POST /api/inspecties/sync`

Doel:
1. 1 mutatie uit de DN outbox verwerken;
2. idempotent verwerken op basis van `idempotencyKey`.

## 2. Request headers
1. `Content-Type: application/json`
2. `X-Idempotency-Key: <idempotencyKey>`

## 3. Request body (v1)
```json
{
  "itemId": "sync-item-uuid",
  "itemType": "inspection_saved",
  "inspectionId": "record-uuid",
  "idempotencyKey": "dn-sync-record-uuid-2026-02-18T09_00_00.000Z-inspection_saved",
  "mutationVersion": "2026-02-18T09:00:00.000Z",
  "createdAt": "2026-02-18T09:00:00.000Z",
  "payload": {
    "inspectionId": "record-uuid",
    "updatedAt": "2026-02-18T09:00:00.000Z",
    "completionState": "queued",
    "mutationVersion": "2026-02-18T09:00:00.000Z",
    "idempotencyKey": "dn-sync-record-uuid-2026-02-18T09_00_00.000Z-inspection_saved",
    "photoEvidenceCount": 2,
    "record": {}
  },
  "deviceId": "device-abc",
  "attempts": 1
}
```

## 4. Response body (ack)
```json
{
  "outcome": "accepted",
  "inspectionId": "record-uuid",
  "idempotencyKey": "dn-sync-record-uuid-2026-02-18T09_00_00.000Z-inspection_saved",
  "syncEventId": "sync-event-uuid",
  "processedAt": "2026-02-18T09:00:01.250Z",
  "serverVersion": "dn-api-v1",
  "mappedStatus": "in_progress",
  "statusMappingSource": "formData.status=in_behandeling"
}
```

## 5. Statuscodes en betekenis
1. `200/201`: mutatie nieuw verwerkt (`outcome=accepted`).
2. `208`: mutatie al eerder verwerkt (`outcome=duplicate`).
3. `4xx`: payload of business validatie fout (`outcome=rejected`).
4. `5xx`: serverfout of tijdelijke unavailable.

## 6. Idempotencyregels
1. `idempotencyKey` moet uniek zijn per `inspectionId + mutationVersion + itemType`.
2. Bij herhaalde POST met dezelfde key mag server geen dubbele mutatie opslaan.
3. Server geeft bij duplicaat `208` + zelfde `inspectionId` + dezelfde `idempotencyKey`.

Persistente opslag in DN backend-middleware:
1. `DATA/dn_sync_idempotency_store_v1.json`
2. `DATA/dn_sync_events_v1.json`

## 7. Server-side minimumvalidaties
1. `inspectionId`, `itemType`, `idempotencyKey`, `mutationVersion`, `payload` verplicht.
2. Header `X-Idempotency-Key` moet gelijk zijn aan body `idempotencyKey`.
3. `payload.inspectionId` moet gelijk zijn aan body `inspectionId`.

## 8. Finale statusmapping (backend)
Canonical statussen:
1. `planned`
2. `in_progress`
3. `temporary_restore`
4. `closed`

Mappingregels:
1. `formData.status=afgesloten` -> `closed`
2. `formData.fase=definitief_herstel` -> `closed`
3. `record.completionState=synced` -> `closed`
4. `formData.fase=tijdelijk_herstel` -> `temporary_restore`
5. `formData.status=in_behandeling|open|geparkeerd` -> `in_progress`
6. `record.completionState=queued|valid` -> `in_progress`
7. fallback -> `planned`
## 9. Clientverwachting in DN app
1. `ok=true` bij `200/201/208`.
2. Queue item krijgt `serverOutcome` (`accepted` of `duplicate`).
3. Bij fout bewaart queue item `lastError`, `responseCode`, `serverOutcome=rejected`.
4. Queue item krijgt `serverMappedStatus` voor controle op backendstatus.
