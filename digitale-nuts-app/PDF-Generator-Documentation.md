# PDF/CSV Export Documentatie

## Versiebeheer
- Appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## Doel
Beschrijving van exportgedrag voor rapportage en opvolging.

## Exportmodules
- Uitgebreide PDF: `src/InspectionReportGenerator.ts`
- Eenvoudige PDF: `src/SimplePDFGenerator.ts`
- CSV export: `src/CSVExporter.ts`
- Exportaanroep: `src/screens/Inspection.tsx`

## Metadata in export
Wordt meegegeven vanuit inspectiemeta:
- datum en tijd
- inspecteur
- locatie
- GPS coordinaten
- GIPOD link (indien valide)

## Inhoudelijke regels
- NOK-items blijven duidelijk zichtbaar in export.
- Verantwoordelijke partij per NOK blijft opgenomen.
- Foto-aantallen per veld worden meegenomen.
- Lege velden worden veilig als niet-ingevuld behandeld.

## PDF (uitgebreid)
- Header met metadata.
- NOK actiepunten met prioriteit.
- Volledige tabel met status en verantwoordelijke.
- Samenvattingsblok op einde.

## PDF (eenvoudig)
- Browser-print fallback.
- Compacte sectieweergave.
- Metadata inclusief GPS/GIPOD waar beschikbaar.

## CSV
- Volledig CSV met metadata + veldregels.
- Eenvoudige CSV-overview voor snelle analyse.

## Kwaliteitscheck bij wijziging
1. Exporteer minstens 1 dossier met NOK.
2. Exporteer minstens 1 dossier met gekoppelde foto's.
3. Valideer dat GPS/GIPOD metadata correct verschijnt.
4. Controleer dat bestanden openen in standaard tooling (PDF viewer / Excel).
