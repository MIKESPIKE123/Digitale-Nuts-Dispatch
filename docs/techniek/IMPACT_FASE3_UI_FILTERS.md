# Impact Fase 3 - UI badges en filter

## Doel
Fase 3 maakt impact praktisch bruikbaar voor dispatchers in de UI:
- impactbadge op action cards
- impactfilter in linker filterpaneel
- impactcontext zichtbaar op kaartpopup

## Wat is toegevoegd
- `App.tsx`
  - state `selectedImpactLevels`
  - berekening `impactByVisitId`
  - filterlogica `filteredVisitsByInspector`
  - impactfilterchips `LAAG`, `MIDDEL`, `HOOG`
- `InspectorBoard.tsx`
  - extra prop `impactByVisitId`
  - badge per card: `Impact LAAG/MIDDEL/HOOG (score)`
- `MapPanel.tsx`
  - impactniveau als contexttag in de popup

## Gebruikersimpact
- Team kan bij hoge werkdruk eerst op `HOOG` filteren.
- Kaart en action cards blijven synchroon in resultaat.
- Uitlegbaarheid stijgt: elke kaart toont impactniveau zichtbaar in de werkflow.

## Opleidingspunt
- Leg operationele teams uit dat impactfilter aanvullend is op wettelijke/planningsverplichtingen.
- Richtlijn: eerst verplichte bezoeken valideren, daarna impactfilter gebruiken voor volgorde-optimalisatie.
