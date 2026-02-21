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

export const GUIDE_LAST_UPDATED = "20/02/2026";

export const GUIDE_INTRO =
  "Deze handleiding helpt je snel opstarten in DN Dispatch. Gebruik ze als quick guide voor dagelijkse planning, reserve-inzet en KPI-opvolging.";

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
      "De infokaart bij de pin toont prioriteit, inzichten en links naar ReferentieID/GIPOD.",
  },
  {
    title: "8. Rond je dag af",
    description:
      "Exporteer per toezichter een PDF en noteer niet-toegewezen dossiers voor opvolging.",
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
    question: "Hoe weet ik of de data recent is?",
    answer:
      "In de linker kolom zie je 'Laatste sync' en 'Laatste data-refresh'. Die waarden tonen je actuele status.",
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
      "Volg op het einde van de dag de queue- en handoverstatus op.",
    ],
    commonMistakes: [
      "Verouderde datum laten staan bij opstart.",
      "Te veel filters tegelijk aanzetten waardoor relevante dossiers verdwijnen.",
      "Niet-toegewezen lijst niet expliciet nalopen.",
      "Alleen op kaart kijken zonder action cards te valideren.",
      "Geen terugkoppeling geven op failed sync of ontbrekende handover.",
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
