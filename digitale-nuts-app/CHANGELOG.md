# Changelog - Digitale Nuts App

## Versiebeheer
- Actuele appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## [1.4] - 2026-02-08
### Toegevoegd
- Automatische fotostempel bij upload en camera-capture:
  - stadslogo bovenaan in de stempel
  - GPS-coordinaten en adres in de rechteronderhoek
- Gedeelde stempelpipeline in `src/lib/photos.ts` voor consistente output.

## [1.3] - 2026-02-08
### Toegevoegd
- GPS fallback naar Stadhuis Antwerpen bij mislukte geolocatie.
- Reverse geocoding via Nominatim en automatische adresinvulling.
- Foto-evidence per vaststellingselement met limieten en compressie.
- GIPOD-linkvalidatie en export van GIPOD metadata.

## [1.2] - 2026-02-08
### Toegevoegd
- Operationeel configuratiepaneel met inspecteurs, postcodes, werkpartijen en import/export.
- Syncverbeteringen met queue-status, retries en settings.
- Handover-beslissingsflow met statusbeheer.

## [1.1] - 2026-02-08
### Toegevoegd
- Striktere validatie op verplichte velden en NOK-verantwoordelijke.
- Robuustere PDF/CSV exportopmaak met betere statusinformatie.

## [1.0] - Legacy basis
### Toegevoegd
- Eerste operationele inspectieflow en basisnavigatie.

## Opmerking
Historiek voor oudere releases is geconsolideerd op basis van de huidige codebasis en projectdocumentatie.
