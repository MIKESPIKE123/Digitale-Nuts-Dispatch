export type GuideStep = {
  title: string;
  description: string;
};

export type GuideFaqItem = {
  question: string;
  answer: string;
};

export type GuideDefinitionItem = {
  term: string;
  explanation: string;
};

export type GuidePitchStepItem = {
  timebox: string;
  focus: string;
  liveDemoAction: string;
  coreMessage: string;
  targetView: "dashboard" | "dispatch" | "kaart" | "vaststelling" | "data-sync" | "handleiding";
  durationSeconds: number;
};

export type GuideDemoScriptStepItem = {
  minuteWindow: string;
  goal: string;
  screen: string;
  coreMessage: string;
  fallback: string;
};

export type GuideRoleQuickGuideItem = {
  role: "Toezichter" | "Dispatcher" | "Projectleider";
  purpose: string;
  quickStart: string[];
  commonMistakes: [string, string, string, string, string];
};

export const GUIDE_LAST_UPDATED = "27/02/2026";

export const GUIDE_INTRO =
  "Deze handleiding helpt je snel opstarten in DN Dispatch. Gebruik ze als quick guide voor dagelijkse planning, reserve-inzet, toewijzingsarchief en vaststellingsopvolging vanuit kaartcontext.";

export const GUIDE_QUICK_STEPS: GuideStep[] = [
  {
    title: "1. Start met synchroniseren",
    description:
      "Klik links op 'Synchroniseer nu' zodat je met de nieuwste dossierdata werkt.",
  },
  {
    title: "2. Kies de juiste dispatch-datum",
    description:
      "Gebruik het datumveld. Met 'Naar volgende werkdag' spring je vooruit, met 'Terug naar vandaag' ga je snel terug.",
  },
  {
    title: "3. Controleer filters",
    description:
      "Zet status, district, postcode en toezichter juist om alleen relevante dossiers te zien. Let op labels [R], (afw) en (niet actief).",
  },
  {
    title: "4. Gebruik impactfilter",
    description:
      "Filter links op LAAG/MIDDEL/HOOG om snel te focussen op dossiers met hoogste maatschappelijke impact.",
  },
  {
    title: "5. Plan via action cards",
    description:
      "Klik rechts op een action card om meteen dezelfde werf op de kaart te focussen.",
  },
  {
    title: "6. Lees kaartcontext",
    description:
      "Open de LEGENDE, gebruik 'Zoek straat op kaart' en controleer routevolgorde en type pin.",
  },
  {
    title: "7. Werk vanuit de popup",
    description:
      "De infokaart bij de pin toont context en laat je meteen kiezen tussen 'Open bestaand verslag' of 'Nieuw verslag'.",
  },
  {
    title: "8. Rond je dag af",
    description:
      "Exporteer PDF's en het toewijzingsarchief, en noteer niet-toegewezen dossiers voor opvolging.",
  },
];

