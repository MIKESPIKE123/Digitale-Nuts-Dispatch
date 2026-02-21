import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  GUIDE_DEMO_SCRIPT_DAG_IN_HET_LEVEN,
  GUIDE_FAQ,
  GUIDE_INTRO,
  GUIDE_LAST_UPDATED,
  GUIDE_PITCH_CHECKLIST,
  GUIDE_PITCH_PRESENTATION,
  GUIDE_QUICK_STEPS,
  GUIDE_ROLE_QUICK_GUIDES,
  GUIDE_TIPS,
  GUIDE_VASTSTELLING_HANDOVER_SYNC,
} from "./config/guideContent";
import { HOLIDAYS } from "./config/holidays";
import { INSPECTORS } from "./config/inspectors";
import worksFallbackRaw from "./data/works.generated.json";
import {
  getAbsentInspectorIds,
  getConfiguredInspectors,
  getInactiveInspectorIds,
  loadDispatchSettings,
  saveDispatchSettings,
  sanitizeDispatchSettings,
} from "./lib/appSettings";
import { addDays, formatIsoDate, parseIsoDate } from "./lib/dateUtils";
import { buildDispatchPlan, getNextWorkday } from "./lib/dispatch";
import { fetchImpactProfileMap, getFallbackImpactProfileMap } from "./lib/impactData";
import {
  loadContinuityInspectorMap,
  registerFirstAssignedInspectors,
  saveContinuityInspectorMap,
} from "./lib/inspectorContinuity";
import { exportInspectorPdf } from "./lib/pdfExport";
import { buildRouteIndexMap, computeRouteProposal } from "./lib/routes";
import { computeImpactScore, type ImpactLevel, type ImpactProfile } from "./lib/impactScoring";
import { getWorksGateway } from "./modules/integrations/factory";
import { buildDashboardKpis } from "./modules/kpi/dashboardKpiEngine";
import {
  KPI_DEFINITION_BACKLOG,
  KPI_DEFINITIONS,
  KPI_REGISTER_SYNC_NOTE,
} from "./modules/kpi/definitions";
import { buildPitchKpis } from "./modules/kpi/pitchKpiEngine";
import { buildWeekOverWeekTrendKpis } from "./modules/kpi/trendKpiEngine";
import type { KpiCard, TrendKpiCard } from "./modules/kpi/types";
import type {
  ActiveInspectorSession,
  DNVaststellingRecord,
  DNVaststellingSyncItem,
} from "./modules/vaststelling/contracts";
import { buildInspectorSession } from "./modules/vaststelling/mappers";
import {
  DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS,
  DN_VASTSTELLING_STORAGE_EVENT,
  clearActiveInspectorSession,
  loadDNVaststellingRecords,
  loadDNVaststellingSyncQueue,
  loadActiveInspectorSession,
  saveDNVaststellingRecords,
  saveDNVaststellingSyncQueue,
  saveDNVaststellingSyncSettings,
  saveActiveInspectorSession,
} from "./modules/vaststelling/storage";
import { VaststellingView } from "./modules/vaststelling/VaststellingView";
import type { DispatchSettings, GIPODPermitStatus, WorkRecord, WorkStatus } from "./types";

const FALLBACK_WORKS = worksFallbackRaw as WorkRecord[];
const DATA_URL = "/data/works.generated.json";
const IMPACT_DATA_URL = "/data/impact.generated.json";
const SYNC_ENDPOINT = "/api/sync-dispatch-data";
const STATUS_VALUES: WorkStatus[] = ["VERGUND", "IN EFFECT"];
const IMPACT_LEVEL_VALUES: ImpactLevel[] = ["LAAG", "MIDDEL", "HOOG"];
const DEFAULT_GIPOD_SOURCE_STATUS = "In uitvoering";
const UNKNOWN_GIPOD_CATEGORY = "Onbekend";
const UNKNOWN_PERMIT_STATUS: GIPODPermitStatus = "ONBEKEND";
const DEVICE_KEY = "dn_dispatch_device_id_v1";
const RIGHT_PANEL_DEFAULT_WIDTH = 420;
const RIGHT_PANEL_MIN_WIDTH = 300;
const RIGHT_PANEL_MAX_WIDTH = 760;

const MAP_STYLE_OPTIONS = [
  { id: "clean", label: "Clean", url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "werfcontrast", label: "Werfcontrast", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "nacht", label: "Nacht", url: "https://tiles.openfreemap.org/styles/dark" },
  { id: "analyse", label: "Analyse", url: "https://tiles.openfreemap.org/styles/bright" },
] as const;

type MapStyleId = (typeof MAP_STYLE_OPTIONS)[number]["id"];

type IntegrationState = {
  nuts: boolean;
  aSign: boolean;
  gipod: boolean;
  antwerpenOpenData: boolean;
};

type MainViewKey =
  | "dashboard"
  | "kaart"
  | "dispatch"
  | "vaststelling"
  | "dossiers"
  | "tijdlijn"
  | "oplevering"
  | "rapporten"
  | "data-sync"
  | "handleiding"
  | "instellingen";

type MainViewItem = {
  key: MainViewKey;
  label: string;
  summary: string;
  status: "live" | "roadmap";
};

type PlatformSchil = "Schil 1" | "Schil 2" | "Schil 3" | "Nog te bepalen";
type PlatformSchilFilter = "Alle" | "Schil 1" | "Schil 2" | "Schil 3";

type PlatformExpansionProposal = {
  id: string;
  pxCode?: string;
  title: string;
  description: string;
  schil: PlatformSchil;
  source: "default" | "custom";
};

type PlatformExpansionCatalogDetail = {
  doel: string[];
  scopeMvp: string[];
  userStories: string[];
  implementatiestappen: string[];
  kanZonderExterneApi: string[];
  acceptatiecriteria: string[];
};

const MAIN_NAV_ITEMS: MainViewItem[] = [
  {
    key: "dashboard",
    label: "DN Dashboard",
    summary: "Overzicht van prioriteiten en werkdruk",
    status: "live",
  },
  {
    key: "dispatch",
    label: "DN Dispatch",
    summary: "Toewijzing, kaart en action cards per toezichter",
    status: "live",
  },
  {
    key: "vaststelling",
    label: "DN Vaststelling",
    summary: "Terreinregistratie per toezichter",
    status: "live",
  },
  {
    key: "dossiers",
    label: "DN Dossiers",
    summary: "Filterbare lijst van nutsdossiers",
    status: "live",
  },
  {
    key: "tijdlijn",
    label: "DN Tijdlijn",
    summary: "Planning over de tijd (vergund tot einde)",
    status: "live",
  },
  {
    key: "oplevering",
    label: "DN Oplevering",
    summary: "Wekelijkse opvolging na einde werf",
    status: "roadmap",
  },
  {
    key: "rapporten",
    label: "DN Rapporten",
    summary: "Output voor beleid en operationeel team",
    status: "roadmap",
  },
  {
    key: "data-sync",
    label: "DN Data & Sync",
    summary: "Databronnen, kwaliteit en synchronisatie",
    status: "live",
  },
  {
    key: "handleiding",
    label: "DN Handleiding",
    summary: "Quick guide en Q&A voor gebruikers",
    status: "live",
  },
  {
    key: "instellingen",
    label: "DN Instellingen",
    summary: "Configuratie en toekomstige componenten",
    status: "live",
  },
];

const PLATFORM_EXPANSION_STORAGE_KEY = "dn_platform_expansion_custom_v1";
const PLATFORM_SCHIL_FILTER_OPTIONS: PlatformSchilFilter[] = [
  "Alle",
  "Schil 1",
  "Schil 2",
  "Schil 3",
];

const DEFAULT_PLATFORM_EXPANSIONS: PlatformExpansionProposal[] = [
  {
    id: "px-01-vaststelling-evidentie",
    pxCode: "PX-01",
    title: "Vaststelling+ en Evidentieflow",
    description:
      "Vaststellingen juridisch en operationeel sluitend maken met verplichte context, bewijsvelden en robuuste syncflow.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-02-vergunning-signalisatie",
    pxCode: "PX-02",
    title: "Vergunning en Signalisatiecontrole",
    description:
      "Automatische controles op signalisatie- en vergunningsvoorwaarden met duidelijke mismatchmeldingen in dossier en kaart.",
    schil: "Schil 2",
    source: "default",
  },
  {
    id: "px-03-herstel-checklist-score",
    pxCode: "PX-03",
    title: "Herstelcontrole, Checklist en Kwaliteitsscore",
    description:
      "Checklist-gedreven herstelcontrole met objectieve kwaliteitsscore en beleidsbruikbare aggregaties.",
    schil: "Schil 2",
    source: "default",
  },
  {
    id: "px-04-gipod-connect",
    pxCode: "PX-04",
    title: "GIPOD Connect (In en Out)",
    description:
      "Bidirectionele GIPOD-koppeling met statusmapping, eventqueue en audittrail als gedeelde ketenwaarheid.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-05-partnerportaal",
    pxCode: "PX-05",
    title: "Partnerportaal Nuts en Aannemers",
    description:
      "Rolgebaseerde samenwerking voor nutsbedrijven en aannemers met statusopvolging, feedback en herstelterugkoppeling.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-06-bewonerscommunicatie",
    pxCode: "PX-06",
    title: "Bewonerscommunicatie en QR",
    description:
      "Proactieve bewonersupdates via QR en statusberichten gekoppeld aan werkcontext en feedbacklus.",
    schil: "Schil 2",
    source: "default",
  },
  {
    id: "px-07-gis-communicatieviewer",
    pxCode: "PX-07",
    title: "GIS Communicatieviewer",
    description:
      "Geintegreerde kaartviewer voor intern en extern gebruik met actuele werken, filters en contextuele dossierfiches.",
    schil: "Schil 2",
    source: "default",
  },
  {
    id: "px-08-kpi-datamart",
    pxCode: "PX-08",
    title: "KPI Datamart en Beleidspanel",
    description:
      "Automatische KPI-berekening en trendrapportering voor operationele sturing en managementopvolging.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-09-retributie-juridisch-logboek",
    pxCode: "PX-09",
    title: "Retributie en Juridisch Logboek",
    description:
      "Geautomatiseerde dossierbundeling met juridisch auditspoor als basis voor retributie en betwistingsbeheer.",
    schil: "Schil 3",
    source: "default",
  },
  {
    id: "px-10-ai-assist",
    pxCode: "PX-10",
    title: "AI Assist (Detectie, Planning, Prioritering)",
    description:
      "Explainable AI/rule-based assistent voor detectie, risicoprioritering en planning van toezichtinzet.",
    schil: "Schil 2",
    source: "default",
  },
  {
    id: "px-11-oslo-contract-center",
    pxCode: "PX-11",
    title: "OSLO Contract Center",
    description:
      "Canonieke OSLO-contractlaag met versiebeheer en contractvalidatie voor interoperabele integraties.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-12-privacy-security-toegang",
    pxCode: "PX-12",
    title: "Privacy, Security en Toegang",
    description:
      "Fundament voor SSO, RBAC, audittrail, DPIA en bewaarbeleid in de volledige gegevensketen.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-13-qa-gate-framework",
    pxCode: "PX-13",
    title: "QA Gate Framework",
    description:
      "Formele kwaliteitsgates per release voor functionele kwaliteit, contractconformiteit en operationele borging.",
    schil: "Schil 1",
    source: "default",
  },
  {
    id: "px-14-opschaling-disseminatie",
    pxCode: "PX-14",
    title: "Opschaling, Disseminatie en Uitrolmodel",
    description:
      "Overdraagbare onboardingkit, governance en uitrolpaden voor bovenlokale adoptie van Digitale Nuts.",
    schil: "Schil 3",
    source: "default",
  },
];

