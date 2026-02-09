# Versiebeheer Instructies

## Actuele status
- Huidige appversie: `v1.4`
- Bron van waarheid: `src/version.ts`
- Laatste update document: 8 februari 2026

## Doel
Eenduidig releaseproces zodat code en documentatie altijd dezelfde versie tonen.

## Stap-voor-stap bij elke release
1. Update `src/version.ts`:
   - `APP_VERSION`
   - `VERSION_CHANGELOG`
2. Update `CHANGELOG.md` met datum + wijzigingen.
3. Synchroniseer versievermelding in alle root-documenten:
   - `README.md`
   - `README_NEW.md`
   - `DOCUMENTATION_INDEX.md`
   - `BUSINESS_RULES_DOCUMENTATION.md`
   - `TECHNICAL_IMPLEMENTATION_GUIDE.md`
   - `PDF-Generator-Documentation.md`
   - `REVIEWER_GUIDE.md`
   - `IMPLEMENTATIE_RAPPORT_DIGITALE_NUTS_2026_02.md`
   - `VERSIE_BEHEER_INSTRUCTIES.md`
4. Run technische check:
   - `npm run build`
5. Controleer visuele versie in app-header (`App.tsx`).

## Verhogingsregels
- `+0.1` bij elke zichtbare functionele wijziging.
- Geen verhoging voor pure tekstcorrecties zonder impact.
- Bij grote functionele sprong mag major/minor aangepast worden (bv. `2.0`).

## Definitie van "zichtbare functionele wijziging"
- Nieuwe workflow of validatieregel.
- Wijziging in exportinhoud (PDF/CSV).
- Nieuwe configuratiemogelijkheid.
- Aanpassing die veldgebruikers direct merken (bv. foto-stempel, GPS gedrag).

## Release checklist
- [ ] `src/version.ts` geupdate
- [ ] `CHANGELOG.md` geupdate
- [ ] Alle root-`md` bestanden versiegesynchroniseerd
- [ ] `npm run build` geslaagd
- [ ] Header toont correcte versie