export const GUIDE_FAQ: GuideFaqItem[] = [
  {
    question: "Wat betekent een rode of oranje pin?",
    answer:
      "Rood duidt verplichte actie aan (start/einde). Oranje is een cadansbezoek tussenin.",
  },
  {
    question: "Waarvoor dient de impactfilter (LAAG/MIDDEL/HOOG)?",
    answer:
      "Die filtert kaart en action cards op maatschappelijke impactscore. Zo kan je bij drukte eerst op de hoogste impact focussen.",
  },
  {
    question: "Waarom zie ik geen terreinacties op een gekozen dag?",
    answer:
      "Je zit waarschijnlijk op een weekend/feestdag of je filters zijn te streng. Kies een werkdag en controleer de actieve filters.",
  },
  {
    question: "Wat als de kaart niet op de juiste locatie staat?",
    answer:
      "Klik opnieuw op de action card of op 'Centreer'. Bij postcode-locatie is de positie een benadering, niet het exacte adres.",
  },
  {
    question: "Hoe start ik een vaststelling rechtstreeks vanuit de kaart?",
    answer:
      "Open de popup van een geselecteerd bezoek en gebruik 'Open bestaand verslag' of 'Nieuw verslag'. Zo ga je zonder extra navigatie naar DN Vaststelling.",
  },
  {
    question: "Hoe weet ik of de data recent is?",
    answer:
      "In de linker kolom zie je 'Laatste sync' en 'Laatste data-refresh'. Die waarden tonen je actuele status.",
  },
  {
    question: "Waar vind ik het toewijzingsarchief?",
    answer:
      "Ga naar 'DN Data & Sync'. Daar zie je snapshots per dispatchdatum, dekkingsgraad t.o.v. vaststellingen en acties voor export of reset.",
  },
  {
    question: "Wat doet export/import van toezichters precies?",
    answer:
      "Die zet inspecteurconfiguratie, afwezigheden en dispatchcapaciteit over tussen instanties. Feestdagen en auto-sync instellingen blijven lokaal behouden.",
  },
  {
    question: "Welke extra context staat nu op action cards?",
    answer:
      "Per dossier zie je klikbare ReferentieID/GIPOD-links, vergunningstatus, GIPOD-bronstatus, toewijzingsrol en manuele override-context.",
  },
  {
    question: "Waar pas ik inspecteurs, postcodes en feestdagen aan?",
    answer:
      "Ga naar DN Instellingen en open het instellingenvenster. Daar beheer je zones, namen, initialen, reserveflag, inzettermijn, afwezigheden en feestdagen.",
  },
  {
    question: "Wat betekenen [R], (afw) en (niet actief) bij toezichters?",
    answer:
      "[R] betekent reservetoezichter. (afw) betekent afwezig op de gekozen datum. (niet actief) betekent buiten het ingestelde inzetvenster (Actief van/tot).",
  },
  {
    question: "Wat betekent 'Niet toegewezen'?",
    answer:
      "Dat dossier kon vandaag niet meer binnen capaciteit of zoneverdeling ingepland worden en vraagt manuele opvolging.",
  },
];

