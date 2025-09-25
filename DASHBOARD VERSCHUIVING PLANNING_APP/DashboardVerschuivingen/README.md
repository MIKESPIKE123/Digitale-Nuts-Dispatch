Overzicht
========

Deze eenvoudige .NET console-toepassing helpt je de basis te leren én snel te zien welke wijzigingen er op een dag zijn uitgevoerd in je planning-bestanden (Excel, *.xlsx) en om de laatste twee versies met datum-prefix te vergelijken.

Belangrijkste functies
----------------------
- Bestanden gewijzigd vandaag (op basis van bestandsdatum: aangemaakt/aangepast).
- Vergelijk de laatste twee planning-bestanden met datum-prefix (yyyyMMdd_...).
- Excel-inleesfunctie zonder externe packages (ZIP + XML), eerste werkblad.
- Optionele sleutelkolom om rij-gewijze wijzigingen te detecteren.

Vereisten
---------
- .NET SDK 8.0 of hoger om te bouwen/uit te voeren.

Snelstart
---------
1) Open een terminal in de map `DashboardVerschuivingen`.
2) Build en run:
   - `dotnet build`
   - `dotnet run -- --data ".." --today --diff --key-col 1`

Opties
------
- `--data <pad>`: Map met planning-bestanden (*.xlsx).
- `--today`: Toon bestanden die vandaag zijn gewijzigd (filesystem).
- `--diff`: Vergelijk de twee laatste bestanden met datum-prefix.
- `--key-col N`: 1-based kolomindex die als sleutel dient voor wijzigingen.

Bestandsnaam-conventie
----------------------
- Voor de `--diff`-functie zoekt de tool naar bestanden met prefix `yyyyMMdd_`, bijv. `20250618_O&U planning.xlsx`.

Beperkingen
-----------
- Alleen het eerste werkblad wordt gelezen.
- Geen externe Excel-bibliotheken; rijke Excel-functies (formules/format) worden niet geïnterpreteerd.
- Zonder sleutelkolom worden rijen vergeleken op volledige rij-inhoud (multiset).