const PLATFORM_EXPANSION_CATALOG_DETAILS: Record<string, PlatformExpansionCatalogDetail> = {
  "PX-01": {
    doel: ["Vaststellingen juridisch en operationeel sluitend maken."],
    scopeMvp: [
      "Verplicht contextpakket (gipodId, adres, district, nutsmaatschappij, toezichter).",
      "Foto-VOOR en foto-DETAIL met metadata.",
      "Status/handover/sync vanuit 1 workflow.",
    ],
    userStories: [
      "Als toezichter wil ik met 1 knop context invullen zodat ik sneller registreer.",
      "Als juridische dienst wil ik een complete evidence chain zodat betwistingen aantoonbaar zijn.",
      "Als dispatcher wil ik syncstatus per record zien zodat ik weet wat nog niet verzonden is.",
    ],
    implementatiestappen: [
      "Activeer velden uit DN_VASTSTELLING_VELDENSET_V2_MD.md met status ACTIVEER_SNEL.",
      "Voeg media-contract toe (photoId, takenAt, lat, lon, actorId, hash).",
      "Bouw validatieregel: publiceren blokkeert zonder verplichte kernvelden.",
    ],
    kanZonderExterneApi: [
      "Ja, met lokale/mock opslag.",
      "Backend storage later vervangbaar via gateway.",
    ],
    acceptatiecriteria: [
      "Record kan niet naar queued zonder verplichte context.",
      "Export bevat alle evidence metadata.",
      "Sync failure blijft zichtbaar en retry werkt.",
    ],
  },
  "PX-02": {
    doel: ["Afwijkingen sneller detecteren dan vandaag."],
    scopeMvp: [
      "Regelset op signVergNr, fase, status, zone.",
      "Waarschuwing in dossierdetail als data ontbreekt of inconsistent is.",
    ],
    userStories: [
      "Als toezichter wil ik meteen zien of signalisatievergunning ontbreekt zodat ik gericht controleer.",
      "Als nutscoordinator wil ik een lijst met open afwijkingen zodat ik snel kan bijsturen.",
    ],
    implementatiestappen: [
      "Rule engine v1 in frontend/service laag (zonder externe API).",
      "Mock PermitsGateway toevoegen met standaard scenario's.",
      "Mismatch-badge tonen in kaartpopup en vaststellingsformulier.",
    ],
    kanZonderExterneApi: ["Ja, met mock vergunningstatus.", "Echte A-SIGN integratie later."],
    acceptatiecriteria: [
      "3 testscenario's (ok, ontbrekend, conflict) werken.",
      "Regels zijn configureerbaar, niet hardcoded in UI-component.",
    ],
  },
  "PX-03": {
    doel: ["Policy-implementation gap verkleinen met objectieve checks."],
    scopeMvp: [
      "Checklist sleufherstel in app.",
      "Materiaaltype + fase + termijnHerstel.",
      "Eenvoudige kwaliteitsscore (0-100) op checklistuitkomst.",
    ],
    userStories: [
      "Als toezichter wil ik een korte checklist zodat ik minder vergeet op terrein.",
      "Als beleidsmedewerker wil ik score per aannemer zien zodat ik gericht kan verbeteren.",
    ],
    implementatiestappen: [
      "Map checklistitems op verhardingType, kritiekeZone en termijnHerstel.",
      "Voeg scorefunctie toe in domeinlaag.",
      "Toon score in dossierdetail en dashboard aggregaties.",
    ],
    kanZonderExterneApi: ["Ja, volledig."],
    acceptatiecriteria: [
      "Score wordt automatisch berekend bij opslaan.",
      "Ontbrekende verplichte checklistitems blokkeren afsluiten.",
    ],
  },
  "PX-04": {
    doel: ["1 gedeelde bron van waarheid tussen stad en nuts."],
    scopeMvp: [
      "Inkomende status sync (read).",
      "Uitgaande update queue (write waar toegelaten).",
      "Idempotente events en auditlog.",
    ],
    userStories: [
      "Als toezichter wil ik actuele GIPOD-status zien zodat ik geen verouderde context gebruik.",
      "Als nutsbedrijf wil ik terugkoppeling van vaststellingen ontvangen zonder manuele export.",
    ],
    implementatiestappen: [
      "Definieer WorksGateway en InspectionsGateway payloads.",
      "Voeg statusmappingtabel toe (planned, in_progress, temporary_restore, closed).",
      "Implementeer outbox/inbox patroon met retries.",
    ],
    kanZonderExterneApi: [
      "Ja, met mock gateway en contracttests.",
      "Echte koppeling vraagt toegang en afspraken.",
    ],
    acceptatiecriteria: [
      "Statusmapping is expliciet gedocumenteerd.",
      "Dubbele events leiden niet tot dubbele records.",
    ],
  },
  "PX-05": {
    doel: ["Samenwerking en opvolging versnellen zonder mailketens."],
    scopeMvp: [
      "Partner ziet enkel eigen dossiers.",
      "Herstelupdate + bewijsfoto upload.",
      "Opmerkingen en statusreactie op vaststelling.",
    ],
    userStories: [
      "Als nutscoordinator wil ik mijn open afwijkingen per district zien.",
      "Als aannemer wil ik na herstel foto en status terugsturen voor snelle goedkeuring.",
    ],
    implementatiestappen: [
      "Rolmodel toevoegen (city_inspector, dispatcher, utility_partner, contractor).",
      "Partnerview met beperkte velden.",
      "Reviewflow submitted -> reviewed -> accepted/rework.",
    ],
    kanZonderExterneApi: [
      "Gedeeltelijk, in demo met lokale accounts.",
      "Productie vraagt SSO/RBAC backend.",
    ],
    acceptatiecriteria: [
      "Partner kan geen dossiers van andere partner zien.",
      "Reviewstatus is volledig traceerbaar.",
    ],
  },
  "PX-06": {
    doel: ["Reactieve communicatie omzetten naar proactieve updates."],
    scopeMvp: [
      "QR-link op dossierniveau.",
      "Statusberichten in begrijpbare taal.",
      "Feedbackstatus gekoppeld aan dossier.",
    ],
    userStories: [
      "Als bewoner wil ik op werfbord scannen en direct zien wat er gebeurt.",
      "Als stadsmedewerker wil ik updates niet manueel copy-pasten tussen systemen.",
    ],
    implementatiestappen: [
      "Templatebibliotheek voor 5 kernberichten (start, vertraging, hinder, herstel bezig, afgerond).",
      "QR endpoint naar publieke work summary.",
      "Feedbackveld met SLA-indicatie.",
    ],
    kanZonderExterneApi: [
      "Ja, met interne dataset en statische templates.",
      "Klachtenkoppeling later via API.",
    ],
    acceptatiecriteria: [
      "Elk dossier kan publieke samenvatting tonen.",
      "Berichtgeschiedenis blijft zichtbaar per dossier.",
    ],
  },
  "PX-07": {
    doel: ["1 kaartbeeld voor intern en extern gebruik."],
    scopeMvp: [
      "Kaart met actieve werken en statuskleur.",
      "Filters op adres, wijk, nutsmaatschappij.",
      "Dossierkaart met foto's, timing, verantwoordelijke.",
    ],
    userStories: [
      "Als bewoner wil ik weten welke werken mijn straat raken.",
      "Als toezichter wil ik overlap met andere werken zien voor betere planning.",
    ],
    implementatiestappen: [
      "Bundel bestaande kaartlagen in aparte layer presets.",
      "Voeg publieke modus toe met beperkte dataset.",
      "Koppel QR-deeplink naar kaartfocus.",
    ],
    kanZonderExterneApi: [
      "Ja, op basis van bestaande brondata en open geodata.",
      "Realtime volledigheid stijgt na GIPOD API.",
    ],
    acceptatiecriteria: [
      "Focus op dossier werkt zonder UI-overlap op mobiel.",
      "Layer toggles blijven bruikbaar op smalle schermen.",
    ],
  },
  "PX-08": {
    doel: ["Objectieve KPI's automatisch uit operationele data."],
    scopeMvp: [
      "Kern-KPI's uit pitch v1 + uitbreiding uit CoT-nota.",
      "Trendweergave per week.",
      "KPI-definitietabel in handleiding.",
    ],
    userStories: [
      "Als beleidsmedewerker wil ik doorlooptijd en kwaliteit per partner opvolgen.",
      "Als projectleider wil ik bewijsbare impact tonen in kwartaalrapport.",
    ],
    implementatiestappen: [
      "KPI-calculatielaag centraliseren (geen UI-duplicatie).",
      "Voeg tijdvenster + vergelijkingsbaseline toe.",
      "Exporteer KPI snapshot als markdown/csv.",
    ],
    kanZonderExterneApi: [
      "Ja, voor interne operationele KPI's.",
      "Voor volledige keten-KPI's zijn externe databronnen nodig.",
    ],
    acceptatiecriteria: [
      "Elke KPI heeft formule, bron en beperking.",
      "Dashboard update reageert op filters en sessiecontext.",
    ],
  },
  "PX-09": {
    doel: ["Administratieve afhandeling en bewijsvoering automatiseren."],
    scopeMvp: [
      "Beslisboom op basis van vaststelling + herstelstatus.",
      "Juridisch log met onwijzigbare events.",
      "Conceptdossier voor facturatie/retributie.",
    ],
    userStories: [
      "Als jurist wil ik complete tijdslijn met bewijs per dossier.",
      "Als administratie wil ik minder manuele bundeling voor retributie.",
    ],
    implementatiestappen: [
      "Eventtype-lijst vastleggen (finding_created, partner_notified, repair_verified, case_closed).",
      "Generate dossier bundle (pdf/json) met hash van evidence.",
      "Voeg tarifering placeholders toe (config-based).",
    ],
    kanZonderExterneApi: [
      "Gedeeltelijk (simulatie en conceptbundel).",
      "Finale facturatie vraagt financieel systeem.",
    ],
    acceptatiecriteria: [
      "Logboekentries zijn niet stilzwijgend overschrijfbaar.",
      "Dossierbundle kan per case gereproduceerd worden.",
    ],
  },
  "PX-10": {
    doel: ["Toezichters slimmer inzetten en fouten sneller vinden."],
    scopeMvp: [
      "Rule-based risicoscore (geen ML-afhankelijkheid).",
      "AI-ready fotodataset tagging.",
      "Suggestie controle eerst deze 5 dossiers.",
    ],
    userStories: [
      "Als toezichter wil ik prioriteitsadvies op mijn daglijst.",
      "Als beleidsmedewerker wil ik trenddetectie op terugkerende fouten.",
    ],
    implementatiestappen: [
      "Bouw explainable risk rules op bestaande features.",
      "Labelworkflow voor foto's (ok, nok_signage, nok_material, unknown).",
      "Meet model-readiness KPI's (volledigheid, labelkwaliteit).",
    ],
    kanZonderExterneApi: [
      "Ja, volledig voor rule-based fase.",
      "ML-model later op centrale dataset.",
    ],
    acceptatiecriteria: [
      "Elke score heeft uitlegbare factoren.",
      "False positives kunnen manueel gecorrigeerd worden.",
    ],
  },
  "PX-11": {
    doel: ["Semantische interoperabiliteit als vaste laag."],
    scopeMvp: [
      "Canonieke entiteiten (Work, Inspection, Finding, Handover, MediaEvidence).",
      "Mappingtabellen lokale velden -> OSLO.",
      "Contractvalidatie in CI.",
    ],
    userStories: [
      "Als integratieteam wil ik stabiele contracten zodat koppelingen minder risico hebben.",
      "Als partner wil ik weten welke velden minimaal verplicht zijn.",
    ],
    implementatiestappen: [
      "Publiceer schema v1 per entiteit.",
      "Voeg validator tests toe op mock payloads.",
      "Versiebeheer voor contractwijzigingen (v1, v1.1).",
    ],
    kanZonderExterneApi: ["Ja, volledig."],
    acceptatiecriteria: [
      "Contracttests blokkeren merge bij breaking change.",
      "Mappingdocument is publiek voor partners.",
    ],
  },
  "PX-12": {
    doel: ["Vertrouwen en compliance borgen vanaf MVP."],
    scopeMvp: [
      "SSO voorbereiding + rolmodel.",
      "Audittrail op kritieke acties.",
      "DPIA register met maatregelen.",
    ],
    userStories: [
      "Als security officer wil ik weten wie welk dossier heeft bekeken of aangepast.",
      "Als toezichter wil ik privacy by design zodat beelden veilig bruikbaar blijven.",
    ],
    implementatiestappen: [
      "Implementeer blur-vereiste in fotoflow.",
      "Voeg audit events toe op create/update/sync/export.",
      "Documenteer bewaartermijnen per datatype.",
    ],
    kanZonderExterneApi: [
      "Ja voor audit events en lokale policy checks.",
      "SSO productie vraagt IAM-integratie.",
    ],
    acceptatiecriteria: [
      "Elke kritieke actie heeft actor + timestamp.",
      "DPIA-checklist is ingevuld per nieuwe module.",
    ],
  },
  "PX-13": {
    doel: ["Kwaliteit afdwingen tussen fasen."],
    scopeMvp: [
      "Formele gates voor functioneel, security, performance en contractconformiteit.",
      "Gate owner per domein.",
      "Release checklist in repo.",
    ],
    userStories: [
      "Als productboard wil ik objectief beslissen of een module release-klaar is.",
      "Als ontwikkelaar wil ik duidelijke DoD en gatecriteria.",
    ],
    implementatiestappen: [
      "Definieer standaard gates G1/G2/G3/G4.",
      "Koppel testoutput aan gate template.",
      "Maak gate approval log in markdown.",
    ],
    kanZonderExterneApi: ["Ja, volledig."],
    acceptatiecriteria: [
      "Geen release zonder gate-status approved.",
      "Gatebeslissingen zijn terugvindbaar in audittrail/documentatie.",
    ],
  },
  "PX-14": {
    doel: ["Oplossing overdraagbaar maken naar andere steden en partners."],
    scopeMvp: [
      "Onboarding kit (draaiboek, datacontract, minimaal veldenset).",
      "Uitrolscenario's (centrale webapp, raamcontract, API-partner).",
      "Adoptie-KPI's per bestuur/partner.",
    ],
    userStories: [
      "Als andere stad wil ik snel starten zonder maatwerkproject.",
      "Als programmaleider wil ik lock-in vermijden en marktneutraliteit bewaken.",
    ],
    implementatiestappen: [
      "Documenteer deployment varianten met voor- en nadelen.",
      "Maak standaard partner intake form voor minimumvelden.",
      "Publiceer implementatiechecklist voor lokale besturen.",
    ],
    kanZonderExterneApi: ["Ja, grotendeels documentair en organisatorisch."],
    acceptatiecriteria: [
      "Externe partij kan op basis van kit een proof-of-concept opzetten.",
      "Juridische randvoorwaarden zijn expliciet beschreven.",
    ],
  },
};