export const GUIDE_DISPATCH_FILTER_FAQ: GuideFaqItem[] = [
  {
    question: "Welke bronbestanden bepalen de filters en toewijzing?",
    answer:
      "De kernlogica zit in src/lib/dispatch.ts (dispatch engine met buildDispatchPlan), src/config/inspectors.ts (toezichters + postcodezones), src/lib/appSettings.ts (afwezigheden, overrides, capaciteit), src/lib/decisionEngine.ts (prioriteitsscore), src/lib/inspectorContinuity.ts (continuïteit), src/lib/impactScoring.ts (maatschappelijke impact) en scripts/import-nuts-data.mjs (importfilters). In README.md staan de secties 'Filters in scope' en 'Dispatchregels' als leesbare samenvatting.",
  },
  {
    question: "Welke dossiers komen binnen via de data-import?",
    answer:
      "Het importscript (scripts/import-nuts-data.mjs) selecteert alleen dossiernummers met BONU, 2024, 2025 of 2026 (exclusie: SWPR*, SWOU*, DL*), werftype NUTSWERKEN, en met geldige start-/einddatum en postcode. Bron is de GIPOD-export of het weekrapport.",
  },
  {
    question: "Welke runtimefilters bepalen welke dossiers in de dispatch komen?",
    answer:
      "De dispatch vertrekt van de operationele basisselectie uit de importbeschrijving: statussen VERGUND en IN EFFECT. Daarbovenop gelden de gekozen runtimefilters voor bronstatus (bv. 'In uitvoering'), GIPOD-categorie, vergunningstatus, district en postcode. Binnen die set krijgen dossiers met goedgekeurde signalisatievergunning (`AFGELEVERD`) eerst voorrang, daarna dossiers met vergunningcontext (`IN_VOORBEREIDING` of vergunningreferentie). Dossiers zonder vergunningcontext blijven wel toelaatbaar als operationele opvulling zodra de vergunningspool is opgebruikt. Dossiers met expliciete 'vergunning afgelopen/verlopen'-signalen worden wel uit de dispatchkandidaten gehouden. Bovendien moet het dossier actief zijn op de dispatchdatum.",
  },
  {
    question: "Hoe wordt een toezichter aan een nutswerk gekoppeld?",
    answer:
      "Elke toezichter heeft primaryPostcodes en backupPostcodes (in src/config/inspectors.ts). Bij toewijzing loopt het systeem een pool-cascade af: (1) primaire zone, (2) backupzone, (3) reserve-inspecteurs, (4) noodpool (alleen voor verplichte bezoeken). Per pool wordt gescoord op postcodematch (+180 primair, +110 backup), continuïteit/sticky inspector (+340), routeclustering (+42 zelfde postcode), afstand (-km × gewicht), dagbelasting (-18 per bezoek) en weekbalans.",
  },
  {
    question: "Wat is de 'sticky inspector' / continuïteitsregel?",
    answer:
      "De eerste toezichter die aan een nutswerk wordt toegewezen, wordt opgeslagen als voorkeurinspecteur (src/lib/inspectorContinuity.ts). Bij latere dispatches krijgt die inspecteur een scorebonus van +340, zodat hetzelfde dossier bij dezelfde persoon blijft tenzij die afwezig of overbelast is.",
  },
  {
    question: "Hoe werkt de capaciteitsbeperking?",
    answer:
      "Standaard heeft elke toezichter een soft limit van 5 bezoeken/dag en een hard limit van 6. Complexe werken (Categorie 1, 2, Dringend) wegen 1.5× in plaats van 1.0×. Per toezichter kan in Instellingen een fixedDailyLoad of experienceFactor (0.5–1.5) worden ingesteld.",
  },
  {
    question: "Wat zijn START, EIND en TUSSEN bezoeken?",
    answer:
      "Een START-bezoek is verplicht op de gecorrigeerde startdatum van het werk (prioriteit 120). Een EIND-bezoek is verplicht op de einddatum (prioriteit 116). TUSSEN-bezoeken zijn cadansbezoeken op elke tweede werkdag (prioriteit 80) en zijn optioneel. Er is ook een coverage top-up: als het aantal candidates < 75% van actieve werken is, worden extra tussenbezoeken toegevoegd.",
  },
  {
    question: "Hoe worden afwezige of inactieve toezichters uitgesloten?",
    answer:
      "In src/lib/appSettings.ts worden per-toezichter afwezigheidsperiodes en een actief-venster (Actief van / Actief tot) opgeslagen. Als de dispatchdatum in een afwezigheidsperiode valt, of buiten het actief-venster, wordt die toezichter uit alle pools verwijderd. In de UI zie je dit als '(afw)' of '(niet actief)'.",
  },
  {
    question: "Wat doet de maatschappelijke impactscore?",
    answer:
      "src/lib/impactScoring.ts berekent per postcode een impactscore op basis van bevolkingsdichtheid, kwetsbaarheid, dienstverleningsdruk en mobiliteitsgevoeligheid. De gewichten staan in src/config/impactWeights.ts. Zo krijgen dossiers in dichtbevolkte of kwetsbare zones een hogere prioriteit.",
  },
  {
    question: "Hoe werkt manuele override in de dispatch?",
    answer:
      "In de dispatch-UI kan je handmatig een andere toezichter toewijzen aan een dossier. Die keuze wordt samengevoegd met de sticky inspector en weegt via preferredInspectorInputByWorkId mee als een sterke voorkeur bij volgende dispatches.",
  },
  {
    question: "Wat is het verschil tussen Dedicated, Backup en Reserve?",
    answer:
      "Dedicated = het nutswerk ligt in de primaire postcodezone van de toezichter. Backup = het werk ligt in de backupzone. Reserve = een toezichter met isReserve-flag die pas ingezet wordt als dedicated/backup niet beschikbaar zijn. De toewijzingsrol wordt op de action card getoond.",
  },
  {
    question: "Hoe werkt de weekbalans / fairness?",
    answer:
      "src/lib/assignmentHistory.ts slaat dagelijks snapshots op. Het verschil tussen het weekaantal van een toezichter en de weekbaseline wordt als penalty meegerekend (-(weeklyCount − baseline) × 18), zodat bij de volgende dispatch degene met minder recente toewijzingen voorkeur krijgt.",
  },
  {
    question: "Hoe worden follow-up bezoeken na einddatum gepland?",
    answer:
      "Voor werken die hun einddatum voorbij zijn, plant dispatch.ts wekelijkse follow-up taken (elke 7 dagen, tot 56 dagen) en wijst die toe aan de voorkeurinspecteur.",
  },
  {
    question: "In welke MD-documenten vind ik de filterregels terug?",
    answer:
      "README.md > 'Filters in scope' en 'Dispatchregels' beschrijft alle filter- en toewijzingsregels op hoog niveau. AI_CONTEXT.md > 'data flow' beschrijft de importfilters (BONU, status, werftype). Voor implementatiedetails: src/lib/dispatch.ts bevat de volledige enginecode.",
  },
];

