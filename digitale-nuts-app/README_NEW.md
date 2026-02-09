# Operationele Handleiding - Digitale Nuts App

## Versiebeheer
- Appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## Doel
Praktische handleiding voor terreinmedewerkers, planners en functionele beheerders.

## Workflow op terrein
1. Start een nieuwe inspectie.
2. Controleer of inspecteur, locatie en GPS aanwezig zijn.
3. Werk secties af en wijs bij elke `NOK` een verantwoordelijke toe.
4. Voeg foto's toe per relevant vaststellingselement.
5. Exporteer PDF/CSV of queue voor sync.

## Kritieke regels
- `NOK` zonder verantwoordelijke blokkeert export en sync.
- Verplichte velden moeten ingevuld zijn voor afsluiting.
- Bij falende GPS gebruikt de app fallback-coordinaten van het Stadhuis Antwerpen.
- Bij GPS-opvraging wordt automatisch een adreslookup uitgevoerd.

## Configuratie
Via **Configuratie** in de header:
- inspecteurs beheren
- postcodes beheren
- verantwoordelijke partijen beheren
- werkpartijen (aannemer/signalisatie/nutsbedrijf)
- import/export van configuratie (JSON)

## Rapportage
- Uitgebreide PDF: `InspectionReportGenerator`
- Eenvoudige PDF: `SimplePDFGenerator`
- Uitgebreide CSV en overzicht CSV: `CSVExporter`

## Referenties
- `BUSINESS_RULES_DOCUMENTATION.md`
- `TECHNICAL_IMPLEMENTATION_GUIDE.md`
- `VERSIE_BEHEER_INSTRUCTIES.md`
- `CHANGELOG.md`
