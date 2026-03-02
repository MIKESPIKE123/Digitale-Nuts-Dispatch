# DN Uitvoering Evidence

Doel: vaste opslaglocatie voor reproduceerbare validatie-artifacts (geen tempbestanden).

Voor GIPOD beta validatie:

1. Bewaar smoke JSON-rapporten hier, bv.:
   - `gipod_beta_smoke_20260228.json`
2. Bewaar samenvattende screenshots/exports in submappen per datum.

Bronscript:

1. `npm run gipod:smoke`
2. met `GIPOD_SMOKE_REPORT_PATH=docs/uitvoering/evidence/<bestandsnaam>.json`