export const GUIDE_VASTSTELLING_HANDOVER_SYNC: GuideDefinitionItem[] = [
  {
    term: "Handover",
    explanation:
      "Je overdrachtsbeslissing na de vaststelling: BLOCK, REQUEST_FIX of APPROVE.",
  },
  {
    term: "Geen keuze",
    explanation:
      "Er is nog geen handoverbeslissing opgeslagen voor dit dossier.",
  },
  {
    term: "Handover nota",
    explanation:
      "Korte motivatie bij je beslissing: wat werd vastgesteld en wat moet de volgende stap zijn.",
  },
  {
    term: "Markeer als valid",
    explanation:
      "Controleert validatie (verplichte velden, NOK-verantwoordelijke, locatie). Bij succes gaat status naar valid.",
  },
  {
    term: "Zet in wachtrij",
    explanation:
      "Zet de vaststelling op queued en plaatst die in de lokale sync-wachtrij voor verzending.",
  },
  {
    term: "Sync Center",
    explanation:
      "Overzicht en beheer van verzendingen: queue-status, endpoint, auto-sync en timeout.",
  },
  {
    term: "Queued",
    explanation:
      "Aantal items dat klaarstaat om naar de server te versturen.",
  },
  {
    term: "Failed",
    explanation:
      "Aantal items waarvan verzending mislukt is (bijv. timeout of endpoint niet bereikbaar).",
  },
  {
    term: "Synced",
    explanation:
      "Aantal items dat succesvol verzonden en bevestigd is.",
  },
  {
    term: "Endpoint (/api/inspecties/sync)",
    explanation:
      "Serveradres waar de sync-berichten naartoe gestuurd worden.",
  },
  {
    term: "Auto sync bij online",
    explanation:
      "Als dit aan staat, probeert de app automatisch te synchroniseren zodra verbinding terug is.",
  },
  {
    term: "Timeout (ms) 15000",
    explanation:
      "Maximale wachttijd per sync-request (15000 ms = 15 seconden).",
  },
];

export const GUIDE_TIPS = [
  "Werk elke ochtend eerst een synchronisatie uit.",
  "Gebruik de kaartzoeker om snel straten te verifiëren met het team.",
  "Controleer bij drukke dagen expliciet de lijst met niet-toegewezen dossiers.",
  "Exporteer het toewijzingsarchief wekelijks voor opvolging buiten de app.",
  "Houd deze handleiding up-to-date bij elke functionele release van DN Dispatch.",
];

