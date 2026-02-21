# DN Vaststelling - Analyse BONU rapportstijl en implementatie PDF v1

Datum: 2026-02-18  
Status: Geimplementeerd in app (v1)

## 1. Geanalyseerde bronrapporten
1. `DATA/BONU20250253-1.pdf`
2. `DATA/BONU20251333-2.pdf`
3. `DATA/BONU20251333-4.pdf`

Observatie: de drie bestanden zijn gegenereerd met `wkhtmltopdf` en volgen een consistente BONU-achtige rapportopbouw.

## 2. Gedetecteerde stijlpatronen
1. Header met stadsidentiteit:
- "Stad Antwerpen"
- "Stadsontwikkeling Publieke Ruimte"
- Documentnummer en datum rechts boven.

2. Dossiercontext direct onder de header:
- BONU nummer, adres, postcode/district, referenties, toezichter.

3. Inleidende vaste tekst:
- Formele context rond uitgevoerde nutswerken en remediatie van NOK-items.

4. Kernrapportering als tabel:
- kolomstructuur in de bron is inhoudelijk: `Vaststelling`, `Opmerking`, `Omschrijving`.
- NOK/OK-signalen zijn expliciet zichtbaar in de inhoud.

5. Samenvattingsblok:
- aparte "Samenvatting opmerkingen" met focus op afwijkingen/NOK.

6. Footer:
- "Verslag opgemaakt op ... door ..."
- paginanummering `x / y`.

## 3. Vertaling naar DN Vaststelling PDF v1
Geimplementeerd in:
1. `src/modules/vaststelling/pdfReport.ts`
2. `src/modules/vaststelling/reportModel.ts`
3. `src/modules/vaststelling/VaststellingView.tsx` (exportknop)

Vertaling:
1. Header en contextblok volgen dezelfde volgorde als BONU-stijl.
2. Tabel met:
- `Vaststelling` (sectie + status)
- `Opmerking` (veldlabel)
- `Omschrijving` (waarde, inclusief verantwoordelijke bij NOK)
- `Tijdstip` (record update-tijd)
3. Samenvatting bevat enkel NOK-items.
4. Footer en paginanummering op elke pagina.

## 4. Belangrijke verschillen t.o.v. BONU-bron
1. Geen veldspecifieke timestamps per item:
- huidige data bevat vooral record-niveau timestamps.
- daarom wordt `updatedAt` als tijdstip gebruikt.

2. Geen foto-embed in v1:
- foto-evidenceflow is nog in stap C.
- velden kunnen wel al als tekstwaarde gerapporteerd worden indien aanwezig.

3. Geen weerdata in v1:
- bronrapporten tonen weerinformatie; DN-data bevat dit nu niet structureel.

## 5. Volgende verbetering (v2)
1. Foto's inline opnemen zodra `fotoVoor_url`/`fotoDetail_url`/`fotoNa_url` actief zijn.
2. Itemniveau timestamps toevoegen zodra die in het datamodel zitten.
3. Formele juridische clausule per handover-beslissing toevoegen (BLOCK/REQUEST_FIX/APPROVE).
4. Exportprofielen:
- `Terreinversie` (kort)
- `Juridische versie` (volledig logboek)
- `Managementversie` (KPI-samenvatting).
