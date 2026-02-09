# Sprintplanning A-Sign Integratie - Release v1.5

## Versiebeheer
- Huidige appversie: `v1.4`
- Doelrelease van dit plan: `v1.5`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 9 februari 2026

## Doel
Gefaseerde uitvoering van de backlog uit `BACKLOG_ASIGN_TERRAINVERBETERING.md` met focus op:
- maximale terreinwaarde in Q1 2026;
- beheersbaar implementatierisico;
- releaseklaar resultaat voor `v1.5`.

## Scope v1.5

### In scope
- P1 Fase-gestuurde werfmodus
- P2 Voorwaarden-engine met controlelijst
- P3 Kaartlagen van intekeningen
- P4 Bijlagen- en versiecontrole
- P5 Contact- en escalatiekaart
- P6 Nota- en berichtcontext op terrein
- P7 Dossierkern en statuslint
- P8 Conflicten en datakwaliteitswaarschuwingen

### Out of scope (v1.6+)
- Volledige bidirectionele sync terug naar bronplatform.
- Geautomatiseerde retributieberekening met facturatie.
- Multi-tenant rechtenmodel per externe partner.

## Capaciteit en planning

### Teamcapaciteit (richtwaarde)
- 2 developers + 1 functioneel analist + 1 tester.
- Doelcapaciteit: 34 story points per sprint.
- Reserve: 15% voor incidenten en wijzigingsverzoeken.

### Planningsoverzicht

| Sprint | Periode | Focus | Backlog items | Streefpunten |
|---|---|---|---|---|
| Sprint 1 | 9 feb 2026 - 20 feb 2026 | Fasecontext + voorwaardencontrole | P1, P2 | 34 |
| Sprint 2 | 23 feb 2026 - 6 mrt 2026 | Kaartintekeningen + bijlagenversies | P3, P4 | 34 |
| Sprint 3 | 9 mrt 2026 - 20 mrt 2026 | Contacten + terreincontext | P5, P6 | 34 |
| Sprint 4 | 23 mrt 2026 - 3 apr 2026 | Dossierlint + datakwaliteit + hardening | P7, P8 | 34 |

## Sprint 1 - Fase en Voorwaarden

### Epics
- EPIC-1: Fasegestuurde inspectiecontext.
- EPIC-2: Voorwaardenchecklist met NOK-validatie.

### Stories
- ST-1.1: Actieve fase automatisch selecteren op basis van datum.
- ST-1.2: Handmatige fasewissel met lock op inspectiecontext.
- ST-1.3: Voorwaardenlijst per fase (OK/NOK/NVT).
- ST-1.4: NOK op voorwaarde vereist verantwoordelijke.
- ST-1.5: Export met fase-id, fasenaam en voorwaardecodes.

### Deliverables
- Nieuw `permitContext` model met actieve fase-selectie.
- Inspectiescherm met zichtbare faseheader en periode.
- Voorwaardenlijst per fase met status en validatie.

### Acceptatiecriteria (go/no-go)
- Actieve fase wordt automatisch voorgeselecteerd.
- Export bevat fase-id/fasenaam en voorwaarde-status.
- Geen export mogelijk met NOK zonder verantwoordelijke.
- Build groen: `npm run build`.

## Sprint 2 - Kaart en Bijlagen

### Epics
- EPIC-3: Geografische vergunningcontrole.
- EPIC-4: Document- en versiezekerheid.

### Stories
- ST-2.1: Laagweergave voor werfzone, parkeerverbod, omleiding.
- ST-2.2: Waarschuwing bij GPS buiten vergunde zone.
- ST-2.3: Bijlagenlijst per fase met `laatste`/`oud`.
- ST-2.4: Export met referentie naar gebruikt planbestand.

### Deliverables
- Kaartlaagweergave voor min. 3 zone-types.
- Bijlagepaneel met versie-status.
- Voor terreincontrole zichtbare planversie-indicator.

### Acceptatiecriteria (go/no-go)
- Buiten-zone melding werkt op testdossier.
- Laatste planversie is expliciet visueel gemarkeerd.
- Export bevat planreferentie.
- Build groen: `npm run build`.

## Sprint 3 - Contact en Nota Context

### Epics
- EPIC-5: Operationele contactacties.
- EPIC-6: Contextuele dossiercommunicatie.

