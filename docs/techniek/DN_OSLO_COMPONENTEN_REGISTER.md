# DN OSLO Componentenregister

Datum: 2026-02-21  
Status: Werkregister v1 (voorbereidend, nog niet formeel gevalideerd met OSLO-publicaties)  
Doel: alle relevante datacomponenten in DN Dispatch expliciet beschrijven als basis voor latere OSLO-standaardisatie en API-koppelingen.

## 1. Waarom dit register

1. De app gebruikt nu een exportgedreven dataflow (`Export_*.xlsx`).
2. Volgende stap is API-first integratie (GIPOD/GIS/vergunningen) met stabiele semantiek.
3. Hiervoor moeten veldnamen en betekenis 1-op-1 koppelbaar zijn aan OSLO-concepten.

## 2. Componenten in de huidige app (functioneel)

1. `Werkrecord` (DN Dispatch kaart/dossiers/planning).
2. `Inspectiebezoek` (START/EIND/TUSSEN).
3. `Toezichter` (inzet, backup, afwezigheid).
4. `Vaststellingsrecord` (immutabele context + mutabele terreinpayload).
5. `Vergunningstatus` (afgeleid uit weekrapport + GIPOD context).
6. `Impactprofiel` (maatschappelijke prioritering).

## 3. Mappingmatrix (huidig -> OSLO kandidaat)

| Huidig veld in app | Betekenis | OSLO kandidaatcomponent (te verifiëren) | Status |
|---|---|---|---|
| `work.id` | interne technische sleutel | lokale implementatiesleutel | intern |
| `dossierId` | zichtbaar dossierlabel | dossier/aanvraag-identificatie | te valideren |
| `gipodId` | unieke inname in GIPOD | GIPOD inname-identificator | te valideren |
| `referentieId` | referentie voor opvolging/vergunning | aanvraag- of referentie-id | te valideren |
| `status` (`VERGUND`/`IN EFFECT`) | dispatch-fase in app | werkfase/status | te valideren |
| `sourceStatus` | bronstatus uit GIPOD-export | bronstatus inname | te valideren |
| `startDate`, `endDate` | uitvoeringsperiode | periode start/einde | te valideren |
| `straat`, `huisnr`, `postcode`, `district` | locatiebeschrijving | adres/locatiecomponenten | te valideren |
| `location.lat/lng` | kaartcoördinaat | geometrie/positie | te valideren |
| `locationSource` | exact vs afgeleid | kwaliteit/herkomst locatie | intern + te valideren |
| `nutsBedrijf` | beheerder/piloot van werken | organisator/uitvoerder/aanvrager | te valideren |
| `gipodCategorie` | categorie 1/2/3/dringend | werkcategorie/hinderklasse | te valideren |
| `permitStatus` | vergunning afgeleverd/in voorbereiding/... | vergunningstatus | te valideren |
| `permitReferenceId` | link tussen werk en vergunning | vergunningreferentie | te valideren |
| `visitType` | START/EIND/TUSSEN | inspectietype of controlemoment | te valideren |
| `immutableContext.*` | vastgelegde context bij vaststelling | auditbare momentopname | intern + te valideren |
| `mutablePayload.*` | terreininvulling en handover | observatie/resultaat/maatregel | te valideren |

## 4. API-transitie (export -> API)

### 4.1 Principes

1. Exports blijven tijdelijk ingestroomde bron.
2. Nieuwe API-laag moet dezelfde semantiek leveren als dit register.
3. Veldnamen in de app worden pas hernoemd na formele OSLO-validatie.

### 4.2 Minimale API-contracten (doelbeeld)

1. `Works API`:
- werk-id, bronstatus, periode, geometrie, beheerder, categorie.
2. `Permits API`:
- vergunning-id, status, geldigheid, koppelsleutel naar werk.
3. `Inspections API`:
- inspectiecontext, vaststellingen, evidence, handover/syncstatus.

## 5. Open standaardisatievragen (te beslissen)

1. Is `gipodId` de primaire sleutel voor cross-systeem koppeling?
2. Welke sleutel is canoniek voor vergunningkoppeling (`permitReferenceId`, BONU, andere)?
3. Welke statussen worden normatief voor “in uitvoering”, “gepland”, “afgerond”?
4. Welke organisatie-entiteit is normatief: `beheerder`, `aanvrager`, `nutsBedrijf`?
5. Welke OSLO-URI’s worden in payloads opgenomen (niet alleen labels)?

## 6. Aanpak voor volgende oefening (OSLO standaardiseren)

1. Gebruik `docs/techniek/DN_CODETABELLEN_INPASSING_ANALYSE.md` als input voor canonieke codelijsten.
2. Verzamel officiële OSLO-definities + GIPOD datadictionary + GIS contracten.
3. Vul per veld in dit register:
- OSLO klasse,
- OSLO attribuut,
- datatype,
- cardinaliteit,
- voorbeeldwaarde.
4. Markeer verschillen tussen huidige appnaam en OSLO-doelnaam.
5. Definieer migratielaag (`adapter`) zodat bestaande code kan blijven draaien.
6. Leg definitieve mapping vast in versieerbaar contractdocument (`v1`, `v2`, ...).

## 7. Voltooid in iteratie 1

1. Nieuwe GIPOD-velden zijn technisch toegevoegd aan het werkrecord.
2. Vergunningstatus en koppelconfidence zijn zichtbaar in UI.
3. Basisregister voor OSLO-componenten is opgezet in dit bestand.

## 8. Nog niet voltooid

1. Formele verificatie per veld tegen officiële OSLO-specificaties.
2. Opname van expliciete OSLO-URI’s in runtime payload.
3. Contracttests op OSLO-compliance.
