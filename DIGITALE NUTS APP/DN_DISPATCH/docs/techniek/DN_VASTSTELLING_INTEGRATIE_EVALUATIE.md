# DN Vaststelling - Integratie Evaluatie (voor revisie)

Datum: 2026-02-15  
Scope: evaluatie van integratie van `Versie 2026_02` (vaststellingen-app) in `DN_DISPATCH`, met focus op terreinwerking en toezichter-identiteit.

## 1. Context
- Huidige dispatchplatform: `DN_DISPATCH` (planning, kaart, toewijzing, impact, route, dashboards).
- Bestaande vaststellingen-app: `Versie 2026_02` (inspectieformulier, NOK-validatie, foto-evidence, handover, sync-queue, exports).
- Nieuwe functionele wens:
  - toepassing integreren in het dispatchplatform;
  - hernoemen naar **DN Vaststelling**;
  - terreinmodus uitwerken waarbij meteen duidelijk is *wie* de app gebruikt;
  - lijst en vaststellingen automatisch koppelen aan de actieve toezichter.

## 2. Architectuurscan - bevindingen

### DN_DISPATCH (doelapp)
- Stack: React + TypeScript + Vite + MapLibre.
- Kracht: dispatchlogica, kaartcontext, inspecteurtoewijzing, impactprioritering, routevoorstel.
- Huidige identiteit: geen expliciete gebruikerssessie (wel inspecteurconfig en filters).

### Versie 2026_02 (te integreren)
- Stack: React + TypeScript + Vite + Leaflet/react-leaflet + schema-gedreven inspectieflow.
- Kracht:
  - harde validatie (verplichte velden + NOK-verantwoordelijke);
  - GPS + reverse geocoding + fallback;
  - foto-evidence per veld + exports;
  - handover-beslissing + sync-queue.
- Huidige identiteit:
  - inspecteur wordt gekozen per inspectie in formulier (geen sessiegebaseerde login).

### Conclusie architectuurfit
- Domeinmatig zeer complementair.
- Technisch compatibel, maar met afhankelijkheden/conflictrisico:
  - dubbele mapstack (MapLibre + Leaflet);
  - meerdere storage-keys en eigen datamodel;
  - inspecteur-entiteit bestaat in beide apps, maar niet als gedeelde source-of-truth.

## 3. Integratieopties

### Optie A - Hard merge van alle code in 1 App.tsx
- Plus: snel zichtbaar.
- Min:
  - hoge regressiekans;
  - onderhoud zwaar;
  - moeilijk testbaar;
  - veel UI/CSS-interferentie.
- Advies: niet doen.

### Optie B - Modulair in 1 repo/1 shell (aanbevolen)
- Werking:
  - `DN_DISPATCH` blijft host-shell;
  - `DN Vaststelling` komt als zelfstandige module/view met eigen states en services;
  - gedeelde contracts voor identiteit, inspector, work-context.
- Plus:
  - gecontroleerde integratie;
  - beperkte impact op bestaande dispatchflow;
  - beter te testen en gefaseerd uit te rollen.
- Min:
  - eerste fase vraagt contractdefinitie en mappinglaag.

### Optie C - Twee losse apps met deeplink/data-uitwisseling
- Plus: weinig refactor.
- Min:
  - slechte terrein-UX (contextwissel);
  - risico op dubbele input en inconsistentie;
  - zwakke traceerbaarheid.
- Advies: enkel tijdelijke fallback.

## 4. Aanbevolen integratiestrategie
- Kies **Optie B**: modulaire integratie in `DN_DISPATCH`.
- Nieuwe hoofdmodule in navigatie: **DN Vaststelling**.
- Niet direct alles herschrijven: eerst adapterlaag + identity-context + job-koppeling.

## 5. Benodigde afhankelijkheden en contracts

### 5.1 Gedeelde identiteit (nieuw)
- Introduceer `ActiveInspectorSession` in host-app:
  - `inspectorId`
  - `inspectorName`
  - `initials`
  - `deviceId`
  - `startedAt`
  - optioneel `pinValidated`.
- Persist in dedicated key, bv. `dn_active_inspector_session_v1`.

### 5.2 Gedeelde inspector source-of-truth
- Huidige bron in dispatch: `src/config/inspectors.ts` + overrides.
- Doel: DN Vaststelling leest dezelfde inspectorlijst (id + naam + postcodezones).
- Vermijd duplicaatconfig in module.

### 5.3 Dispatch -> Vaststelling contextcontract
- Bij starten van vaststelling vanuit action card:
  - `workId`
  - `dossierId`
  - `referentieId`
  - `gipodId`
  - `address`/`postcode`/`district`
  - `nutsBedrijf`
  - `plannedVisitDate`
  - `assignedInspectorId`
