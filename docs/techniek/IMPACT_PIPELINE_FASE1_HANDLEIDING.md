# Impact Pipeline Fase 1

## Doel
Deze fase verrijkt DN_DISPATCH met externe open data per postcode voor latere impactprioritering in de decision engine.

## Script
- Pad: `scripts/import-impact-data.mjs`
- NPM command: `npm run import:impact`

## Bronnen (Open API)
- Antwerpen Open Data: `https://www.antwerpen.be/info/open-data-stad-antwerpen`
- Antwerpen Open Geoportaal: `https://www.antwerpen.be/info/open-geoportaal`
- ArcGIS search API: `https://portaal-stadantwerpen.opendata.arcgis.com/api/search/v1`
- Gebruikte lagen:
  - Bevolkingsdichtheid wijk: `.../portal_publiek9/MapServer/867`
  - Tekortzone gebruiksgroen buurt: `.../portal_publiek12/MapServer/89`
  - Tekortzone dienstencentrum wijk: `.../portal_publiek12/MapServer/94`
  - Flaneerzone: `.../portal_publiek8/MapServer/845`
  - Parkeertariefzone: `.../portal_publiek3/MapServer/212`

## Input en output
- Input:
  - `src/data/works.generated.json` (moet eerst bestaan via `npm run import:data`)
- Output:
  - `src/data/impact.generated.json`
  - `public/data/impact.generated.json`

## Werking
1. Script leest alle gebruikte postcodes uit de works-data.
2. Voor elke postcode gebruikt het centroid-coordinaat (Antwerpen) als querypunt.
3. Per centroid worden open-data lagen bevraagd via ArcGIS `query`.
4. Script schrijft een compact profiel per postcode:
   - `populationDensity`
   - `vulnerableShare` (proxy via dienstencentrum-tekortzone)
   - `servicePressure` (proxy via gebruiksgroen-tekortzone)
   - `mobilitySensitivity` (flaneerzone + parkeertariefkleur)
5. Resultaat bevat ook metadata (`generatedAt`, bronlagen, samenvatting).

## Integratie in buildflow
- `package.json` bevat nu:
  - `import:impact`
  - `dev`: draait `import:data` + `import:impact` voor start
  - `build`: draait `import:data` + `import:impact` voor TypeScript/Vite build

## Datakwaliteit en beperkingen
- Waarden komen van centroid per postcode, niet van volledige polygon-overlap.
- Indicatoren `vulnerableShare` en `servicePressure` zijn in deze fase binaire proxies (`0` of `1`).
- Negatieve dichtheidswaarden uit bron worden als `null` behandeld.
- Bij queryfout wordt fallbackprofiel geschreven (zonder harde build-stop zolang script zelf kan afronden).

## Opleidingsadvies
- Gebruik deze fase om teamleden het verschil te leren tussen:
  - bronindicator
  - proxy-indicator
  - beslissingsscore
- Verplicht bij elke uitbreidingsstap: wijziglog + voorbeeldcases met oude/nieuwe prioriteit.