export const GUIDE_PITCH_PRESENTATION: GuidePitchStepItem[] = [
  {
    timebox: "00:00 - 00:45",
    focus: "Opening: waarom Digitale Nuts",
    liveDemoAction: "Open DN Dashboard en toon de operationele context.",
    coreMessage:
      "We bouwen een terreingerichte app die dispatch, kaartcontext en vaststellingen in een workflow samenbrengt.",
    targetView: "dashboard",
    durationSeconds: 45,
  },
  {
    timebox: "00:45 - 02:00",
    focus: "Dagstart van toezichter",
    liveDemoAction:
      "Toon datum, filters en toezichterselectie in DN Dispatch.",
    coreMessage:
      "De planning is direct bruikbaar op werkdagniveau en focust op de juiste dossiers.",
    targetView: "dispatch",
    durationSeconds: 75,
  },
  {
    timebox: "02:00 - 03:15",
    focus: "Kaart + LEGENDE + action cards",
    liveDemoAction:
      "Klik een action card en laat kaartfocus, pin en dossierdetails zien.",
    coreMessage:
      "De kaart is geen los scherm, maar een actieve beslislaag voor terreinprioriteiten.",
    targetView: "dispatch",
    durationSeconds: 75,
  },
  {
    timebox: "03:15 - 04:45",
    focus: "DN Vaststelling met context",
    liveDemoAction:
      "Open DN Vaststelling, gebruik context en toon prefill (BONU, referentie/GW, GIPOD, adres, nutsmaatschappij).",
    coreMessage:
      "Toezichters verliezen geen tijd met dubbel inputwerk; context komt automatisch mee.",
    targetView: "vaststelling",
    durationSeconds: 90,
  },
  {
    timebox: "04:45 - 05:45",
    focus: "Handover + Sync Center",
    liveDemoAction:
      "Markeer valid, zet in wachtrij en toon queued/failed/synced + retry.",
    coreMessage:
      "Offline/online-terreinwerking is voorzien met duidelijke statussen en herstelpad.",
    targetView: "vaststelling",
    durationSeconds: 60,
  },
  {
    timebox: "05:45 - 06:45",
    focus: "KPI-paneel v1",
    liveDemoAction:
      "Toon de 6 pitch-KPI's en verwijs naar KPI-definities v1 in de handleiding.",
    coreMessage:
      "We tonen meetbare voortgang vandaag, met transparante definities en beperkingen.",
    targetView: "dashboard",
    durationSeconds: 60,
  },
  {
    timebox: "06:45 - 07:45",
    focus: "API-ready architectuur",
    liveDemoAction:
      "Leg kort mock gateways + feature flags uit (GIPOD/A-SIGN/KLM).",
    coreMessage:
      "We kunnen nu leveren en later veilig koppelen met echte partner-API's zonder UI-herbouw.",
    targetView: "data-sync",
    durationSeconds: 60,
  },
  {
    timebox: "07:45 - 09:00",
    focus: "Afronding en call-to-action",
    liveDemoAction:
      "Sluit af met gevraagde partnerdata en volgende sprintstappen.",
    coreMessage:
      "Beslissing nodig op minimale datavelden en API-contracten om naar productie te versnellen.",
    targetView: "handleiding",
    durationSeconds: 75,
  },
];

export const GUIDE_PITCH_CHECKLIST: string[] = [
  "Voer eerst Demo reset uit voor een propere startsituatie.",
  "Controleer of de juiste dispatchdatum en toezichter actief zijn.",
  "Gebruik vooraf afgesproken demo-dossiers (OK, NOK, sync-fail).",
  "Hou fallback klaar: bij netwerkprobleem toon je queue + retry flow.",
];

export const GUIDE_DEMO_SCRIPT_DAG_IN_HET_LEVEN: GuideDemoScriptStepItem[] = [
  {
    minuteWindow: "00:00 - 00:45",
    goal: "Context zetten voor het team",
    screen: "DN Dashboard",
    coreMessage:
      "De app bundelt planning, kaart en vaststellingen in 1 terreinflow.",
    fallback:
      "Bij trage data: blijf op dashboard en toon KPI-paneel v1 als startverhaal.",
  },
  {
    minuteWindow: "00:45 - 02:00",
    goal: "Dagstart tonen",
    screen: "DN Dispatch",
    coreMessage:
      "Datum, filters en toezichters bepalen welke dossiers vandaag echt aandacht vragen.",
    fallback:
      "Als sessie ontbreekt: kies meteen actieve toezichter in de sessie-popup.",
  },
  {
    minuteWindow: "02:00 - 03:15",
    goal: "Kaartcontext gebruiken",
    screen: "DN Dispatch - Kaart",
    coreMessage:
      "Action cards sturen kaartfocus; LEGENDE en zoekfunctie geven ruimtelijke context.",
    fallback:
      "Bij map-render issue: toon dossierdetail en routevolgorde in dispatch cards.",
  },
  {
    minuteWindow: "03:15 - 04:45",
    goal: "Vaststelling met contextprefill",
    screen: "DN Vaststelling",
    coreMessage:
      "BONU, referentie/GW, GIPOD, adres en nutsmaatschappij worden vooraf ingevuld.",
    fallback:
      "Als dossier niet geselecteerd is: kies eerst een action card en open opnieuw DN Vaststelling.",
  },
  {
    minuteWindow: "04:45 - 05:45",
    goal: "Handover en kwaliteit",
    screen: "DN Vaststelling - acties",
    coreMessage:
      "Markeer valid, kies handover en motiveer kort voor duidelijke opvolging.",
    fallback:
      "Bij validatiefout: toon live welke verplichte velden nog ontbreken.",
  },
  {
    minuteWindow: "05:45 - 06:45",
    goal: "Offline/online sync uitleggen",
    screen: "Sync Center",
    coreMessage:
      "Queue toont queued/failed/synced en ondersteunt retry zonder dataverlies.",
    fallback:
      "Bij endpoint down: forceer 1 sync-fail scenario en toon herstel via retry.",
  },
  {
    minuteWindow: "06:45 - 07:45",
    goal: "Meetbaarheid aantonen",
    screen: "DN Dashboard - KPI-paneel v1",
    coreMessage:
      "Kern-KPI's geven direct zicht op operationele voortgang en datakwaliteit.",
    fallback:
      "Bij discussie over cijfers: open KPI-definities v1 in de handleiding.",
  },
  {
    minuteWindow: "07:45 - 09:00",
    goal: "Afronding en beslissingen vragen",
    screen: "DN Handleiding / Data & Sync",
    coreMessage:
      "Vraag partnerinput op minimumvelden en bevestig volgende sprintscope.",
    fallback:
      "Bij tijdsdruk: gebruik alleen de pitch-checklist en benoem 3 concrete next steps.",
  },
];