### Stories
- ST-3.1: Contactkaart (dossierbeheerder, GIS, nutsbedrijf).
- ST-3.2: `tel:`/`mailto:` acties met logging.
- ST-3.3: Notitie- en berichttijdlijn (laatste 10+).
- ST-3.4: Nieuwe terreinnota met timestamp/auteur.
- ST-3.5: Notities opnemen in uitgebreide export.

### Deliverables
- Contactkaart met directe acties.
- Tijdlijncomponent voor interne/externe context.
- Notitie-invoer en logging.

### Acceptatiecriteria (go/no-go)
- Contactacties werken mobiel.
- Tijdlijn toont minimaal 10 items.
- Notities verschijnen in uitgebreid rapport.
- Build groen: `npm run build`.

## Sprint 4 - Dossierlint en Kwaliteit

### Epics
- EPIC-7: Dossierkern in terreinheader.
- EPIC-8: Data quality en conflictwaarschuwingen.

### Stories
- ST-4.1: Headerlint met GW/BONU/GIPOD/status/periode.
- ST-4.2: Statushistoriek met timestamps.
- ST-4.3: Waarschuwingen voor ontbrekende kernvelden.
- ST-4.4: Waarschuwingen voor planningsinconsistentie.
- ST-4.5: Hardening en regressietests voor eerdere sprintfunctionaliteit.

### Deliverables
- Volledig dossierlint op inspectie-overzicht.
- Warning-engine met UI- en exportmeta-signalen.
- Regressiecheck op NOK/GPS/foto/export.

### Acceptatiecriteria (go/no-go)
- Dossierkern is permanent zichtbaar.
- Datakwaliteitsfouten komen in UI en export-meta.
- Geen regressie op bestaande kritieke flows.
- Build groen: `npm run build`.

## KPI-targets voor v1.5
- Minstens 90% van inspecties bevat fase-id en fasenaam in export.
- Minder dan 5% inspecties met ontbrekende verantwoordelijke bij NOK.
- Gemiddelde tijd tot correcte fase-selectie < 30 seconden.
- Minstens 80% van kritieke waarschuwingen afgehandeld voor export.

## Afhankelijkheden
- Beschikbaarheid van fase- en voorwaardedata uit bronplatform.
- Toegang tot actuele geometrie en bijlageversies.
- Functionele validatie door terreinteam per sprintdemo.

## Risico-register

| Risico | Impact | Kans | Mitigatie |
|---|---|---|---|
| Inconsistente brondata voor fases | Hoog | Middel | Mappinglaag + fallbackregels + validatie |
| Zware kaartlagen op mobiel | Hoog | Middel | Vereenvoudigde geometrie + lazy rendering |
| Verouderde bijlage op terrein | Middel | Hoog | Laatste-versie badge + waarschuwing |
| Foutpositieven in warning-engine | Middel | Middel | Regel-tuning na sprintdemo |
| Privacy bij contact/notities in export | Hoog | Laag | Exportfilters en role-based zichtbaarheid |

## Teamritme per sprint
- Maandag: sprintstart + scope lock.
- Woensdag: middenreview met functioneel beheer.
- Vrijdag: demo + acceptatielijst + releasebeslissing.

## Release-gates v1.5
1. Gate A (na Sprint 1): fase + voorwaarden functioneel stabiel.
2. Gate B (na Sprint 2): kaart en bijlagen gevalideerd op testdossier.
3. Gate C (na Sprint 3): contact en notitiecontext operationeel.
4. Gate D (na Sprint 4): datakwaliteit, regressie en release-ready.

## Definition Of Ready (per story)
- Duidelijke brondata en veldmapping beschikbaar.
- UI-flow akkoord door terreinverantwoordelijke.
- Acceptatiecriteria expliciet en testbaar.

## Definition Of Done (per sprint)
- Alle stories op `Done` of expliciet herpland.
- `npm run build` geslaagd.
- Sprintdemo goedgekeurd door functioneel beheer.
- Documentatie geactualiseerd:
  - `CHANGELOG.md`
  - `BUSINESS_RULES_DOCUMENTATION.md`
  - `IMPLEMENTATIE_RAPPORT_DIGITALE_NUTS_2026_02.md`
