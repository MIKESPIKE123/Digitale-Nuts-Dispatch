# DN Vaststelling - Architectuurvoorstel Dataontsluiting (weg van localStorage-only)

Datum: 2026-02-18  
Status: Voorstel v1 voor review

## Uitvoeringsstatus
1. `Fase 1` is uitgevoerd in code op 2026-02-18:
- repository-abstractie toegevoegd;
- IndexedDB default + localStorage fallback;
- appflow gekoppeld op asynchrone opslag.
2. `Fase 2` is uitgevoerd in code op 2026-02-18:
- sync-contract uitgebreid met `inspectionId`, `idempotencyKey`, `mutationVersion`;
- API-call bevat `X-Idempotency-Key`;
- dual-write gedrag: bij queueen directe sync-poging als online.
3. `Fase 2` backendlaag is op 2026-02-18 volledig aangesloten:
- endpoint `POST /api/inspecties/sync` actief via Vite middleware (dev/preview);
- persistente idempotency store + eventlog in `DATA/*.json`;
- server-ack (`accepted`/`duplicate`/`rejected`) met `mappedStatus`.
4. `Fase 2` contractlaag is op 2026-02-18 verder uitgewerkt:
- endpointcontract vastgelegd in `docs/techniek/API_CONTRACT_SYNC_ENDPOINT_V1.md`;
- gateway leest server-ack (`accepted`/`duplicate`/`rejected`);
- sync-queue bewaart server outcome en event metadata.
5. Volgende stap na Fase 2: migreren van Vite middleware naar dedicated backend service (Node/.NET) zonder contractwijziging.

## 1. Waarom dit nodig is
Vandaag worden vaststellingen lokaal bewaard in browser `localStorage`. Dat was goed voor snelle MVP-opstart, maar beperkt:
1. geen centrale bron van waarheid;
2. toestel/browser-gebonden data;
3. risico op storage-limieten (zeker met foto's);
4. beperkte rapportering over teams heen;
5. moeilijkere audittrail en governance.

## 2. Huidige situatie in code (as-is)
Opslag gebeurt via:
1. `src/modules/vaststelling/storage.ts`
2. key `dn_vaststelling_records_v1` voor records
3. key `dn_vaststelling_sync_queue_v1` voor queue
4. key `dn_vaststelling_sync_settings_v1` voor sync settings

Synchronisatie gebeurt via:
1. `src/modules/vaststelling/sync.ts`
2. queue item met payload `record` + metadata
3. gateway via `src/modules/integrations/factory.ts` -> `InspectionsGateway`

## 3. Doelarchitectuur (to-be)
Ontkoppel opslag, sync en ontsluiting in 4 lagen:

1. **Client opslaglaag (offline-first)**
- primair: IndexedDB (niet localStorage) voor records/queue/media-metadata;
- localStorage enkel voor lichte session-flags.

2. **Sync/transportlaag**
- outbox/inbox patroon met idempotency key;
- retries met backoff;
- conflict policy (last-write + audit event).

3. **Backend bron van waarheid**
- API voor `Inspection`, `Finding`, `MediaEvidence`, `Handover`;
- relationele DB voor kernrecords;
- object storage (blob/S3/Azure) voor foto's;
- audit log tabel (append-only).

4. **Ontsluitingslaag**
- operationele API voor app en partnerportaal;
- rapportering export (CSV/PDF snapshots);
- BI-feed/datamart voor KPI's.

## 4. Richtinggevende principes
1. Contract-first (bestaande gateway-architectuur behouden).
2. Mock-first (nu kunnen blijven werken zonder externe API's).
3. Offline-first (toezichter op terrein verliest nooit data).
4. Evidence-first (foto + context + actor + timestamp altijd traceerbaar).
5. Security-by-design (RBAC, audit, bewaartermijnen).

## 5. Concreet migratiepad (gefaseerd)

### Fase 0 - Stabiliseren huidige situatie (direct)
1. Foto's blijven gecomprimeerd opslaan.
2. Veilige storage writes met foutafhandeling.
3. Handmatige export/backup-optie voorzien.

Resultaat:
- minder white-screen risico;
- minder dataverlies bij grote payload.

### Fase 1 - Repository abstractie in frontend (1 sprint)
1. Introduceer `VaststellingRepository` interface.
2. Voeg implementaties toe:
- `LocalStorageVaststellingRepository` (tijdelijk legacy)
- `IndexedDbVaststellingRepository` (nieuwe default)
3. Laat `VaststellingView` en sync enkel met repository praten.

Resultaat:
- opslaglaag vervangbaar zonder UI-rewrite.

### Fase 2 - Centrale API + dual-write (1-2 sprints)
1. Bouw `ApiVaststellingRepository` of dedicated sync endpoint.
2. Dual-write tijdelijk:
- lokaal (IndexedDB) + server
- sync-status per record zichtbaar
3. Voeg idempotency key toe per mutatie.

Resultaat:
- centrale bron ontstaat zonder big-bang migratie.

### Fase 3 - Media naar object storage (1 sprint)
1. Foto uploaden naar media endpoint.
2. In record alleen metadata + mediaRef bewaren.
3. Lokale base64 na succesvolle upload opruimen.

Resultaat:
- lokale opslag klein;
- PDF/rapportering via stabiele media-URL of signed URL.

### Fase 4 - Ontsluiting voor beleid/partners (1 sprint)
1. Read API's voor dashboard en partnerviews.
2. KPI snapshots en historiek op serverniveau.
3. Export endpoints (CSV/PDF batch).

Resultaat:
- rapportering niet meer toestelgebonden.

## 6. Datamodel (minimum)
Kernentiteiten:
1. `InspectionRecord`
2. `InspectionFieldValue`
3. `MediaEvidence`
4. `SyncEvent`
5. `AuditEvent`

Belangrijke velden:
1. `recordId` (uuid)
2. `workId`, `gipodId`, `bonuNummer`
3. `inspectorId`, `deviceId`
4. `createdAt`, `updatedAt`
5. `completionState`, `syncState`
6. `mediaEvidence[]` met `photoId`, `hash`, `takenAt`, `lat`, `lon`

## 7. Ontsluiting: wie krijgt wat
1. Toezichter: eigen records, offline cache, syncstatus.
2. Dispatcher: teamoverzicht + failed sync + open acties.
3. Projectleider: KPI's, trends, export.
4. Partner (later): scoped read/write op eigen dossiers.

## 8. Wat kan nu al zonder externe API
1. Repository-interface toevoegen in frontend.
2. IndexedDB implementeren en localStorage uitfaseren.
3. Automatische lokale backup-export (JSON/CSV) per dag.
4. Server-contracten voorbereiden (OpenAPI/JSON schema).

## 9. Cruciale beslissingen voor projectteam
1. Keuze backend stack (Node/.NET) en hosting.
2. Keuze object storage + retention policy.
3. Identity model (Entra SSO + rollen).
4. Wettelijk bewaarbeleid voor foto's/evidence.

## 10. Aanbevolen eerstvolgende stap
Start met **Fase 1 (Repository abstractie + IndexedDB)**.

Waarom:
1. laag risico;
2. directe winst in stabiliteit;
3. perfecte brug naar centrale API in volgende fase.

## 11. Definition of Done voor "niet meer localStorage-only"
1. Nieuwe records staan standaard in IndexedDB.
2. localStorage wordt enkel nog gebruikt voor lichte session-data.
3. Sync werkt met repository (niet rechtstreeks op localStorage arrays).
4. Export en herstelpad van records is gedocumenteerd en getest.