export const GUIDE_ROLE_QUICK_GUIDES: GuideRoleQuickGuideItem[] = [
  {
    role: "Toezichter",
    purpose:
      "Snel en correct vaststellingen registreren op terrein met minimale invoerlast.",
    quickStart: [
      "Start je sessie en controleer of je naam actief staat.",
      "Open Mijn lijst vandaag en selecteer eerst prioritaire dossiers.",
      "Gebruik context in DN Vaststelling zodat BONU/GW/GIPOD/adres automatisch meekomt.",
      "Kies handover en voeg een korte, concrete nota toe.",
      "Controleer Sync Center voor queued/failed items voor je afsluit.",
    ],
    commonMistakes: [
      "Sessie niet starten, waardoor registraties aan verkeerde context hangen.",
      "Validatie overslaan en toch proberen syncen.",
      "Handover zonder nota invullen bij complexe NOK-dossiers.",
      "Geen retry uitvoeren op failed sync-items.",
      "Terugkeren zonder te checken of het juiste dossier geselecteerd is.",
    ],
  },
  {
    role: "Dispatcher",
    purpose:
      "Dagplanning stabiel houden en de juiste dossiers naar de juiste toezichter sturen.",
    quickStart: [
      "Controleer datum op werkdag en pas indien nodig aan.",
      "Zet status-, district- en impactfilters bewust voor de dagcontext.",
      "Check niet-toegewezen dossiers en herverdeel waar nodig.",
      "Gebruik kaart + action cards om conflicten of clustering snel te zien.",
      "Volg op het einde van de dag queue/handover op en exporteer het toewijzingsarchief.",
    ],
    commonMistakes: [
      "Verouderde datum laten staan bij opstart.",
      "Te veel filters tegelijk aanzetten waardoor relevante dossiers verdwijnen.",
      "Niet-toegewezen lijst niet expliciet nalopen.",
      "Kaartpopup niet gebruiken voor directe vaststellingsactie (bestaand/nieuw verslag).",
      "Geen terugkoppeling geven op failed sync, ontbrekende handover of ontbrekende archiefexport.",
    ],
  },
  {
    role: "Projectleider",
    purpose:
      "Operationele voortgang opvolgen, knelpunten escaleren en partnerbeslissingen sturen.",
    quickStart: [
      "Open KPI-paneel v1 en bespreek scope, contextkwaliteit en queue-status.",
      "Gebruik de pitchflow om team en partners op dezelfde verhaallijn te houden.",
      "Controleer of veel voorkomende fouten per rol dalen week op week.",
      "Bevestig welke partnerdata nodig is voor volgende integratiestap.",
      "Leg sprintafspraken vast met duidelijke owner en deadline.",
    ],
    commonMistakes: [
      "KPI's lezen zonder beperking/definitie mee te nemen.",
      "Nieuwe wensen toevoegen zonder prioritering of scope-cut.",
      "Demo-issues verwarren met structurele productissues.",
      "Geen expliciete afspraken maken over minimale partnerdata.",
      "Te weinig ritme op adoptiecoaching voor terreingebruikers.",
    ],
  },
];