function parsePlatformSchil(value: unknown): PlatformSchil {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  if (normalized === "schil 1" || normalized === "1" || normalized === "schil1") {
    return "Schil 1";
  }
  if (normalized === "schil 2" || normalized === "2" || normalized === "schil2") {
    return "Schil 2";
  }
  if (normalized === "schil 3" || normalized === "3" || normalized === "schil3") {
    return "Schil 3";
  }
  return "Nog te bepalen";
}

function loadCustomPlatformExpansions(): PlatformExpansionProposal[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(PLATFORM_EXPANSION_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const validated: PlatformExpansionProposal[] = [];

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const id = `${(entry as { id?: string }).id ?? ""}`.trim();
      const title = `${(entry as { title?: string }).title ?? ""}`.trim();
      const description = `${(entry as { description?: string }).description ?? ""}`.trim();
      if (!id || !title || !description) {
        continue;
      }

      const pxCodeRaw = `${(entry as { pxCode?: string }).pxCode ?? ""}`.trim();
      const pxCode = pxCodeRaw.length > 0 ? pxCodeRaw : undefined;
      const schil = parsePlatformSchil((entry as { schil?: unknown }).schil);

      validated.push({
        id,
        pxCode,
        title,
        description,
        schil,
        source: "custom",
      });
    }

    return validated;
  } catch (error) {
    console.warn("[dn-dispatch] custom platformuitbreidingen konden niet geladen worden", error);
    return [];
  }
}

