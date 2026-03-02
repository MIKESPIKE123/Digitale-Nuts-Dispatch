# DN Release Gate v1.7 - Checklist

Datum: 2026-02-28  
Status: Ready for execution  
Doel: formele go/no-go poort voor release `v1.7` (GIPOD notificatie-inbox en dispatch-urgentie).

## 1. Ingangscriteria

1. `DN-GIPOD-NOTIF-001..005` opgeleverd.
2. Real-tenant validatieplan uitgevoerd met bewijs.
3. 7-dagen operationele acceptatie afgerond.

## 2. Kwaliteitspoort

1. Typecheck en tests groen.
2. Geen open `S1` issues.
3. Open `S2` issues hebben owner + deadline + workaround.
4. Regressierisico in dispatch en governance beoordeeld.

## 3. Security en governance poort

1. Tokenbeheer en scope-afspraken gevalideerd.
2. Audit/diagnosevelden zichtbaar in UI (`statuscode`, `poll`, `429-streak`).
3. Runbook bijgewerkt en gedeeld met support.

## 4. Operationele poort

1. Dispatch urgentieblok bruikbaar in dagelijkse workflow.
2. Governance inbox ondersteunt statusopvolging zonder manuele fallback.
3. Incident/escalatiepad bekend bij projectteam.

## 5. Releasebeslissing

| Poort | Owner | Resultaat (GO/NO-GO) | Opmerking |
|---|---|---|---|
| Kwaliteit |  |  |  |
| Security/Governance |  |  |  |
| Operatie |  |  |  |
| Product |  |  |  |

Eindbeslissing:

1. `GO v1.7`
2. `NO-GO v1.7`

## 6. Cutover en rollback

Cutover:

1. Configuratiecheck (`VITE_GIPOD_*`, mock flags).
2. Deploy + post-deploy smoke.
3. Eerste 24u verhoogde monitoring.

Rollback:

1. Terug naar vorige stabiele build/tag.
2. Mock-notificaties tijdelijk activeren voor operationele continuïteit.
3. Incidentrapport binnen 24u.
