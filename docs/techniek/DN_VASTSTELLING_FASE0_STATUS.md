# DN Vaststelling - Fase 0 Status

Datum: 2026-02-15

> Historisch document: fase 0 baseline.  
> Huidige status staat in `docs/techniek/DN_VASTSTELLING_FULL_ADOPTION_STATUS.md`.

## Uitgevoerd
- Nieuwe modulebasis toegevoegd onder `src/modules/vaststelling/`.
- Gedeelde contracten toegevoegd:
  - `ActiveInspectorSession`
  - `DNVaststellingImmutableContext`
  - `DNVaststellingRecord`
- Storage keys en helpers toegevoegd:
  - `dn_active_inspector_session_v1`
  - `dn_vaststelling_records_v1`
- Mappinglaag toegevoegd:
  - `PlannedVisit -> DNVaststellingImmutableContext`
  - draft record creation met immutable fingerprint
- Immutable update helper toegevoegd voor mutable payload updates.
- Nieuwe navigatie/view in host-app:
  - `DN Vaststelling` (zelfde DN_DISPATCH layout/stijl)
  - mijn lijst per actieve toezichter
  - contextselectie vanuit dispatchbezoeken
  - draftstart in lokale opslag

## Bestanden
- `src/modules/vaststelling/contracts.ts`
- `src/modules/vaststelling/storage.ts`
- `src/modules/vaststelling/mappers.ts`
- `src/modules/vaststelling/immutability.ts`
- `src/modules/vaststelling/VaststellingPhase0View.tsx`
- `src/App.tsx`

## Testdekking fase 0
- `src/modules/vaststelling/mappers.test.ts`
- `src/modules/vaststelling/immutability.test.ts`

## Volgende stap (Fase 1)
- Terrain identity-flow verplicht maken bij appstart.
- "Mijn lijst" als default dispatchcontext.
- Inspector readonly doorgeven naar echte vaststellingsflow.