function saveCustomPlatformExpansions(items: PlatformExpansionProposal[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = items
    .filter((item) => item.source === "custom")
    .map((item) => ({
      id: item.id,
      pxCode: item.pxCode,
      title: item.title,
      description: item.description,
      schil: item.schil,
    }));

  window.localStorage.setItem(PLATFORM_EXPANSION_STORAGE_KEY, JSON.stringify(payload));
}

const InspectorBoard = lazy(async () => {
  const module = await import("./components/InspectorBoard");
  return { default: module.InspectorBoard };
});

const MapPanel = lazy(async () => {
  const module = await import("./components/MapPanel");
  return { default: module.MapPanel };
});

const SettingsModal = lazy(async () => {
  const module = await import("./components/SettingsModal");
  return { default: module.SettingsModal };
});

const TimelineView = lazy(async () => {
  const module = await import("./components/TimelineView");
  return { default: module.TimelineView };
});

function toggleArrayItem(values: string[], item: string): string[] {
  return values.includes(item)
    ? values.filter((value) => value !== item)
    : [...values, item];
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Nog niet uitgevoerd";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Onbekend";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function fetchWorksData(): Promise<WorkRecord[]> {
  return getWorksGateway().fetchWorks({
    dataUrl: DATA_URL,
    cacheBust: true,
  });
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const created =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dn-device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export default function App() {
  const [settings, setSettings] = useState<DispatchSettings>(() => loadDispatchSettings());
  const [activeView, setActiveView] = useState<MainViewKey>("dispatch");
  const [works, setWorks] = useState<WorkRecord[]>(() => FALLBACK_WORKS);
  const [impactProfileByPostcode, setImpactProfileByPostcode] = useState<
    Record<string, ImpactProfile>
  >(() => getFallbackImpactProfileMap());
  const [selectedDate, setSelectedDate] = useState(() =>
    getNextWorkday(formatIsoDate(new Date()), HOLIDAYS)
  );
  const [selectedStatuses, setSelectedStatuses] = useState<WorkStatus[]>([...STATUS_VALUES]);
  const [selectedImpactLevels, setSelectedImpactLevels] = useState<ImpactLevel[]>([
    ...IMPACT_LEVEL_VALUES,
  ]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedPostcodes, setSelectedPostcodes] = useState<string[]>([]);
  const [selectedSourceStatuses, setSelectedSourceStatuses] = useState<string[]>([]);
  const [selectedGipodCategories, setSelectedGipodCategories] = useState<string[]>([]);
  const [selectedPermitStatuses, setSelectedPermitStatuses] = useState<GIPODPermitStatus[]>([]);
  const [selectedInspectors, setSelectedInspectors] = useState<string[]>([]);
  const [terrainMode, setTerrainMode] = useState(true);
  const [activeInspectorSession, setActiveInspectorSession] = useState<ActiveInspectorSession | null>(
    null
  );
  const [sessionCandidateInspectorId, setSessionCandidateInspectorId] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [dossierSearch, setDossierSearch] = useState("");
  const [selectedMapStyle, setSelectedMapStyle] = useState<MapStyleId>("clean");
  const [routeEnabled, setRouteEnabled] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationState>({
    nuts: true,
    aSign: false,
    gipod: false,
    antwerpenOpenData: false,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isCompactWorkspace, setIsCompactWorkspace] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1220px)").matches : false
  );
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1220px)").matches : false
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT_WIDTH);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastDataRefreshAt, setLastDataRefreshAt] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [vaststellingRecordsSnapshot, setVaststellingRecordsSnapshot] = useState<
    DNVaststellingRecord[]
  >([]);
  const [vaststellingSyncQueueSnapshot, setVaststellingSyncQueueSnapshot] = useState<
    DNVaststellingSyncItem[]
  >([]);
  const [pitchModeActive, setPitchModeActive] = useState(false);
  const [pitchModePaused, setPitchModePaused] = useState(false);
  const [pitchStepIndex, setPitchStepIndex] = useState(0);
  const [pitchStepStartedAtMs, setPitchStepStartedAtMs] = useState<number | null>(null);
  const [pitchTickMs, setPitchTickMs] = useState(() => Date.now());
  const [customPlatformExpansions, setCustomPlatformExpansions] = useState<
    PlatformExpansionProposal[]
  >(() => loadCustomPlatformExpansions());
  const [platformExpansionSchilFilter, setPlatformExpansionSchilFilter] =
    useState<PlatformSchilFilter>("Alle");
  const [expandedPlatformExpansionId, setExpandedPlatformExpansionId] = useState<string | null>(
    null
  );

  const syncLockRef = useRef(false);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const holidays = useMemo(
    () => (settings.holidays.length > 0 ? settings.holidays : HOLIDAYS),
    [settings.holidays]
  );
  const inspectors = useMemo(() => getConfiguredInspectors(settings), [settings]);
  const inspectorIds = useMemo(
    () => inspectors.map((inspector) => inspector.id),
    [inspectors]
  );
  const absentInspectorIds = useMemo(
    () => getAbsentInspectorIds(settings, selectedDate, inspectorIds),
    [inspectorIds, selectedDate, settings]
  );
  const inactiveInspectorIds = useMemo(
    () => getInactiveInspectorIds(settings, selectedDate, inspectorIds),
    [inspectorIds, selectedDate, settings]
  );
  const absentInspectorIdSet = useMemo(
    () => new Set(absentInspectorIds),
    [absentInspectorIds]
  );
  const inactiveInspectorIdSet = useMemo(
    () => new Set(inactiveInspectorIds),
    [inactiveInspectorIds]
  );
  const absentInspectorLabel = useMemo(
    () =>
      inspectors
        .filter((inspector) => absentInspectorIdSet.has(inspector.id))
        .map((inspector) => inspector.initials)
        .join(", "),
    [absentInspectorIdSet, inspectors]
  );
  const inactiveInspectorLabel = useMemo(
    () =>
      inspectors
        .filter((inspector) => inactiveInspectorIdSet.has(inspector.id))
        .map((inspector) => inspector.initials)
        .join(", "),
    [inactiveInspectorIdSet, inspectors]
  );
  const [stickyInspectorByWorkId, setStickyInspectorByWorkId] = useState<Record<string, string>>(
    () => loadContinuityInspectorMap(INSPECTORS.map((inspector) => inspector.id))
  );

  const refreshVaststellingSnapshots = useCallback(async () => {
    const [records, queue] = await Promise.all([
      loadDNVaststellingRecords(),
      loadDNVaststellingSyncQueue(),
    ]);
    setVaststellingRecordsSnapshot(records);
    setVaststellingSyncQueueSnapshot(queue);
  }, []);

  useEffect(() => {
    void refreshVaststellingSnapshots();

    const onStorageUpdated = () => {
      void refreshVaststellingSnapshots();
    };

    window.addEventListener(DN_VASTSTELLING_STORAGE_EVENT, onStorageUpdated);
    return () => window.removeEventListener(DN_VASTSTELLING_STORAGE_EVENT, onStorageUpdated);
  }, [refreshVaststellingSnapshots]);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      const loadedSession = await loadActiveInspectorSession(inspectors);
      if (cancelled) {
        return;
      }
      setActiveInspectorSession(loadedSession);
      if (!loadedSession && inspectors[0]) {
        setSessionCandidateInspectorId(inspectors[0].id);
        return;
      }
      if (loadedSession) {
        setSessionCandidateInspectorId(loadedSession.inspectorId);
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [inspectors]);

  useEffect(() => {
    if (!terrainMode || !activeInspectorSession) {
      return;
    }
    setSelectedInspectors([activeInspectorSession.inspectorId]);
  }, [activeInspectorSession, terrainMode]);

  useEffect(() => {
    saveCustomPlatformExpansions(customPlatformExpansions);
  }, [customPlatformExpansions]);

  const activateInspectorSession = useCallback(
    (inspectorId: string) => {
      const inspector = inspectors.find((item) => item.id === inspectorId);
      if (!inspector) {
        return;
      }
      const session = buildInspectorSession(inspector, getOrCreateDeviceId());
      void saveActiveInspectorSession(session);
      setActiveInspectorSession(session);
      setSessionCandidateInspectorId(session.inspectorId);
      if (terrainMode) {
        setSelectedInspectors([session.inspectorId]);
      }
      setSelectedVisitId(null);
    },
    [inspectors, terrainMode]
  );

  const deactivateInspectorSession = useCallback(() => {
    void clearActiveInspectorSession();
    setActiveInspectorSession(null);
    setSelectedVisitId(null);
    if (inspectors[0]) {
      setSessionCandidateInspectorId(inspectors[0].id);
    }
  }, [inspectors]);

  const resetDemoState = useCallback(async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Demo reset wist vaststellingen, sync-wachtrij en actieve sessie. Doorgaan?"
      );
      if (!confirmed) {
        return;
      }
    }

    await Promise.all([
      saveDNVaststellingRecords([]),
      saveDNVaststellingSyncQueue([]),
      saveDNVaststellingSyncSettings(DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS),
    ]);
    await clearActiveInspectorSession();

    setActiveInspectorSession(null);
    setSelectedVisitId(null);
    setSelectedInspectors([]);
    setTerrainMode(true);
    if (inspectors[0]) {
      setSessionCandidateInspectorId(inspectors[0].id);
    }

    setSyncError(null);
    setSyncMessage("Demo reset uitgevoerd: vaststellingen, wachtrij en sessie zijn leeggemaakt.");
    await refreshVaststellingSnapshots();
  }, [inspectors, refreshVaststellingSnapshots]);

  useEffect(() => {
    const loaded = loadContinuityInspectorMap(inspectorIds);
    setStickyInspectorByWorkId(loaded);
  }, [inspectorIds]);

  useEffect(() => {
    const adjusted = getNextWorkday(selectedDate, holidays);
    if (adjusted !== selectedDate) {
      setSelectedDate(adjusted);
    }
  }, [holidays, selectedDate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1220px)");
    const syncLayout = (matches: boolean) => {
      setIsCompactWorkspace(matches);
      setLeftPanelCollapsed(matches);
      if (matches) {
        setRightPanelCollapsed(false);
      }
    };

    syncLayout(mediaQuery.matches);

    const onMediaChange = (event: MediaQueryListEvent) => {
      syncLayout(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onMediaChange);
      return () => mediaQuery.removeEventListener("change", onMediaChange);
    }

    mediaQuery.addListener(onMediaChange);
    return () => mediaQuery.removeListener(onMediaChange);
  }, []);

  const refreshWorks = useCallback(async () => {
    const nextWorks = await fetchWorksData();
    let nextImpactProfiles = getFallbackImpactProfileMap();

    try {
      nextImpactProfiles = await fetchImpactProfileMap(IMPACT_DATA_URL);
    } catch (impactError) {
      console.warn("[dn-dispatch] impact data fallback actief", impactError);
    }

    setWorks(nextWorks);
    setImpactProfileByPostcode(nextImpactProfiles);
    setLastDataRefreshAt(new Date().toISOString());
    setSyncError(null);
  }, []);

  const runSync = useCallback(
    async (mode: "manual" | "auto" | "initial") => {
      if (mode !== "initial" && syncLockRef.current) {
        return;
      }

      if (mode !== "initial") {
        syncLockRef.current = true;
        setSyncRunning(true);
      }

      if (mode === "manual") {
        setSyncMessage("Synchronisatie gestart...");
        setSyncError(null);
      }

      try {
        let importExecuted = false;

        if (mode !== "initial") {
          try {
            const response = await fetch(SYNC_ENDPOINT, { method: "POST" });
            if (response.ok) {
              importExecuted = true;
            } else if (response.status !== 404) {
              const payload = (await response.json().catch(() => ({}))) as {
                error?: string;
              };
              throw new Error(payload.error ?? `Synchronisatie fout (${response.status}).`);
            }
          } catch (endpointError) {
            if (mode === "manual") {
              setSyncMessage(
                "Geen lokale synchronisatie-service gevonden. Enkel data-refresh uitgevoerd."
              );
            }
            if (mode === "auto") {
              console.warn("[dn-dispatch] auto-sync endpoint niet bereikbaar", endpointError);
            }
          }
        }

        await refreshWorks();

        if (mode !== "initial") {
          setLastSyncAt(new Date().toISOString());
          if (mode === "manual") {
            setSyncMessage(
              importExecuted
                ? "Brondata en impactprofielen gesynchroniseerd en data vernieuwd."
                : "Data vernieuwd."
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Synchronisatie mislukt.";
        setSyncError(message);
        if (mode !== "initial") {
          setLastSyncAt(new Date().toISOString());
          setSyncMessage("Synchronisatie mislukt.");
        }
      } finally {
        if (mode === "initial") {
          setDataLoading(false);
        } else {
          syncLockRef.current = false;
          setSyncRunning(false);
        }
      }
    },
    [refreshWorks]
  );

  useEffect(() => {
    void runSync("initial");
  }, [runSync]);

  useEffect(() => {
    if (!settings.autoSyncEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      void runSync("auto");
    }, settings.autoSyncIntervalMinutes * 60 * 1000);

    return () => window.clearInterval(timer);
  }, [runSync, settings.autoSyncEnabled, settings.autoSyncIntervalMinutes]);

  const districts = useMemo(
    () => [...new Set(works.map((work) => work.district))].sort((a, b) => a.localeCompare(b)),
    [works]
  );

  const postcodes = useMemo(
    () =>
      [...new Set(works.map((work) => work.postcode))].sort((a, b) =>
        a.localeCompare(b, "nl", { numeric: true })
      ),
    [works]
  );

  const sourceStatuses = useMemo(
    () =>
      [...new Set(works.map((work) => (work.sourceStatus ?? "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "nl")
      ),
    [works]
  );

  const gipodCategories = useMemo(
    () =>
      [
        ...new Set(
          works
            .map((work) => (work.gipodCategorie ?? "").trim())
            .filter((value) => value.length > 0)
        ),
      ].sort((a, b) => a.localeCompare(b, "nl")),
    [works]
  );

  const permitStatuses = useMemo(
    () =>
      [
        ...new Set(
          works
            .map((work) => (work.permitStatus ?? UNKNOWN_PERMIT_STATUS).trim())
            .filter((value) => value.length > 0)
        ),
      ].sort((a, b) => a.localeCompare(b, "nl")),
    [works]
  );

  useEffect(() => {
    setSelectedSourceStatuses((previous) => {
      const available = new Set(sourceStatuses);
      const cleaned = previous.filter((value) => available.has(value));
      if (cleaned.length > 0) {
        return cleaned;
      }
      if (sourceStatuses.includes(DEFAULT_GIPOD_SOURCE_STATUS)) {
        return [DEFAULT_GIPOD_SOURCE_STATUS];
      }
      return [...sourceStatuses];
    });
  }, [sourceStatuses]);

  useEffect(() => {
    setSelectedGipodCategories((previous) => {
      const available = new Set(gipodCategories);
      const cleaned = previous.filter((value) => available.has(value));
      if (cleaned.length > 0) {
        return cleaned;
      }
      return [...gipodCategories];
    });
  }, [gipodCategories]);

  useEffect(() => {
    setSelectedPermitStatuses((previous) => {
      const available = new Set(permitStatuses);
      const cleaned = previous.filter((value) => available.has(value));
      if (cleaned.length > 0) {
        return cleaned as GIPODPermitStatus[];
      }
      return permitStatuses as GIPODPermitStatus[];
    });
  }, [permitStatuses]);

  const dispatch = useMemo(
    () =>
      buildDispatchPlan({
        date: selectedDate,
        works,
        inspectors,
        holidays,
        statuses: selectedStatuses,
        sourceStatuses: selectedSourceStatuses,
        gipodCategories: selectedGipodCategories,
        permitStatuses: selectedPermitStatuses,
        districts: selectedDistricts,
        postcodes: selectedPostcodes,
        stickyInspectorByWorkId,
        unavailableInspectorIds: [...new Set([...absentInspectorIds, ...inactiveInspectorIds])],
        dispatchCapacity: settings.dispatchCapacity,
      }),
    [
      absentInspectorIds,
      inactiveInspectorIds,
      holidays,
      inspectors,
      selectedDate,
      selectedDistricts,
      selectedGipodCategories,
      selectedPostcodes,
      selectedPermitStatuses,
      selectedSourceStatuses,
      selectedStatuses,
      settings.dispatchCapacity,
      stickyInspectorByWorkId,
      works,
    ]
  );

  useEffect(() => {
    const { nextMap, added } = registerFirstAssignedInspectors(
      stickyInspectorByWorkId,
      dispatch.visitsByInspector,
      inspectorIds
    );

    if (added === 0) {
      return;
    }

    setStickyInspectorByWorkId(nextMap);
    saveContinuityInspectorMap(nextMap, inspectorIds);
  }, [dispatch.visitsByInspector, inspectorIds, stickyInspectorByWorkId]);

  const effectiveInspectorFilter = useMemo(() => selectedInspectors, [selectedInspectors]);
  const visibleInspectorIds = useMemo(
    () => new Set(effectiveInspectorFilter),
    [effectiveInspectorFilter]
  );
  const allDispatchVisits = useMemo(
    () => Object.values(dispatch.visitsByInspector).flat(),
    [dispatch.visitsByInspector]
  );
  const selectedDispatchVisit = useMemo(
    () => allDispatchVisits.find((visit) => visit.id === selectedVisitId) ?? null,
    [allDispatchVisits, selectedVisitId]
  );

  const impactByVisitId = useMemo(() => {
    const result: Record<string, { level: ImpactLevel | null; score: number | null }> = {};
    const visits = Object.values(dispatch.visitsByInspector).flat();

    for (const visit of visits) {
      const impact = computeImpactScore(impactProfileByPostcode[visit.work.postcode]);
      result[visit.id] = {
        level: impact ? impact.level : null,
        score: impact ? impact.score : null,
      };
    }

    return result;
  }, [dispatch.visitsByInspector, impactProfileByPostcode]);

  const filteredVisitsByInspector = useMemo(() => {
    const impactFilterActive = selectedImpactLevels.length < IMPACT_LEVEL_VALUES.length;

    return Object.fromEntries(
      Object.entries(dispatch.visitsByInspector).map(([inspectorId, visits]) => [
        inspectorId,
        visits.filter((visit) => {
          if (visibleInspectorIds.size > 0 && !visibleInspectorIds.has(inspectorId)) {
            return false;
          }

          if (!impactFilterActive) {
            return true;
          }

          const impactLevel = impactByVisitId[visit.id]?.level;
          if (!impactLevel) {
            return false;
          }

          return selectedImpactLevels.includes(impactLevel);
        }),
      ])
    );
  }, [dispatch.visitsByInspector, impactByVisitId, selectedImpactLevels, visibleInspectorIds]);

  const mapVisits = useMemo(
    () => Object.values(filteredVisitsByInspector).flat(),
    [filteredVisitsByInspector]
  );

  const routesByInspectorRaw = useMemo(
    () => computeRouteProposal(inspectors, filteredVisitsByInspector),
    [filteredVisitsByInspector, inspectors]
  );

  const routesByInspector = useMemo(() => {
    if (visibleInspectorIds.size === 0) {
      return routesByInspectorRaw;
    }
    return Object.fromEntries(
      Object.entries(routesByInspectorRaw).filter(([inspectorId]) =>
        visibleInspectorIds.has(inspectorId)
      )
    );
  }, [routesByInspectorRaw, visibleInspectorIds]);

  const routeOrderByVisitId = useMemo(
    () => buildRouteIndexMap(routesByInspector),
    [routesByInspector]
  );

  const filteredFollowUpCount = useMemo(
    () =>
      Object.entries(dispatch.followUpsByInspector)
        .filter(([inspectorId]) =>
          visibleInspectorIds.size === 0 ? true : visibleInspectorIds.has(inspectorId)
        )
        .reduce((sum, [, tasks]) => sum + tasks.length, 0),
    [dispatch.followUpsByInspector, visibleInspectorIds]
  );

  const activeIntegrationCount = Object.values(integrations).filter(Boolean).length;
  const selectedStyleUrl =
    MAP_STYLE_OPTIONS.find((style) => style.id === selectedMapStyle)?.url ??
    MAP_STYLE_OPTIONS[0].url;

  const dossierRows = useMemo(() => {
    const query = dossierSearch.trim().toLowerCase();
    const statusFilter = new Set(selectedStatuses);
    const sourceStatusFilter = new Set(selectedSourceStatuses);
    const categoryFilter = new Set(selectedGipodCategories);
    const permitStatusFilter = new Set(selectedPermitStatuses);

    const filtered = works.filter((work) => {
      if (!statusFilter.has(work.status)) {
        return false;
      }

      if (
        sourceStatusFilter.size > 0 &&
        !sourceStatusFilter.has((work.sourceStatus ?? "").trim())
      ) {
        return false;
      }
      if (
        categoryFilter.size > 0 &&
        !categoryFilter.has((work.gipodCategorie ?? UNKNOWN_GIPOD_CATEGORY).trim())
      ) {
        return false;
      }
      if (
        permitStatusFilter.size > 0 &&
        !permitStatusFilter.has((work.permitStatus ?? UNKNOWN_PERMIT_STATUS).trim() as GIPODPermitStatus)
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${work.dossierId} ${work.referentieId} ${work.gipodId} ${
        work.sourceStatus ?? ""
      } ${work.gipodCategorie ?? ""} ${work.permitStatus ?? ""} ${work.straat} ${
        work.postcode
      } ${work.district} ${work.nutsBedrijf}`.toLowerCase();
      return haystack.includes(query);
    });

    return filtered
      .slice()
      .sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return a.startDate.localeCompare(b.startDate);
        }
        return a.dossierId.localeCompare(b.dossierId);
      });
  }, [
    dossierSearch,
    selectedGipodCategories,
    selectedPermitStatuses,
    selectedSourceStatuses,
    selectedStatuses,
    works,
  ]);

  const contextWorks = useMemo(() => {
    const statusFilter = new Set(selectedStatuses);
    const sourceStatusFilter = new Set(selectedSourceStatuses);
    const categoryFilter = new Set(selectedGipodCategories);
    const permitStatusFilter = new Set(selectedPermitStatuses);
    const districtFilter = new Set(selectedDistricts);
    const postcodeFilter = new Set(selectedPostcodes);

    return works.filter((work) => {
      if (!statusFilter.has(work.status)) {
        return false;
      }
      if (
        sourceStatusFilter.size > 0 &&
        !sourceStatusFilter.has((work.sourceStatus ?? "").trim())
      ) {
        return false;
      }
      if (
        categoryFilter.size > 0 &&
        !categoryFilter.has((work.gipodCategorie ?? UNKNOWN_GIPOD_CATEGORY).trim())
      ) {
        return false;
      }
      if (
        permitStatusFilter.size > 0 &&
        !permitStatusFilter.has((work.permitStatus ?? UNKNOWN_PERMIT_STATUS).trim() as GIPODPermitStatus)
      ) {
        return false;
      }
      if (districtFilter.size > 0 && !districtFilter.has(work.district)) {
        return false;
      }
      if (postcodeFilter.size > 0 && !postcodeFilter.has(work.postcode)) {
        return false;
      }
      return true;
    });
  }, [
    selectedDistricts,
    selectedGipodCategories,
    selectedPermitStatuses,
    selectedPostcodes,
    selectedSourceStatuses,
    selectedStatuses,
    works,
  ]);

  const utilityCompanyOptions = useMemo(
    () =>
      [
        ...new Set(
          works.map((work) => (work.nutsBedrijf ?? "").trim()).filter((value) => value.length > 0)
        ),
      ].sort((a, b) => a.localeCompare(b, "nl")),
    [works]
  );

  const dashboardKpis = useMemo<KpiCard[]>(
    () =>
      buildDashboardKpis({
        selectedDate,
        contextWorks,
        mapVisits,
        dispatch,
        inspectors,
        visibleInspectorIds,
        filteredFollowUpCount,
      }),
    [
      selectedDate,
      contextWorks,
      mapVisits,
      dispatch,
      inspectors,
      visibleInspectorIds,
      filteredFollowUpCount,
    ]
  );

  const pitchKpis = useMemo<KpiCard[]>(
    () =>
      buildPitchKpis({
        terrainMode,
        activeInspectorSession,
        visibleInspectorIds,
        selectedDate,
        contextWorksCount: contextWorks.length,
        mapVisits,
        impactByVisitId,
        records: vaststellingRecordsSnapshot,
        syncQueue: vaststellingSyncQueueSnapshot,
      }),
    [
      terrainMode,
      activeInspectorSession,
      visibleInspectorIds,
      selectedDate,
      contextWorks.length,
      mapVisits,
      impactByVisitId,
      vaststellingRecordsSnapshot,
      vaststellingSyncQueueSnapshot,
    ]
  );

  const weekOverWeekTrendKpis = useMemo<TrendKpiCard[]>(
    () =>
      buildWeekOverWeekTrendKpis({
        terrainMode,
        activeInspectorSession,
        visibleInspectorIds,
        selectedDate,
        records: vaststellingRecordsSnapshot,
      }),
    [
      terrainMode,
      activeInspectorSession,
      visibleInspectorIds,
      selectedDate,
      vaststellingRecordsSnapshot,
    ]
  );

  const allPlatformExpansionProposals = useMemo(
    () => [...DEFAULT_PLATFORM_EXPANSIONS, ...customPlatformExpansions],
    [customPlatformExpansions]
  );

  const platformExpansionProposals = useMemo(
    () =>
      platformExpansionSchilFilter === "Alle"
        ? allPlatformExpansionProposals
        : allPlatformExpansionProposals.filter(
            (item) => item.schil === platformExpansionSchilFilter
          ),
    [allPlatformExpansionProposals, platformExpansionSchilFilter]
  );

  const platformExpansionSchilCounts = useMemo(() => {
    const counts: Record<PlatformSchilFilter, number> = {
      Alle: allPlatformExpansionProposals.length,
      "Schil 1": 0,
      "Schil 2": 0,
      "Schil 3": 0,
    };

    for (const item of allPlatformExpansionProposals) {
      if (item.schil === "Schil 1") {
        counts["Schil 1"] += 1;
      } else if (item.schil === "Schil 2") {
        counts["Schil 2"] += 1;
      } else if (item.schil === "Schil 3") {
        counts["Schil 3"] += 1;
      }
    }

    return counts;
  }, [allPlatformExpansionProposals]);

  useEffect(() => {
    if (!expandedPlatformExpansionId) {
      return;
    }

    if (!platformExpansionProposals.some((item) => item.id === expandedPlatformExpansionId)) {
      setExpandedPlatformExpansionId(null);
    }
  }, [expandedPlatformExpansionId, platformExpansionProposals]);

  const totalPitchDurationSeconds = useMemo(
    () => GUIDE_PITCH_PRESENTATION.reduce((total, step) => total + step.durationSeconds, 0),
    []
  );
  const normalizeMainView = useCallback(
    (view: MainViewKey): MainViewKey => (view === "kaart" ? "dispatch" : view),
    []
  );
  const effectiveActiveView = useMemo(
    () => normalizeMainView(activeView),
    [activeView, normalizeMainView]
  );

  const activePitchStep = useMemo(
    () => (pitchModeActive ? GUIDE_PITCH_PRESENTATION[pitchStepIndex] ?? null : null),
    [pitchModeActive, pitchStepIndex]
  );

  const activePitchTargetLabel = useMemo(() => {
    if (!activePitchStep) {
      return "";
    }
    const normalizedTargetView = normalizeMainView(activePitchStep.targetView);
    const navItem = MAIN_NAV_ITEMS.find((item) => item.key === normalizedTargetView);
    return navItem ? navItem.label : normalizedTargetView;
  }, [activePitchStep, normalizeMainView]);

  const pitchRemainingSeconds = useMemo(() => {
    if (!pitchModeActive || !activePitchStep || pitchStepStartedAtMs === null) {
      return null;
    }
    const elapsed = Math.floor((pitchTickMs - pitchStepStartedAtMs) / 1000);
    return Math.max(0, activePitchStep.durationSeconds - elapsed);
  }, [activePitchStep, pitchModeActive, pitchStepStartedAtMs, pitchTickMs]);

  const handleAddPlatformExpansion = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const titleInput = window.prompt("Titel van het nieuwe platformuitbreidingsvoorstel:");
    if (titleInput === null) {
      return;
    }

    const title = titleInput.trim();
    if (!title) {
      window.alert("Titel is verplicht.");
      return;
    }

    const descriptionInput = window.prompt(
      "Korte beschrijving (1-2 zinnen) voor dit voorstel:"
    );
    if (descriptionInput === null) {
      return;
    }

    const description =
      descriptionInput.trim() || "Nog te concretiseren in een volgende sprint.";

    const pxCodeInput = window.prompt(
      "Code (optioneel, bv. PX-15). Laat leeg voor vrije voorstelcode:"
    );
    if (pxCodeInput === null) {
      return;
    }
    const pxCode = pxCodeInput.trim() || undefined;

    const schilInput = window.prompt(
      "Schil (1, 2 of 3). Laat leeg voor 'Nog te bepalen':",
      "Nog te bepalen"
    );
    if (schilInput === null) {
      return;
    }
    const schil = parsePlatformSchil(schilInput);

    setCustomPlatformExpansions((previous) => [
      ...previous,
      {
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? `custom-${crypto.randomUUID()}`
            : `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        pxCode,
        title,
        description,
        schil,
        source: "custom",
      },
    ]);
    setSyncMessage(`Nieuw platformuitbreidingsvoorstel toegevoegd: ${title} (${schil}).`);
  }, []);

  useEffect(() => {
    if (!selectedVisitId) {
      return;
    }

    if (!mapVisits.some((visit) => visit.id === selectedVisitId)) {
      setSelectedVisitId(null);
    }
  }, [mapVisits, selectedVisitId]);

  const handleExportInspectorPdf = (inspectorId: string) => {
    const inspector = inspectors.find((item) => item.id === inspectorId);
    if (!inspector) {
      return;
    }

    exportInspectorPdf({
      inspector,
      dispatchDate: selectedDate,
      visits: dispatch.visitsByInspector[inspectorId] ?? [],
      followUps: dispatch.followUpsByInspector[inspectorId] ?? [],
      routeOrderByVisitId,
    });
  };

  const handleSaveSettings = (nextSettings: DispatchSettings) => {
    const sanitized = sanitizeDispatchSettings(nextSettings);
    setSettings(sanitized);
    saveDispatchSettings(sanitized);
    setSyncMessage("Instellingen opgeslagen.");
    setShowSettings(false);
  };

  const todayDispatchDate = useMemo(
    () => getNextWorkday(formatIsoDate(new Date()), holidays),
    [holidays]
  );

  const handleGoToNextWorkday = useCallback(() => {
    const nextCalendarDay = addDays(parseIsoDate(selectedDate), 1);
    setSelectedDate(getNextWorkday(formatIsoDate(nextCalendarDay), holidays));
  }, [holidays, selectedDate]);

  const handleGoToToday = useCallback(() => {
    setSelectedDate(todayDispatchDate);
  }, [todayDispatchDate]);

  const toggleRightPanel = useCallback(() => {
    setRightPanelCollapsed((previous) => !previous);
  }, []);

  const handleStartRightPanelResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isCompactWorkspace || rightPanelCollapsed) {
        return;
      }

      event.preventDefault();

      const updateWidth = (clientX: number) => {
        const workspaceRect = workspaceRef.current?.getBoundingClientRect();
        if (!workspaceRect) {
          return;
        }

        const rawWidth = workspaceRect.right - clientX;
        const nextWidth = Math.min(
          RIGHT_PANEL_MAX_WIDTH,
          Math.max(RIGHT_PANEL_MIN_WIDTH, Math.round(rawWidth))
        );
        setRightPanelWidth(nextWidth);
      };

      updateWidth(event.clientX);

      const onPointerMove = (moveEvent: PointerEvent) => {
        updateWidth(moveEvent.clientX);
      };

      const stopResize = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", stopResize);
        window.removeEventListener("pointercancel", stopResize);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopResize);
      window.addEventListener("pointercancel", stopResize);
    },
    [isCompactWorkspace, rightPanelCollapsed]
  );

  const startPitchMode = useCallback(() => {
    if (GUIDE_PITCH_PRESENTATION.length === 0) {
      return;
    }
    setPitchModeActive(true);
    setPitchModePaused(false);
    setPitchStepIndex(0);
    setPitchStepStartedAtMs(null);
    setPitchTickMs(Date.now());
    setSyncMessage("Pitchmodus gestart.");
  }, []);

  const stopPitchMode = useCallback(() => {
    setPitchModeActive(false);
    setPitchModePaused(false);
    setPitchStepStartedAtMs(null);
    setSyncMessage("Pitchmodus gestopt.");
  }, []);

  const togglePitchPause = useCallback(() => {
    setPitchModePaused((previous) => !previous);
    setPitchTickMs(Date.now());
  }, []);

  const goToPreviousPitchStep = useCallback(() => {
    setPitchStepIndex((previous) => Math.max(0, previous - 1));
  }, []);

  const goToNextPitchStep = useCallback(() => {
    setPitchStepIndex((previous) =>
      Math.min(previous + 1, GUIDE_PITCH_PRESENTATION.length - 1)
    );
  }, []);

  useEffect(() => {
    if (!pitchModeActive) {
      return;
    }

    const step = GUIDE_PITCH_PRESENTATION[pitchStepIndex];
    if (!step) {
      setPitchModeActive(false);
      setPitchModePaused(false);
      setPitchStepStartedAtMs(null);
      return;
    }

    setActiveView(normalizeMainView(step.targetView));
    const now = Date.now();
    setPitchStepStartedAtMs(now);
    setPitchTickMs(now);
  }, [normalizeMainView, pitchModeActive, pitchStepIndex]);

  useEffect(() => {
    if (!pitchModeActive || pitchModePaused || pitchStepStartedAtMs === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setPitchTickMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pitchModeActive, pitchModePaused, pitchStepStartedAtMs]);

  useEffect(() => {
    if (!pitchModeActive || pitchModePaused || pitchStepStartedAtMs === null) {
      return;
    }

    const step = GUIDE_PITCH_PRESENTATION[pitchStepIndex];
    if (!step) {
      return;
    }

    const elapsed = Math.floor((pitchTickMs - pitchStepStartedAtMs) / 1000);
    if (elapsed < step.durationSeconds) {
      return;
    }

    if (pitchStepIndex >= GUIDE_PITCH_PRESENTATION.length - 1) {
      setPitchModeActive(false);
      setPitchModePaused(false);
      setPitchStepStartedAtMs(null);
      setSyncMessage("Pitchmodus afgerond.");
      return;
    }

    setPitchStepIndex((previous) =>
      Math.min(previous + 1, GUIDE_PITCH_PRESENTATION.length - 1)
    );
  }, [pitchModeActive, pitchModePaused, pitchStepIndex, pitchStepStartedAtMs, pitchTickMs]);

  const renderRoadmapView = (title: string, subtitle: string, focusPoints: string[]) => (
    <main className="view-shell">
      <section className="view-card">
        <h2>{title}</h2>
        <p className="view-subtitle">{subtitle}</p>
        <p className="view-subtitle">
          Deze module is voorbereid in de navigatie en volgt in een volgende iteratie.
        </p>
      </section>

      <section className="view-card">
        <h3>Focuspunten</h3>
        <div className="roadmap-list">
          {focusPoints.map((item) => (
            <article key={item} className="roadmap-item">
              <strong>{item}</strong>
              <p>Voorzien als uitbreidbare component binnen de Digitale Nuts App.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );

  const renderGuideView = () => (
    <main className="view-shell">
      <section className="view-card">
        <h2>DN Handleiding</h2>
        <p className="view-subtitle">{GUIDE_INTRO}</p>
        <p className="muted-note">Laatste update handleiding: {GUIDE_LAST_UPDATED}</p>
        <div className="quick-actions">
          <button type="button" className="secondary-btn" onClick={() => setActiveView("dispatch")}>
            Open DN Dispatch
          </button>
          <button type="button" className="secondary-btn" onClick={() => setActiveView("dispatch")}>
            Open kaart in DN Dispatch
          </button>
          <button type="button" className="secondary-btn" onClick={() => setActiveView("data-sync")}>
            Open DN Data & Sync
          </button>
        </div>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details" open>
          <summary>Quick Guide Voor Beginners</summary>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_QUICK_STEPS.map((step) => (
              <article key={step.title} className="roadmap-item guide-step guide-card">
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>Q&A</summary>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_FAQ.map((item) => (
              <article key={item.question} className="roadmap-item guide-card">
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>DN Vaststelling - Handover & Sync Center</summary>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_VASTSTELLING_HANDOVER_SYNC.map((item) => (
              <article key={item.term} className="roadmap-item guide-card">
                <strong>{item.term}</strong>
                <p>{item.explanation}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>KPI-definities (formeel v1)</summary>
          <p className="muted-note">v1 indicatief, geen beleidsrapportering.</p>
          <p className="muted-note">{KPI_REGISTER_SYNC_NOTE}</p>
          <div className="guide-grid guide-grid-unified">
            {KPI_DEFINITIONS.map((item) => (
              <article key={item.kpi} className="roadmap-item guide-card">
                <strong>{item.kpi}</strong>
                <p>
                  <span className="guide-card-label">Status:</span> {item.status}
                </p>
                <p>
                  <span className="guide-card-label">Formule:</span> {item.formula}
                </p>
                <p>
                  <span className="guide-card-label">Bron:</span> {item.source}
                </p>
                <p>
                  <span className="guide-card-label">Beperking:</span> {item.limitation}
                </p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>KPI-definitiebacklog (volgens laatste MD)</summary>
          <p className="muted-note">
            Prioritaire KPI's die operationeel bestaan of gepland zijn, maar nog formele definitie nodig hebben.
          </p>
          <div className="guide-grid guide-grid-unified">
            {KPI_DEFINITION_BACKLOG.map((item) => (
              <article key={item.kpiKey} className="roadmap-item guide-card">
                <strong>{item.kpiKey}</strong>
                <p>
                  <span className="guide-card-label">Status:</span> {item.status}
                </p>
                <p>
                  <span className="guide-card-label">Volgende stap:</span> {item.nextAction}
                </p>
                <p>
                  <span className="guide-card-label">Referentie:</span> {item.reference}
                </p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>Pitchpresentatie Opbouw</summary>
          <p className="view-subtitle">
            Praktisch script voor een projectteam-pitch van ongeveer{" "}
            {Math.round(totalPitchDurationSeconds / 60)} minuten.
          </p>
          <div className="quick-actions">
            <button type="button" className="secondary-btn" onClick={startPitchMode}>
              Start pitchmodus
            </button>
            {pitchModeActive ? (
              <button type="button" className="chip" onClick={togglePitchPause}>
                {pitchModePaused ? "Hervat pitchmodus" : "Pauzeer pitchmodus"}
              </button>
            ) : null}
            {pitchModeActive ? (
              <button type="button" className="chip" onClick={stopPitchMode}>
                Stop pitchmodus
              </button>
            ) : null}
          </div>
          {pitchModeActive && activePitchStep ? (
            <p className="muted-note">
              Actieve stap: {pitchStepIndex + 1}/{GUIDE_PITCH_PRESENTATION.length} -{" "}
              {activePitchStep.focus}
            </p>
          ) : null}
          <div className="guide-grid guide-grid-unified">
            {GUIDE_PITCH_PRESENTATION.map((step) => (
              <article key={`${step.timebox}-${step.focus}`} className="roadmap-item guide-card">
                <strong>{step.timebox}</strong>
                <p>
                  <span className="guide-card-label">Focus:</span> {step.focus}
                </p>
                <p>
                  <span className="guide-card-label">Live demo:</span> {step.liveDemoAction}
                </p>
                <p>
                  <span className="guide-card-label">Kernboodschap:</span> {step.coreMessage}
                </p>
              </article>
            ))}
          </div>
          <p className="muted-note">Pitch-checklist</p>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_PITCH_CHECKLIST.map((item) => (
              <article key={item} className="roadmap-item guide-card">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>Demo Script - Dag In Het Leven</summary>
          <p className="view-subtitle">
            Klikscript per minuutblok voor een stabiele demo van ongeveer 9 minuten.
          </p>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_DEMO_SCRIPT_DAG_IN_HET_LEVEN.map((step) => (
              <article key={step.minuteWindow} className="roadmap-item guide-card">
                <strong>{step.minuteWindow}</strong>
                <p>
                  <span className="guide-card-label">Doel:</span> {step.goal}
                </p>
                <p>
                  <span className="guide-card-label">Scherm:</span> {step.screen}
                </p>
                <p>
                  <span className="guide-card-label">Kernboodschap:</span> {step.coreMessage}
                </p>
                <p>
                  <span className="guide-card-label">Fallback:</span> {step.fallback}
                </p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>Quick Guides Per Rol</summary>
          <p className="view-subtitle">
            Korte operationele handleiding voor Toezichter, Dispatcher en Projectleider.
          </p>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_ROLE_QUICK_GUIDES.map((guide) => (
              <article key={guide.role} className="roadmap-item guide-role-card guide-card">
                <strong>{guide.role}</strong>
                <p>{guide.purpose}</p>
                <p className="muted-note">Snelstart</p>
                <ol className="guide-role-list">
                  {guide.quickStart.map((item) => (
                    <li key={`${guide.role}-quick-${item}`}>{item}</li>
                  ))}
                </ol>
                <p className="muted-note">5 meest gemaakte fouten</p>
                <ol className="guide-role-list">
                  {guide.commonMistakes.map((item) => (
                    <li key={`${guide.role}-mistake-${item}`}>{item}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section className="view-card guide-chapter">
        <details className="guide-chapter-details">
          <summary>Praktische Tips</summary>
          <div className="guide-grid guide-grid-unified">
            {GUIDE_TIPS.map((tip) => (
              <article key={tip} className="roadmap-item guide-card">
                <p>{tip}</p>
              </article>
            ))}
          </div>
        </details>
      </section>
    </main>
  );

  const activeMainNavItem =
    MAIN_NAV_ITEMS.find((item) => item.key === effectiveActiveView) ?? MAIN_NAV_ITEMS[0];
  const requiresInspectorSession = !activeInspectorSession;

  return (
    <div className="app-shell">
      <header className="top-hero compact">
        <div className="hero-brand">
          <img src="/dn-dispatch-logo.svg" alt="DN Dispatch logo" className="hero-logo" />
          <div>
            <p className="eyebrow">Digitale Nuts</p>
            <h1>{activeMainNavItem.label}</h1>
            <p className="subtitle">
              Alleen projecten met actie op de gekozen datum. Klik op een fiche om de exacte locatie op de kaart
              te markeren.
            </p>
            <p className="subtitle">
              Actieve toezichter:{" "}
              {activeInspectorSession
                ? `${activeInspectorSession.inspectorName} (${activeInspectorSession.inspectorInitials})`
                : "niet ingesteld"}
            </p>
          </div>
        </div>

        <div className="stats-row compact">
          <article>
            <span className="stat-label">Actiewerven</span>
            <strong>{mapVisits.length}</strong>
          </article>
          <article>
            <span className="stat-label">Verplicht</span>
            <strong>{dispatch.totals.mandatoryVisits}</strong>
          </article>
          <article>
            <span className="stat-label">Follow-up</span>
            <strong>{filteredFollowUpCount}</strong>
          </article>
          <article>
            <span className="stat-label">Niet toegewezen</span>
            <strong>{dispatch.unassigned.length}</strong>
          </article>
        </div>
      </header>

      <nav className="main-nav">
        {MAIN_NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`main-nav-item ${effectiveActiveView === item.key ? "active" : ""}`}
            onClick={() => setActiveView(item.key)}
            title={item.summary}
          >
            <span>{item.label}</span>
            <small>{item.status === "live" ? "Live" : "Roadmap"}</small>
          </button>
        ))}
      </nav>

      {effectiveActiveView === "dispatch" ? (
      <main
        ref={workspaceRef}
        className={`workspace-grid ${rightPanelCollapsed ? "right-panel-collapsed" : ""}`}
        style={
          { "--right-panel-width": `${rightPanelCollapsed ? 0 : rightPanelWidth}px` } as CSSProperties
        }
      >
        <aside className={`side-panel left-panel ${leftPanelCollapsed ? "collapsed" : ""}`}>
          <div className="panel-collapse-head">
            <p className="group-title">Instellingen</p>
            {isCompactWorkspace ? (
              <button
                type="button"
                className="chip panel-toggle-btn"
                onClick={() => setLeftPanelCollapsed((previous) => !previous)}
                aria-expanded={!leftPanelCollapsed}
              >
                {leftPanelCollapsed ? "Open paneel" : "Inklappen"}
              </button>
            ) : null}
          </div>

          <div className="panel-collapse-body">
          <section className="filter-group">
            <div className="group-head-row">
              <p className="group-title">Synchronisatie</p>
              <button type="button" className="chip" onClick={() => setShowSettings(true)}>
                Instellingen
              </button>
            </div>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => void runSync("manual")}
              disabled={syncRunning}
            >
              {syncRunning ? "Synchronisatie bezig..." : "Synchroniseer nu"}
            </button>
            <label className="toggle-inline">
              <input
                type="checkbox"
                checked={settings.autoSyncEnabled}
                onChange={(event) => {
                  const nextSettings = sanitizeDispatchSettings({
                    ...settings,
                    autoSyncEnabled: event.target.checked,
                  });
                  setSettings(nextSettings);
                  saveDispatchSettings(nextSettings);
                }}
              />
              Automatisch elke {settings.autoSyncIntervalMinutes} min
            </label>
            <p className="muted-note">Laatste sync: {formatDateTime(lastSyncAt)}</p>
            <p className="muted-note">Laatste data-refresh: {formatDateTime(lastDataRefreshAt)}</p>
            {dataLoading ? <p className="muted-note">Data laden...</p> : null}
            {syncMessage && syncMessage !== syncError ? (
              <p className="muted-note">{syncMessage}</p>
            ) : null}
            {syncError ? <p className="warning-inline">{syncError}</p> : null}
          </section>

          <section className="filter-group">
            <label htmlFor="dispatch-date">Datum</label>
            <input
              id="dispatch-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <div className="date-action-row">
              <button
                type="button"
                className="secondary-btn grow-btn"
                onClick={handleGoToNextWorkday}
              >
                Naar volgende werkdag
              </button>
              {selectedDate !== todayDispatchDate ? (
                <button
                  type="button"
                  className="secondary-btn compact-btn"
                  onClick={handleGoToToday}
                >
                  Terug naar vandaag
                </button>
              ) : null}
            </div>
            {!dispatch.isWorkday ? (
              <p className="warning-inline">
                Geen terreinacties op weekend/feestdag. Kies een werkdag voor dispatch.
              </p>
            ) : null}
          </section>

          <section className="filter-group">
            <p className="group-title">Basemap stijl</p>
            <div className="chip-wrap">
              {MAP_STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={selectedMapStyle === style.id ? "chip active" : "chip"}
                  onClick={() => setSelectedMapStyle(style.id)}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <label className="toggle-inline">
              <input
                type="checkbox"
                checked={routeEnabled}
                onChange={(event) => setRouteEnabled(event.target.checked)}
              />
              Routevoorstel tonen
            </label>
          </section>

          <section className="filter-group">
            <p className="group-title">Statusfilter</p>
            <div className="chip-wrap">
              {STATUS_VALUES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={selectedStatuses.includes(status) ? "chip active" : "chip"}
                  onClick={() =>
                    setSelectedStatuses((previous) =>
                      previous.includes(status)
                        ? previous.filter((item) => item !== status)
                        : [...previous, status]
                    )
                  }
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-group">
            <p className="group-title">GIPOD fase</p>
            <div className="chip-wrap scrollable">
              {sourceStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={selectedSourceStatuses.includes(status) ? "chip active" : "chip"}
                  onClick={() =>
                    setSelectedSourceStatuses((previous) =>
                      previous.includes(status)
                        ? previous.filter((item) => item !== status)
                        : [...previous, status]
                    )
                  }
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="muted-note">Standaard op "In uitvoering" bij eerste dataload.</p>
          </section>

          <section className="filter-group">
            <p className="group-title">Categorie GW</p>
            <div className="chip-wrap scrollable">
              {gipodCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={selectedGipodCategories.includes(category) ? "chip active" : "chip"}
                  onClick={() =>
                    setSelectedGipodCategories((previous) =>
                      previous.includes(category)
                        ? previous.filter((item) => item !== category)
                        : [...previous, category]
                    )
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-group">
            <p className="group-title">Vergunningstatus</p>
            <div className="chip-wrap scrollable">
              {permitStatuses.map((permitStatus) => (
                <button
                  key={permitStatus}
                  type="button"
                  className={selectedPermitStatuses.includes(permitStatus as GIPODPermitStatus) ? "chip active" : "chip"}
                  onClick={() =>
                    setSelectedPermitStatuses((previous) =>
                      previous.includes(permitStatus as GIPODPermitStatus)
                        ? previous.filter((item) => item !== permitStatus)
                        : [...previous, permitStatus as GIPODPermitStatus]
                    )
                  }
                >
                  {permitStatus}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-group">
            <p className="group-title">Impactfilter</p>
            <div className="chip-wrap">
              {IMPACT_LEVEL_VALUES.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={selectedImpactLevels.includes(level) ? "chip active" : "chip"}
                  onClick={() =>
                    setSelectedImpactLevels((previous) => {
                      const next = toggleArrayItem(previous, level) as ImpactLevel[];
                      return next.length === 0 ? [...IMPACT_LEVEL_VALUES] : next;
                    })
                  }
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="muted-note">Filtert action cards en kaartpins op impactniveau.</p>
          </section>

          <section className="filter-group">
            <p className="group-title">Contextfilters</p>
            <p className="group-subtitle">District</p>
            <div className="chip-wrap scrollable">
              {districts.map((district) => (
                <button
                  key={district}
                  type="button"
                  className={selectedDistricts.includes(district) ? "chip active" : "chip"}
                  onClick={() => setSelectedDistricts((previous) => toggleArrayItem(previous, district))}
                >
                  {district}
                </button>
              ))}
            </div>
            <p className="group-subtitle">Postcode</p>
            <div className="chip-wrap scrollable">
              {postcodes.map((postcode) => (
                <button
                  key={postcode}
                  type="button"
                  className={selectedPostcodes.includes(postcode) ? "chip active" : "chip"}
                  onClick={() => setSelectedPostcodes((previous) => toggleArrayItem(previous, postcode))}
                >
                  {postcode}
                </button>
              ))}
            </div>
          </section>

          <section className="filter-group">
            <p className="group-title">Toezichters</p>
            {absentInspectorIds.length > 0 ? (
              <p className="warning-inline">
                Afwezig op {selectedDate}: {absentInspectorLabel}
              </p>
            ) : null}
            {inactiveInspectorIds.length > 0 ? (
              <p className="warning-inline">
                Niet inzetbaar op {selectedDate} (buiten actieve termijn): {inactiveInspectorLabel}
              </p>
            ) : null}
            {terrainMode ? (
              <p className="muted-note">
                Terrainmodus actief: filter vast op{" "}
                {activeInspectorSession?.inspectorName || "actieve toezichter"}.
              </p>
            ) : null}
            <div className="chip-wrap">
              {inspectors.map((inspector) => (
                <button
                  key={inspector.id}
                  type="button"
                  className={effectiveInspectorFilter.includes(inspector.id) ? "chip active" : "chip"}
                  onClick={() =>
                    setSelectedInspectors((previous) => toggleArrayItem(previous, inspector.id))
                  }
                  title={
                    absentInspectorIdSet.has(inspector.id)
                      ? `${inspector.name} (afwezig op ${selectedDate})`
                      : inactiveInspectorIdSet.has(inspector.id)
                        ? `${inspector.name} (niet inzetbaar op ${selectedDate})`
                      : inspector.name
                  }
                >
                  {inspector.initials}
                  {inspector.isReserve ? " [R]" : ""}
                  {absentInspectorIdSet.has(inspector.id) ? " (afw)" : ""}
                  {inactiveInspectorIdSet.has(inspector.id) ? " (niet actief)" : ""}
                </button>
              ))}
            </div>
            <div className="quick-actions">
              <button type="button" className="chip" onClick={() => setSelectedInspectors([])}>
                Leegmaken
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => setSelectedInspectors(inspectors.map((inspector) => inspector.id))}
              >
                Alles selecteren
              </button>
            </div>
          </section>

          <section className="filter-group">
            <p className="group-title">Terreinmodus</p>
            <label className="toggle-inline">
              <input
                type="checkbox"
                checked={terrainMode}
                onChange={(event) => setTerrainMode(event.target.checked)}
              />
              Focus op actieve toezichter
            </label>
            {activeInspectorSession ? (
              <p className="muted-note">
                Actieve sessie: {activeInspectorSession.inspectorName} ({activeInspectorSession.inspectorInitials})
              </p>
            ) : (
              <p className="warning-inline">Geen actieve toezichter geselecteerd.</p>
            )}
            <div className="quick-actions">
              <button type="button" className="secondary-btn" onClick={deactivateInspectorSession}>
                Wijzig actieve toezichter
              </button>
            </div>
          </section>

          <section className="filter-group">
            <p className="group-title">Bronkoppelingen (toggle)</p>
            <div className="toggle-list">
              <label>
                <input
                  type="checkbox"
                  checked={integrations.nuts}
                  onChange={(event) =>
                    setIntegrations((prev) => ({ ...prev, nuts: event.target.checked }))
                  }
                />
                Nuts basisdata
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={integrations.aSign}
                  onChange={(event) =>
                    setIntegrations((prev) => ({ ...prev, aSign: event.target.checked }))
                  }
                />
                A-SIGN
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={integrations.gipod}
                  onChange={(event) =>
                    setIntegrations((prev) => ({ ...prev, gipod: event.target.checked }))
                  }
                />
                GIPOD
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={integrations.antwerpenOpenData}
                  onChange={(event) =>
                    setIntegrations((prev) => ({
                      ...prev,
                      antwerpenOpenData: event.target.checked,
                    }))
                  }
                />
                Antwerpen Open Data
              </label>
            </div>
            <p className="muted-note">{activeIntegrationCount} bron(nen) actief in deze view.</p>
          </section>
          </div>
        </aside>

        <section className="map-panel">
          {rightPanelCollapsed ? (
            <button
              type="button"
              className="map-right-panel-open-btn"
              onClick={toggleRightPanel}
            >
              Toon action cards
            </button>
          ) : null}
          {!isCompactWorkspace && !rightPanelCollapsed ? (
            <div
              className="right-panel-resize-handle"
              onPointerDown={handleStartRightPanelResize}
              title="Sleep om de rechterkolom breder of smaller te maken"
              role="separator"
              aria-orientation="vertical"
              aria-label="Breedte action cards"
            />
          ) : null}
          <Suspense fallback={<div className="filter-group">Kaart laden...</div>}>
            <MapPanel
              works={works}
              visits={mapVisits}
              selectedVisitId={selectedVisitId}
              onSelectVisit={setSelectedVisitId}
              mapStyleUrl={selectedStyleUrl}
              routesByInspector={routesByInspector}
              routeOrderByVisitId={routeOrderByVisitId}
              routeEnabled={routeEnabled}
              selectedDate={selectedDate}
              impactProfileByPostcode={impactProfileByPostcode}
            />
          </Suspense>
        </section>

        <aside className={`side-panel right-panel ${rightPanelCollapsed ? "collapsed" : ""}`}>
          {rightPanelCollapsed ? null : (
            <>
              <div className="panel-head sticky-head panel-head-row">
                <div>
                  <h2>Action cards per toezichter</h2>
                  <p>Klik fiche voor kaartfocus. Exporteer per toezichter naar PDF.</p>
                </div>
                <button type="button" className="chip" onClick={toggleRightPanel}>
                  Kaart full view
                </button>
              </div>

              {dispatch.unassigned.length > 0 ? (
                <div className="alert-box">
                  <strong>Niet toegewezen actiepunten</strong>
                  <p>
                    {dispatch.unassigned.slice(0, 6).map((visit) => visit.work.dossierId).join(", ")}
                    {dispatch.unassigned.length > 6 ? " ..." : ""}
                  </p>
                </div>
              ) : null}

              <Suspense fallback={<div className="filter-group">Action cards laden...</div>}>
                <InspectorBoard
                  inspectors={inspectors}
                  visitsByInspector={filteredVisitsByInspector}
                  followUpsByInspector={dispatch.followUpsByInspector}
                  preferredInspectorByWorkId={dispatch.preferredInspectorByWorkId}
                  visibleInspectorIds={visibleInspectorIds}
                  absentInspectorIds={absentInspectorIdSet}
                  inactiveInspectorIds={inactiveInspectorIdSet}
                  selectedDate={selectedDate}
                  impactByVisitId={impactByVisitId}
                  selectedVisitId={selectedVisitId}
                  onSelectVisit={setSelectedVisitId}
                  onExportInspectorPdf={handleExportInspectorPdf}
                />
              </Suspense>
            </>
          )}
        </aside>
      </main>
      ) : effectiveActiveView === "dashboard" ? (
        <main className="view-shell">
          <section className="view-card">
            <h2>KPI-overzicht dashboard</h2>
            <p className="view-subtitle">
              Alle operationele KPI's uit de huidige dataflow. Gebruik filters links om context te verfijnen.
            </p>
          </section>
          <section className="view-card">
            <h3>KPI-paneel v1 (Pitch)</h3>
            <p className="view-subtitle">
              Kerncijfers voor projectteamdemo: scope, vaststellingen, contextkwaliteit, handover, queue en topprioriteiten.
            </p>
            <div className="view-grid dashboard-kpi-grid">
              {pitchKpis.map((kpi) => (
                <article
                  key={kpi.key}
                  className="view-card stat-card dashboard-kpi-card"
                  title={kpi.definition ?? kpi.detail}
                >
                  <span className="stat-label">{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <p className="dashboard-kpi-meta">{kpi.detail}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="view-card">
            <h3>Trend week op week</h3>
            <p className="view-subtitle">
              Vergelijking van huidige week met vorige week op output, kwaliteit en opvolging.
            </p>
            <div className="view-grid dashboard-kpi-grid">
              {weekOverWeekTrendKpis.map((kpi) => (
                <article
                  key={kpi.key}
                  className="view-card stat-card dashboard-kpi-card"
                  title={kpi.definition ?? kpi.detail}
                >
                  <span className="stat-label">{kpi.label}</span>
                  <strong>{kpi.currentValue}</strong>
                  <p className="dashboard-kpi-meta">Vorige week: {kpi.previousValue}</p>
                  <p className={`dashboard-kpi-meta trend-delta trend-${kpi.tone}`}>
                    Delta: {kpi.deltaValue}
                  </p>
                  <p className="dashboard-kpi-meta">{kpi.detail}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="view-card">
            <h3>Aanvullende operationele KPI's</h3>
            <p className="view-subtitle">
              Detailmonitoring voor dispatchwerking en capaciteitsverdeling.
            </p>
          </section>
          <section className="view-grid dashboard-kpi-grid">
            {dashboardKpis.map((kpi) => (
              <article
                key={kpi.key}
                className="view-card stat-card dashboard-kpi-card"
                title={kpi.definition ?? kpi.detail}
              >
                <span className="stat-label">{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <p className="dashboard-kpi-meta">{kpi.detail}</p>
              </article>
            ))}
          </section>
          <section className="view-card">
            <h2>Snelle navigatie</h2>
            <p className="view-subtitle">Spring direct naar de operationele kernschermen.</p>
            <div className="quick-actions">
              <button type="button" className="secondary-btn" onClick={() => setActiveView("dispatch")}>
                Open Dispatch + Kaart
              </button>
              <button type="button" className="secondary-btn" onClick={() => setActiveView("dispatch")}>
                Open Dispatch
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setActiveView("vaststelling")}
              >
                Open DN Vaststelling
              </button>
              <button type="button" className="secondary-btn" onClick={() => setActiveView("dossiers")}>
                Open Dossiers
              </button>
            </div>
          </section>
        </main>
      ) : effectiveActiveView === "dossiers" ? (
        <main className="view-shell">
          <section className="view-card">
            <h2>Dossiers</h2>
            <p className="view-subtitle">Filterbare lijst als basis voor dossierbeheer en koppelingen.</p>
            <div className="view-toolbar">
              <input
                type="search"
                value={dossierSearch}
                onChange={(event) => setDossierSearch(event.target.value)}
                placeholder="Zoek op dossier, straat, referentie of GIPOD..."
              />
              <span className="muted-note">{dossierRows.length} dossiers</span>
            </div>
            <div className="table-scroll">
              <table className="dossier-table">
                <thead>
                  <tr>
                    <th>Dossier</th>
                    <th>Status</th>
                    <th>GIPOD fase</th>
                    <th>Categorie</th>
                    <th>Vergunning</th>
                    <th>Start</th>
                    <th>Einde</th>
                    <th>Locatie</th>
                    <th>Nutsbedrijf</th>
                  </tr>
                </thead>
                <tbody>
                  {dossierRows.slice(0, 250).map((work) => (
                    <tr key={work.id}>
                      <td>{work.dossierId}</td>
                      <td>{work.status}</td>
                      <td>{work.sourceStatus || "-"}</td>
                      <td>{work.gipodCategorie || "-"}</td>
                      <td>{work.permitStatus || UNKNOWN_PERMIT_STATUS}</td>
                      <td>{work.startDate}</td>
                      <td>{work.endDate}</td>
                      <td>
                        {work.straat} {work.huisnr}, {work.postcode}
                      </td>
                      <td>{work.nutsBedrijf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      ) : effectiveActiveView === "vaststelling" ? (
        <VaststellingView
          inspectors={inspectors}
          selectedDate={selectedDate}
          visitsByInspector={dispatch.visitsByInspector}
          utilityCompanyOptions={utilityCompanyOptions}
          selectedVisit={selectedDispatchVisit}
          onSelectVisit={setSelectedVisitId}
          activeSession={activeInspectorSession}
          onSwitchSession={activateInspectorSession}
          onDemoReset={() => void resetDemoState()}
        />
      ) : effectiveActiveView === "data-sync" ? (
        <main className="view-shell">
          <section className="view-card">
            <h2>Data & Sync</h2>
            <p className="view-subtitle">Monitoring van databronnen en synchronisatie.</p>
            <div className="quick-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => void runSync("manual")}
                disabled={syncRunning}
              >
                {syncRunning ? "Synchronisatie bezig..." : "Synchroniseer nu"}
              </button>
              <button type="button" className="secondary-btn" onClick={() => void resetDemoState()}>
                Demo reset
              </button>
              <button type="button" className="secondary-btn" onClick={() => setActiveView("dispatch")}>
                Terug naar Dispatch
              </button>
            </div>
            <p className="muted-note">Laatste sync: {formatDateTime(lastSyncAt)}</p>
            <p className="muted-note">Laatste data-refresh: {formatDateTime(lastDataRefreshAt)}</p>
            {syncError ? <p className="warning-inline">{syncError}</p> : null}
          </section>
          <section className="view-card">
            <h3>Koppelingen</h3>
            <p className="view-subtitle">{activeIntegrationCount} bronnen actief in deze sessie.</p>
            <div className="toggle-list">
              <label>
                <input type="checkbox" checked={integrations.nuts} disabled />
                Nuts basisdata
              </label>
              <label>
                <input type="checkbox" checked={integrations.aSign} disabled />
                A-SIGN
              </label>
              <label>
                <input type="checkbox" checked={integrations.gipod} disabled />
                GIPOD
              </label>
              <label>
                <input type="checkbox" checked={integrations.antwerpenOpenData} disabled />
                Antwerpen Open Data
              </label>
            </div>
          </section>
        </main>
      ) : effectiveActiveView === "handleiding" ? (
        renderGuideView()
      ) : effectiveActiveView === "instellingen" ? (
        <main className="view-shell">
          <section className="view-card">
            <h2>Instellingen</h2>
            <p className="view-subtitle">Configuratie voor toezichters, vakanties en syncgedrag.</p>
            <div className="quick-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowSettings(true)}>
                Open instellingenvenster
              </button>
            </div>
            <p className="muted-note">Toezichters: {inspectors.length}</p>
            <p className="muted-note">
              Reservetoezichters: {inspectors.filter((inspector) => inspector.isReserve).length}
            </p>
            <p className="muted-note">
              Extra toegevoegd: {settings.customInspectors.length}
            </p>
            <p className="muted-note">Vakantiedagen: {holidays.length}</p>
            <p className="muted-note">
              Afwezig op {selectedDate}: {absentInspectorIds.length}
              {absentInspectorIds.length > 0 ? ` (${absentInspectorLabel})` : ""}
            </p>
            <p className="muted-note">
              Niet inzetbaar op {selectedDate}: {inactiveInspectorIds.length}
              {inactiveInspectorIds.length > 0 ? ` (${inactiveInspectorLabel})` : ""}
            </p>
            <p className="muted-note">
              Auto-sync: {settings.autoSyncEnabled ? "actief" : "uit"} ({settings.autoSyncIntervalMinutes} min)
            </p>
            <p className="muted-note">
              Dispatchlimiet: soft {settings.dispatchCapacity.softDailyLimit} / hard{" "}
              {settings.dispatchCapacity.hardDailyLimit}
            </p>
            <p className="muted-note">
              Gewogen load: standaard {settings.dispatchCapacity.standardVisitWeight} - complex{" "}
              {settings.dispatchCapacity.complexVisitWeight}
            </p>
          </section>
          <section className="view-card">
            <h3>Platformuitbreiding</h3>
            <p className="view-subtitle">
              Volledige PX-catalogus met schillenlaag (schil 1, 2, 3) volgens subsidiefasering.
            </p>
            <div className="quick-actions">
              <label>
                Toon alleen schil
                <select
                  value={platformExpansionSchilFilter}
                  onChange={(event) =>
                    setPlatformExpansionSchilFilter(event.target.value as PlatformSchilFilter)
                  }
                >
                  {PLATFORM_SCHIL_FILTER_OPTIONS.map((filter) => (
                    <option key={filter} value={filter}>
                      {filter} ({platformExpansionSchilCounts[filter]})
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="secondary-btn" onClick={handleAddPlatformExpansion}>
                Nieuw platformuitbreidingsvoorstel
              </button>
            </div>
            <p className="muted-note">
              {platformExpansionProposals.length} voorstellen zichtbaar in filter{" "}
              <strong>{platformExpansionSchilFilter}</strong>.
            </p>
            <div className="roadmap-list">
              {platformExpansionProposals.length === 0 ? (
                <article className="roadmap-item">
                  <strong>Geen voorstellen in deze schilfilter.</strong>
                  <p>Pas de schilfilter aan of voeg een nieuw platformuitbreidingsvoorstel toe.</p>
                </article>
              ) : (
                platformExpansionProposals.map((item) => {
                  const isExpanded = expandedPlatformExpansionId === item.id;
                  const catalogDetail =
                    item.pxCode ? PLATFORM_EXPANSION_CATALOG_DETAILS[item.pxCode] : undefined;

                  return (
                    <article key={item.id} className="roadmap-item">
                      <button
                        type="button"
                        className="dnv-section-toggle"
                        onClick={() =>
                          setExpandedPlatformExpansionId((previous) =>
                            previous === item.id ? null : item.id
                          )
                        }
                      >
                        {isExpanded ? "▼" : "▶"} {item.pxCode ? `${item.pxCode} - ` : ""}
                        {item.title}
                      </button>
                      <div className="quick-actions">
                        <span className="visit-chip">{item.schil}</span>
                        <span className="visit-chip">
                          {item.source === "custom" ? "Voorstel in app" : "Standaard PX-catalogus"}
                        </span>
                      </div>
                      <p>{item.description}</p>

                      {isExpanded ? (
                        <div className="dnv-section-body">
                          {catalogDetail ? (
                            <>
                              <p className="muted-note">
                                Bron: PLATFORMUITBREIDINGEN_CATALOGUS.md (sectie {item.pxCode})
                              </p>
                              <strong>Doel</strong>
                              <ul>
                                {catalogDetail.doel.map((entry) => (
                                  <li key={`doel-${item.id}-${entry}`}>{entry}</li>
                                ))}
                              </ul>
                              <strong>Scope MVP</strong>
                              <ul>
                                {catalogDetail.scopeMvp.map((entry) => (
                                  <li key={`scope-${item.id}-${entry}`}>{entry}</li>
                                ))}
                              </ul>
                              <strong>User stories</strong>
                              <ul>
                                {catalogDetail.userStories.map((entry) => (
                                  <li key={`story-${item.id}-${entry}`}>{entry}</li>
                                ))}
                              </ul>
                              <strong>Implementatiestappen</strong>
                              <ul>
                                {catalogDetail.implementatiestappen.map((entry) => (
                                  <li key={`step-${item.id}-${entry}`}>{entry}</li>
                                ))}
                              </ul>
                              <strong>Kan zonder externe API</strong>
                              <ul>
                                {catalogDetail.kanZonderExterneApi.map((entry) => (
                                  <li key={`api-${item.id}-${entry}`}>{entry}</li>
                                ))}
                              </ul>
                              <strong>Acceptatiecriteria</strong>
                              <ul>
                                {catalogDetail.acceptatiecriteria.map((entry) => (
                                  <li key={`ac-${item.id}-${entry}`}>{entry}</li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <p className="muted-note">
                              Voor dit voorstel is nog geen volledige catalogusfiche beschikbaar.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </main>
      ) : effectiveActiveView === "tijdlijn" ? (
        <Suspense fallback={<main className="view-shell"><section className="view-card">Tijdlijn laden...</section></main>}>
          <TimelineView
            works={works}
            inspectors={inspectors}
            selectedDate={selectedDate}
            preferredInspectorByWorkId={dispatch.preferredInspectorByWorkId}
          />
        </Suspense>
      ) : effectiveActiveView === "oplevering" ? (
        renderRoadmapView(
          "Oplevering",
          "Wekelijkse opvolging en communicatieflow na einde werf.",
          ["Takenbord", "Telefonie/mail logging", "Escalatieflows"]
        )
      ) : (
        renderRoadmapView(
          "Rapporten",
          "Consolidatie van dagelijkse en managementrapportering.",
          ["Dagrapport dispatch", "Weekrapport district", "Export API-ready datasets"]
        )
      )}

      {pitchModeActive && activePitchStep ? (
        <aside className="pitch-mode-panel" aria-live="polite">
          <div className="pitch-mode-head">
            <p className="group-title">Pitchmodus actief</p>
            <span className="pitch-mode-badge">
              Stap {pitchStepIndex + 1}/{GUIDE_PITCH_PRESENTATION.length}
            </span>
          </div>
          <strong className="pitch-mode-step-title">{activePitchStep.focus}</strong>
          <p className="muted-note">
            View: {activePitchTargetLabel} - {activePitchStep.timebox}
          </p>
          <p className="muted-note">{activePitchStep.coreMessage}</p>
          <p className="pitch-mode-countdown">
            {pitchModePaused
              ? "Gepauzeerd"
              : `Nog ${pitchRemainingSeconds ?? activePitchStep.durationSeconds}s`}
          </p>
          <div className="quick-actions">
            <button
              type="button"
              className="chip"
              onClick={goToPreviousPitchStep}
              disabled={pitchStepIndex === 0}
            >
              Vorige
            </button>
            <button type="button" className="chip" onClick={togglePitchPause}>
              {pitchModePaused ? "Hervat" : "Pauze"}
            </button>
            <button
              type="button"
              className="chip"
              onClick={goToNextPitchStep}
              disabled={pitchStepIndex >= GUIDE_PITCH_PRESENTATION.length - 1}
            >
              Volgende
            </button>
            <button type="button" className="chip" onClick={stopPitchMode}>
              Stop
            </button>
          </div>
        </aside>
      ) : null}

      {requiresInspectorSession ? (
        <div className="session-gate-backdrop">
          <section className="session-gate-card">
            <h2>Selecteer actieve toezichter</h2>
            <p className="view-subtitle">
              Voor terreinwerking moet eerst een actieve toezichter-sessie gekozen worden.
            </p>
            <label>
              Toezichter
              <select
                value={sessionCandidateInspectorId}
                onChange={(event) => setSessionCandidateInspectorId(event.target.value)}
              >
                {inspectors.map((inspector) => (
                  <option key={inspector.id} value={inspector.id}>
                    {inspector.initials} - {inspector.name || `Toezichter ${inspector.initials}`}
                  </option>
                ))}
              </select>
            </label>
            <div className="quick-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => activateInspectorSession(sessionCandidateInspectorId)}
                disabled={!sessionCandidateInspectorId}
              >
                Start sessie
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <Suspense fallback={null}>
        <SettingsModal
          isOpen={showSettings}
          inspectors={INSPECTORS}
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      </Suspense>
    </div>
  );
}