- Vaststellingrecord moet deze context immutable opslaan.

### 5.4 Vaststelling -> Dispatch terugkoppeling
- Minimaal status terug:
  - `inspectionId`
  - `workId`
  - `completionState` (`draft`, `valid`, `queued`, `synced`)
  - `nokCount`
  - `handoverDecision`.

## 6. Terreinwerking - noodzakelijke evaluatie

### Huidig probleem
- App is sterk management-gericht (veel globale dashboards/filters).
- Op terrein heeft toezichter nood aan:
  - directe eigen werflijst;
  - snelle start van vaststelling;
  - minimale keuzes en contextwissels;
  - duidelijke identiteit/traceability.

### Vereist terreinmodel (MVP)
1. Bij openen app: **Toezichter kiezen/inloggen** (sessie).
2. Daarna standaardview: **Mijn lijst vandaag**.
3. Start vaststelling vanuit die lijst (prefilled context).
4. Inspecteurveld in vaststelling:
   - automatisch ingevuld;
   - standaard readonly (met expliciete overrideflow door beheerder).
5. Alle events (sync/export/handover) dragen actieve toezichter-id.

### Uitbreiding later
- SSO of Entra-login, met mapping naar inspecteurprofiel.
- Device binding/pincode beleid.
- Audit trail per actie.

## 7. Naamgeving en productstructuur
- Hernoem module `Versie 2026_02` functioneel naar **DN Vaststelling**.
- In hostnavigatie:
  - `DN Dispatch` = planning en toewijzing
  - `DN Vaststelling` = terreinregistratie
- Aanbevolen repository-structuur in `DN_DISPATCH/src/modules`:
  - `dispatch/`
  - `vaststelling/`
  - `shared/` (identity, inspector contracts, sync contracts)

## 8. Gefaseerd implementatieplan (na revisie)

### Fase 0 - Contracten en mapping (0.5-1 dag)
- Definieer gedeelde types en storage keys.
- Maak mapping van `WorkRecord` naar vaststelling startpayload.
- Beslis wat immutable is in vaststelling.

### Fase 1 - Identity + terreinmodus (1-1.5 dag)
- Login/selectie actieve toezichter.
- Auto-filter "mijn lijst" als default.
- Sessiebanner met actieve naam + switch-actie.

### Fase 2 - Module onboarding DN Vaststelling (2-3 dagen)
- Breng inspectieschermen modulair over.
- Koppel aan gedeelde inspectorcontext.
- Prefill vanuit geselecteerde werf.

### Fase 3 - Dataflow en status terugkoppeling (1-2 dagen)
- Koppel vaststellingstatus terug op dispatchcards.
- Synccontract harmoniseren.
- Test offline/online transitions.

### Fase 4 - Hardening en opleiding (1 dag)
- E2E regressietests op kernflow.
- Handleiding terreinmodus + quick guide.
- Beslissen over SSO-roadmap.

## 9. Risico's
- CSS en componentconflicten tussen huidige stijlen.
- Dubbele kaartlibs verhogen bundle en complexiteit.
- Migratie van oude localStorage data kan edge cases geven.
- Zonder identity-contract blijft traceability onvolledig.

## 10. Beslisvragen voor revisie
1. Willen we inspecteur-switch toestaan tijdens actieve sessie, of enkel na expliciete "uitloggen"?
2. Mag een toezichter vaststellingen buiten eigen toegewezen lijst starten?
3. Moet inspecteur in vaststelling strikt readonly zijn?
4. Is tijdelijke fallback met lokale sessie voldoende, of moet SSO direct in scope?
5. Houden we Leaflet in DN Vaststelling of migreren we op termijn naar MapLibre voor uniformiteit?

## 11. Aanbeveling
- Start met modulaire integratie (Optie B) en lever eerst **identity + mijn-lijst + prefilled vaststelling** op.
- Dit geeft onmiddellijke terreinwaarde zonder dispatchstabiliteit te breken.
- Na goedkeuring van dit document: uitvoeren in bovenstaande fasering.

## 12. Uitvoeringsstatus
- Fase 0 is opgeleverd.
- Full adoption iteratie (fase 1-3 kern) is opgeleverd in `DN_DISPATCH`:
  - verplichte actieve toezichter-sessie met app-brede sessie-gate;
  - terrainmodus met focus op actieve toezichter;
  - DN Vaststelling module uitgebreid naar schema-gedreven inspectieflow;
  - validatie op verplichte velden en NOK-verantwoordelijke;
  - handoverkeuze en sync-wachtrij met statusflow `draft -> valid -> queued -> synced`.
