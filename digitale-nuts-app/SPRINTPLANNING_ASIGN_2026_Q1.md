# Sprintplanning A-Sign Integratie - 2026 Q1

## Versiebeheer
- Appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 9 februari 2026

## Doel
Gefaseerde uitvoering van de backlog uit `BACKLOG_ASIGN_TERRAINVERBETERING.md` met focus op snelle terreinwaarde en beheersbaar implementatierisico.

## Planningsoverzicht

| Sprint | Periode | Focus | Backlog items |
|---|---|---|---|
| Sprint 1 | 9 feb 2026 - 20 feb 2026 | Fasecontext + voorwaardencontrole | P1, P2 |
| Sprint 2 | 23 feb 2026 - 6 mrt 2026 | Kaartintekeningen + bijlagenversies | P3, P4 |
| Sprint 3 | 9 mrt 2026 - 20 mrt 2026 | Contacten + terreincontext | P5, P6 |
| Sprint 4 | 23 mrt 2026 - 3 apr 2026 | Dossierlint + datakwaliteit + hardening | P7, P8 |

## Sprint 1 - Fase En Voorwaarden

### Scope
- P1 Fase-gestuurde werfmodus
- P2 Voorwaarden-engine met controlelijst

### Deliverables
- Nieuw `permitContext` model met actieve fase-selectie.
- Inspectiescherm toont expliciete fasekeuze en faseperiode.
- Voorwaardenlijst per fase met status `OK/NOK/NVT`.
- NOK op voorwaarderegel blokkeert export zonder verantwoordelijke.

### Acceptatiecriteria (go/no-go)
- Actieve fase wordt automatisch voorgeselecteerd.
- Rapport/PDF/CSV bevatten fase-id en fasenaam.
- Voorwaardecode en status komen mee in export.
- Build groen: `npm run build`.

### Risico's
- Mappingkwaliteit van externe voorwaardecodes.
- Edge cases bij overlappende fases.

## Sprint 2 - Kaart En Bijlagen

### Scope
- P3 Kaartlagen van intekeningen
- P4 Bijlagen- en versiecontrole

### Deliverables
- Kaartlaagweergave voor werfzone/parkeerverbod/omleiding.
- Waarschuwing bij GPS buiten vergunde zone.
- Bijlagenlijst per fase met markering `laatste` vs `oud`.
- Export met referentie naar gebruikte planversie.

### Acceptatiecriteria (go/no-go)
- Minstens 3 zone-types zichtbaar op kaart.
- Buiten-zone melding werkt op testdossier.
- Laatste planversie visueel onderscheidbaar.
- Build groen: `npm run build`.

### Risico's
- Beschikbaarheid/consistentie van geometrie-data.
- Performance op mobiel bij grotere polygonen.

## Sprint 3 - Contact En Nota Context

### Scope
- P5 Contact- en escalatiekaart
- P6 Nota- en berichtcontext op terrein

### Deliverables
- Contactkaart met bel/mail-acties voor kernrollen.
- Tijdlijn met laatste notities en berichten.
- Toevoegen terreinnota met timestamp en auteur.
- Log van contactacties in inspectiemeta.

### Acceptatiecriteria (go/no-go)
- `tel:` en `mailto:` acties werken op mobiel.
- Minstens 10 laatste notities zichtbaar.
- Notities exporteren mee in uitgebreide rapportage.
- Build groen: `npm run build`.

### Risico's
- Toegangsrechten op interne notities.
- Privacyregels rond contactdata in exports.

## Sprint 4 - Dossierlint En Kwaliteit

### Scope
- P7 Dossierkern en statuslint
- P8 Conflicten en datakwaliteitswaarschuwingen

### Deliverables
- Headerlint met GW/BONU/GIPOD/status/periode/cluster/district.
- Statushistoriek met timestamps.
- Validatiewaarschuwingen voor ontbrekende kernvelden.
- Waarschuwingen voor planning-inconsistentie.

### Acceptatiecriteria (go/no-go)
- Dossierkern zichtbaar op inspectie-overzicht.
- Datakwaliteitsfouten zichtbaar in UI en export-meta.
- Geen regressie op NOK flow, GPS flow, fotoflow.
- Build groen: `npm run build`.

### Risico's
- Foutpositieven in warning-engine.
- Complexiteit in validatieregels.

## Teamritme Per Sprint
- Maandag: sprintstart + scope lock.
- Woensdag: middenreview met functioneel beheer.
- Vrijdag: demo + acceptatielijst + releasebeslissing.

## Definition Of Ready (per story)
- Duidelijke brondata en veldmapping beschikbaar.
- UI-flow akkoord door terreinverantwoordelijke.
- Acceptatiecriteria expliciet en testbaar.

## Definition Of Done (per sprint)
- Alle stories op `Done` of expliciet herpland.
- `npm run build` geslaagd.
- Documentatie geactualiseerd:
  - `CHANGELOG.md`
  - `BUSINESS_RULES_DOCUMENTATION.md`
  - `IMPLEMENTATIE_RAPPORT_DIGITALE_NUTS_2026_02.md`

