# Contributing

Deze repository is collaboration-ready voor kleine teambijdragen, maar blijft operationeel gevoelig. Werk daarom in kleine, controleerbare stappen.

## Voor je start

- Bevestig de scope van je wijziging in een issue, notitie of korte beschrijving.
- Gebruik een aparte branch voor functionele of risicovolle wijzigingen.
- Neem geen impliciete licentiekeuze op: `LICENSE` blijft leeg tot expliciete bevestiging.

## Minimale workflow

1. Werk vanaf een actuele `main`.
2. Houd wijzigingen klein en logisch gegroepeerd.
3. Werk documentatie mee bij wanneer gedrag, architectuur of proces wijzigt.
4. Voer voor afronding minstens deze checks uit:
   - `npm run typecheck`
   - `npm run test`

## Data en artefacten

- Commit geen lokale browserprofielen, Codex-profielen, logs, snelkoppelingen of editorinstellingen.
- Commit gegenereerde data in `src/data/` en `public/data/` alleen wanneer de onderliggende brondata bewust ververst is.
- Vermijd losse exports in `DATA/` tenzij ze expliciet deel uitmaken van de werkwijze of validatie.

## Verwachting bij een bijdrage

- Beschrijf kort waarom de wijziging nodig is.
- Vermeld of data opnieuw gegenereerd werd.
- Benoem eventuele impact op dispatch, vaststelling, integraties of rapportering.
- Verwijs naar relevante documentatie of ADR's wanneer de wijziging een structurele keuze vastlegt.
