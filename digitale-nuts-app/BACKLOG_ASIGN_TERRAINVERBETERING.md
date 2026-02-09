# Backlog A-Sign Naar Terreinapp

## Versiebeheer
- Appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 9 februari 2026

## Doel
Dit backlogdocument vertaalt inzichten uit de A-Sign samenvatting van de signalisatievergunning naar concrete verbeteringen voor de Digitale Nuts terreinapp.

## Prioriteiten (volgorde uitvoering)
1. Fase-gestuurde werfmodus
2. Voorwaarden-engine met controlelijst
3. Kaartlagen van intekeningen
4. Bijlagen- en versiecontrole
5. Contact- en escalatiekaart
6. Nota- en berichtcontext op terrein
7. Dossierkern en statuslint
8. Conflicten en datakwaliteitswaarschuwingen

## User Stories En Acceptatiecriteria

### P1 - Fase-gestuurde werfmodus
**User story**
- Als terreininspecteur wil ik enkel de actieve fase zien, zodat ik geen controles uitvoer op niet-actieve werfzones.

**Acceptatiecriteria**
- De inspectie kiest standaard de fase die vandaag actief is op basis van start/einde.
- Bij meerdere actieve fases moet de gebruiker expliciet een fase selecteren.
- Rapport en export bevatten altijd `fase-id`, `fase-naam` en faseperiode.
- Bij controle buiten faseperiode verschijnt een waarschuwing.

### P2 - Voorwaarden-engine met controlelijst
**User story**
- Als inspecteur wil ik vergunningsvoorwaarden als afvinkbare checklist, zodat naleving objectief en herhaalbaar wordt geregistreerd.

**Acceptatiecriteria**
- Voorwaarden uit categorieen (PS/SV/VV/OV/AV/GL) worden per fase geladen.
- Elke voorwaarde heeft statussen: `OK`, `NOK`, `NVT`.
- Bij `NOK` is verantwoordelijke partij verplicht.
- Minstens 1 foto verplicht bij `NOK` op kritieke voorwaarden.
- Exports tonen per voorwaarde code, status en verantwoordelijke.

### P3 - Kaartlagen van intekeningen
**User story**
- Als inspecteur wil ik werfzones, parkeerverboden en omleidingen op kaart zien, zodat terreincontrole overeenstemt met het vergunde plan.

**Acceptatiecriteria**
- Polygonen/lijnen voor zone-types zijn zichtbaar met legenda.
- Kaart toont overlap tussen GPS-positie en vergunde zone.
- Bij positie buiten zone komt waarschuwing `buiten vergunde zone`.
- Meting (m/m2) is beschikbaar per geselecteerde intekening.

### P4 - Bijlagen- en versiecontrole
**User story**
- Als inspecteur wil ik zien of het nieuwste signalisatieplan gebruikt wordt, zodat ik niet op een verouderde versie controleer.

**Acceptatiecriteria**
- Per fase wordt de laatste versie van signalisatieplan zichtbaar gemarkeerd.
- Oudere versies blijven raadpleegbaar maar met label `oud`.
- Als lokaal geopende bijlage niet de laatste is, verschijnt een waarschuwingsbanner.
- Export vermeldt welke bijlageversie gebruikt is tijdens de inspectie.

### P5 - Contact- en escalatiekaart
**User story**
- Als inspecteur wil ik direct verantwoordelijken bellen/mailen, zodat ik sneller kan bijsturen bij overtredingen.

**Acceptatiecriteria**
- Contactkaart toont dossierbeheerder, GIS, nutsbedrijf verantwoordelijke en telefoon/e-mail.
- Knoppen `bel` en `mail` werken mobiel direct vanuit de app.
- Contactacties worden als log-item toegevoegd in inspectietijdlijn.
- Bij kritieke `NOK` wordt escalatiecontact bovenaan getoond.

### P6 - Nota- en berichtcontext op terrein
**User story**
- Als inspecteur wil ik recente interne nota's en berichten zien, zodat terreinbeslissingen rekening houden met actuele afspraken.

**Acceptatiecriteria**
- Laatste 10 notities/berichten zijn zichtbaar in chronologische volgorde.
- Filter op `intern` en `extern` is mogelijk.
- Nieuwe terreinnota kan toegevoegd worden met timestamp en auteur.
- Notities worden mee geëxporteerd in uitgebreid rapport.

### P7 - Dossierkern en statuslint
**User story**
- Als inspecteur wil ik kerngegevens bovenaan elke inspectie zien, zodat ik onmiddellijk juiste context heb.

**Acceptatiecriteria**
- Bovenbalk toont: GW-referentie, BONU, GIPOD, cluster, district, status, periode.
- Statuslint ondersteunt minimaal: `In behandeling`, `Vergund`, `In effect`, `Afgekeurd`.
- Verandering van status wordt gelogd met tijdstip.

### P8 - Conflicten en datakwaliteitswaarschuwingen
**User story**
- Als inspecteur wil ik automatische signalen bij inconsistenties, zodat fouten vroeg worden gevonden.

**Acceptatiecriteria**
- Warnings voor ontbrekende vertalingen/config keys.
- Warnings bij inconsistentie tussen faseplanning en ingegeven datum/uur.
- Warnings bij ontbrekende verplichte dossieridentificatie (GW/GIPOD/BONU).
- Warnings zijn zichtbaar in UI en opgenomen in export-meta.

## Technische Voorstellen
- Maak een nieuw domeinmodel `permitContext` (dossier, fases, voorwaarden, bijlagen, contacten).
- Voeg service-laag toe voor mapping van externe vergunningdata naar interne checklistvelden.
- Implementeer conditionele validatie per fase en voorwaardecode.
- Voeg kaartlaagcomponent toe bovenop bestaande `GPSMap` met zone-rendering.

## Definition Of Done Per Item
- Functioneel getest in mobiele viewport.
- `npm run build` geslaagd.
- Exports (PDF/CSV) geverifieerd met testdossier.
- Documentatie bijgewerkt in:
  - `BUSINESS_RULES_DOCUMENTATION.md`
  - `CHANGELOG.md`
  - `IMPLEMENTATIE_RAPPORT_DIGITALE_NUTS_2026_02.md`

