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
import governance8WeeksPlanRaw from "../docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md?raw";
import governanceScopeRaw from "../docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md?raw";
import governance60DaysProjectLeadRaw from "../docs/strategie/PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md?raw";
import governanceIntercityRaw from "../docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md?raw";
import governanceExecutionBoardRaw from "../docs/uitvoering/EXECUTIEBOARD.md?raw";
import governanceIpadEvaluationRaw from "../docs/IPAD_APP_EVALUATIE.md?raw";
import governanceAndroidEvaluationRaw from "../docs/ANDROID_APP_EVALUATIE.md?raw";
import governanceNis2Raw from "../docs/governance/00_governance/nis2.md?raw";
import governanceAvgLoggingRaw from "../docs/governance/00_governance/avg_logging.md?raw";
import governanceVendorExitRaw from "../docs/governance/00_governance/vendor_exit.md?raw";
import governanceDetailPlanningPdfUrl from "../docs/governance/DETAIL_PLANNING_Digitale_nuts.pdf?url";
import governanceOverviewPlanningPdfUrl from "../docs/governance/BIJLAGE D_OVERZICHT_PLANNING_DIGITALE_NUTS (1).pdf?url";
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
import {
  buildAssignmentSnapshot,
  getAssignmentSnapshotByDate,
  loadAssignmentHistory,
  saveAssignmentHistory,
  upsertAssignmentHistory,
  type AssignmentSnapshot,
} from "./lib/assignmentHistory";
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
const MANUAL_INSPECTOR_OVERRIDE_STORAGE_KEY = "dn_dispatch_manual_inspector_override_v1";
const GOVERNANCE_CONTACTS_STORAGE_KEY = "dn_governance_contacts_v1";
const APP_RELEASE_VERSION = "v1.6";
const APP_BUILD_VERSION = "0.1.0";
const RIGHT_PANEL_DEFAULT_WIDTH = 420;
const RIGHT_PANEL_MIN_WIDTH = 300;
const RIGHT_PANEL_MAX_WIDTH = 760;

const MAP_STYLE_OPTIONS = [
  { id: "clean", label: "Clean", url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "werfcontrast", label: "Werfcontrast", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "nacht", label: "Nacht", url: "https://tiles.openfreemap.org/styles/dark" },
  { id: "analyse", label: "Analyse", url: "https://tiles.openfreemap.org/styles/bright" },
  { id: "grb", label: "GRB Grijs", url: "/styles/grb-gray.json" },
  { id: "grb-kleur", label: "GRB Kleur", url: "/styles/grb-color.json" },
  { id: "luchtfoto", label: "Luchtfoto", url: "/styles/luchtfoto-vl.json" },
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
  | "governance"
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

type GovernanceStatus = "done" | "active" | "planned";

type GovernanceStage = {
  id: string;
  title: string;
  period: string;
  summary: string;
  status: GovernanceStatus;
  focus: string[];
  source: string;
};

type GovernanceGate = {
  id: string;
  title: string;
  date: string;
  decision: string;
  owner: string;
  source: string;
};

type GovernanceCadence = {
  id: string;
  rhythm: string;
  scope: string;
  objective: string;
  owner: string;
  source: string;
};

type GovernanceBudgetLine = {
  label: string;
  value: number;
  note: string;
};

type GovernancePartnerBudgetLine = {
  partner: string;
  total: number;
  year1: number;
  year2: number;
  year3: number;
};

type GovernanceRunCostScenario = {
  variant: string;
  scenario: string;
  monthlyCost: number;
  yearlyCostExclHardware: number;
  source: string;
};

type GovernanceVisualBlockTone =
  | "schil-1"
  | "schil-2"
  | "schil-3"
  | "analyse"
  | "ontwikkeling"
  | "governance"
  | "rapport";

type GovernanceVisualBlock = {
  id: string;
  label: string;
  startIso: string;
  endIso: string;
  tone: GovernanceVisualBlockTone;
};

type GovernanceVisualLane = {
  id: string;
  label: string;
  blocks: GovernanceVisualBlock[];
};

type GovernanceContact = {
  id: string;
  role: string;
  name: string;
  email: string;
  organization: string;
  group: string;
};

type GovernanceContactDraft = Omit<GovernanceContact, "id">;

type GovernanceDocReference = {
  kind: "md" | "pdf";
  fileName: string;
  filePath: string;
  title: string;
  content?: string;
  url?: string;
};

type VaststellingLaunchMode = "new" | "existing";

type VaststellingLaunchIntent = {
  requestId: number;
  visitId: string;
  mode: VaststellingLaunchMode;
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
  {
    key: "governance",
    label: "DN Governance",
    summary: "Programmaplanning, poorten, overleg en budgetopvolging",
    status: "live",
  },
];

const EURO_FORMATTER = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => EURO_FORMATTER.format(value);
const formatRatio = (value: number) => `${(value * 100).toFixed(1).replace(".", ",")}%`;

const GOVERNANCE_STATUS_LABEL: Record<GovernanceStatus, string> = {
  done: "Afgerond",
  active: "Actief",
  planned: "Gepland",
};

const GOVERNANCE_OPERATIONAL_STAGES: GovernanceStage[] = [
  {
    id: "pre-fase",
    title: "Pre-fase structuur",
    period: "tot en met 2026-03-19",
    summary: "Vibe coding en structurering zonder formele termijncommit.",
    status: "active",
    focus: ["Structuurdocumenten", "Backlog-labeling MH/NN", "Voorbereiding sprintstart"],
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "baseline-freeze",
    title: "Baseline freeze en formele start",
    period: "2026-03-20",
    summary: "Startdatum subsidieafspraak en scope freeze Schil 1.",
    status: "planned",
    focus: ["Scope freeze MH/NN", "Agenda poortmomenten", "Start 60-dagen traject"],
    source: "DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md",
  },
  {
    id: "sprint-1",
    title: "Sprint 1: regielaagfundament",
    period: "2026-03-23 t.e.m. 2026-04-03",
    summary: "Domain model v1, OpenAPI draft en architectuurbesluiten.",
    status: "planned",
    focus: ["Architectuurpoort 2026-04-03", "Contractfundament", "Backlogreductie MH"],
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "sprint-2",
    title: "Sprint 2: IAM en audit",
    period: "2026-04-06 t.e.m. 2026-04-17",
    summary: "Entra auth, RBAC minimum en audit events op kernmutaties.",
    status: "planned",
    focus: ["Security/IAM-poort 2026-04-17", "Auth middleware", "Security checklist v1"],
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "sprint-3",
    title: "Sprint 3: GIPOD first integration",
    period: "2026-04-20 t.e.m. 2026-05-01",
    summary: "Read-koppeling public-domain-occupancies en retry/idempotency flow.",
    status: "planned",
    focus: ["Integratiepoort 2026-05-01", "Mappingtabel", "Sync monitoring"],
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "sprint-4",
    title: "Sprint 4: stabilisatie en release",
    period: "2026-05-04 t.e.m. 2026-05-15",
    summary: "Ketentests, runbook en go/no-go dossier Schil 1.",
    status: "planned",
    focus: ["Releasepoort 2026-05-15", "Incidentsimulaties", "Open risico's met owner"],
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
];

const GOVERNANCE_INTERCITY_STAGES: GovernanceStage[] = [
  {
    id: "60d-1",
    title: "Dag 1-20: verkenning en baseline",
    period: "2026-03-20 t.e.m. 2026-04-08",
    summary: "Stakeholders, baseline KPI's en partnerbevraging.",
    status: "planned",
    focus: ["Stakeholdermatrix", "KPI-baseline", "MVP-afbakening zonder AI"],
    source: "PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md",
  },
  {
    id: "60d-2",
    title: "Dag 21-40: afstemming en standaardisatie",
    period: "2026-04-09 t.e.m. 2026-04-28",
    summary: "Datamodelafspraken, quality gates en trainingscyclus.",
    status: "planned",
    focus: ["Interstedelijke werksessies", "Contract/mappingafspraken", "Impactprocedure weekritme"],
    source: "DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md",
  },
  {
    id: "60d-3",
    title: "Dag 41-60: formalisering en coalitie",
    period: "2026-04-29 t.e.m. 2026-05-18",
    summary: "Governancekader, intentieverklaring en 12-18 maanden roadmap.",
    status: "planned",
    focus: ["Plenaire sessie", "Governanceafspraken", "Coalitie van steden"],
    source: "DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md",
  },
];

const GOVERNANCE_STRATEGIC_STAGES: GovernanceStage[] = [
  {
    id: "laag-1",
    title: "Laag 1: kernontwikkeling (MVP)",
    period: "2026-02-06 t.e.m. 2027-03-05",
    summary: "Analyse, MVP-ontwikkeling, pilot en governance-handleiding laag 1.",
    status: "active",
    focus: ["OSLO/API mapping", "MVP app + portaal", "MVP pilot 4 steden"],
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
  {
    id: "laag-2",
    title: "Laag 2: functionele uitbreiding",
    period: "2027-03-12 t.e.m. 2027-12-31",
    summary: "Vergunningskoppelingen, BI-rapportering, AI-pilot HITL en consolidatie.",
    status: "planned",
    focus: ["A-SIGN/WIS/KLM", "BI-dashboard", "Governance laag 2"],
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
  {
    id: "laag-3",
    title: "Laag 3: geavanceerd en opschaling",
    period: "2027-12-31 t.e.m. 2028-10-06",
    summary: "Predictieve planning, retributie, Vlaamse data-uitwisseling en disseminatie.",
    status: "planned",
    focus: ["OSLO publicatie", "Opschalingspakket", "Eindrapport en Vlaamse uitrol"],
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
];

const GOVERNANCE_GATE_MILESTONES: GovernanceGate[] = [
  {
    id: "gate-arch",
    title: "Architectuurpoort Schil 1",
    date: "2026-04-03",
    decision: "Domain model v1 + OpenAPI draft bevestigd.",
    owner: "PO + business architect + Digipolis architect",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "gate-security",
    title: "Security/IAM-poort Schil 1",
    date: "2026-04-17",
    decision: "Entra/RBAC minimum + audit eventset afgetekend.",
    owner: "Security/DPO + tech lead + Digipolis",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "gate-gipod",
    title: "Integratiepoort GIPOD",
    date: "2026-05-01",
    decision: "Read-adapter PDO stabiel, mapping en retry aantoonbaar.",
    owner: "Integratie engineer + tech lead + QA",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "gate-release",
    title: "Releasepoort Schil 1",
    date: "2026-05-15",
    decision: "Keten smoke tests groen + runbook + go/no-go pakket.",
    owner: "PO + architectuur + security + QA + DevOps",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
];

const GOVERNANCE_SUBSIDY_STEERING_MILESTONES: GovernanceGate[] = [
  {
    id: "st1",
    title: "Stuurgroep ST1",
    date: "2026-02-06",
    decision: "Kick-off subsidieproject en laag 1.",
    owner: "Stuurgroep",
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
  {
    id: "st2",
    title: "Stuurgroep ST2",
    date: "2026-08-21",
    decision: "Controlepunt voortgang laag 1.",
    owner: "Stuurgroep",
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
  {
    id: "st3",
    title: "Stuurgroep ST3",
    date: "2027-03-05",
    decision: "Afsluit laag 1 en doorgang laag 2.",
    owner: "Stuurgroep",
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
  {
    id: "st4",
    title: "Stuurgroep ST4",
    date: "2027-12-31",
    decision: "Afsluit laag 2 en doorgang laag 3.",
    owner: "Stuurgroep",
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
  {
    id: "st5",
    title: "Stuurgroep ST5",
    date: "2028-06-16",
    decision: "Opschalings- en disseminatiestatus.",
    owner: "Stuurgroep",
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
];

const GOVERNANCE_CADENCE: GovernanceCadence[] = [
  {
    id: "cadence-daily",
    rhythm: "Dagelijks",
    scope: "Delivery team",
    objective: "15 min stand-up op blockers, scope en risico's.",
    owner: "Projectleider + delivery team",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "cadence-arch",
    rhythm: "Wekelijks",
    scope: "Architectuur/security board",
    objective: "Architectuurkeuzes, IAM, audit en integratierisico's.",
    owner: "Business architect + Digipolis + security",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "cadence-partner",
    rhythm: "Wekelijks",
    scope: "Partner/integratie touchpoint",
    objective: "GIPOD toegang, mappingvragen, blockers en SLA-afspraken.",
    owner: "Integratie lead + partnercontacten",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "cadence-sprint",
    rhythm: "Tweewekelijks",
    scope: "Sprint review + planning",
    objective: "90 min review, poortbeslissing en herplanning topprioriteiten.",
    owner: "PO + projectleider + teamleads",
    source: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
  },
  {
    id: "cadence-productboard",
    rhythm: "Tweewekelijks",
    scope: "Productboard",
    objective: "Feedback uit steden/partners vertalen naar backlog en scope.",
    owner: "Projectsponsor + product owner",
    source: "_TMP_COT2025_NOTE_EXTRACT.txt",
  },
  {
    id: "cadence-klankbord",
    rhythm: "Halfjaarlijks",
    scope: "Klankbordgroep (KB1-KB6)",
    objective: "Validatie met bredere partners en kennisdeling.",
    owner: "Stuurgroep + klankbordgroep",
    source: "DETAIL_PLANNING_Digitale_nuts.pdf",
  },
];

const GOVERNANCE_SCOPE_MUST_HAVE = [
  "MH-01 Centrale backend v1 met Work/Inspection/SyncEvent",
  "MH-02 OpenAPI + contracten v1 (Works/Inspections/Sync)",
  "MH-03 Entra login + basis RBAC",
  "MH-04 Audittrail op create/update/handover/sync",
  "MH-05 GIPOD read-koppeling public-domain-occupancies",
  "MH-06 Idempotency + retry op syncflow",
  "MH-07 Contracttests + keten smoke tests in CI",
  "MH-08 Release runbook + incidentflow v1",
  "MH-09 Scope- en poortdiscipline per sprint",
];

const GOVERNANCE_SCOPE_NOT_NOW = [
  "NN-01 Volledige GIPOD write-back productieflow",
  "NN-02 Productie-integratie A-SIGN",
  "NN-03 Productie-integratie KLM/klachten",
  "NN-04 Volwaardig partnerportaal",
  "NN-05 Bewonerscommunicatie/QR module",
  "NN-06 AI assist en predictieve planning",
  "NN-07 Retributie en juridisch logboek volledig",
  "NN-08 Volledige multi-tenant uitrol",
  "NN-09 Formele OSLO-certificatie end-to-end",
];

const GOVERNANCE_ACTIVE_WORKSTREAMS: GovernanceStage[] = [
  {
    id: "px-010208",
    title: "PX-01 / PX-02 / PX-08 uitvoering",
    period: "W1-W6: 2026-03-23 t.e.m. 2026-05-01",
    summary: "Stabilisatie evidentieflow, rule engine v1 en KPI export/go-no-go.",
    status: "planned",
    focus: ["W2 harde deadline 2026-04-03", "W4 contracttests PX-02", "W6 stabilisatiebesluit"],
    source: "EXECUTIEBOARD.md",
  },
  {
    id: "rpt-us",
    title: "RPT-US rapporten v1",
    period: "W1-W6: 2026-03-23 t.e.m. 2026-05-01",
    summary: "Dagrapport, weekrapport, exportcontract en auditmetadata.",
    status: "planned",
    focus: ["RPT-US-003 datasetcontract", "RPT-US-005 contracttests", "RPT-US-006 view live v1"],
    source: "EXECUTIEBOARD.md",
  },
];

const GOVERNANCE_BUDGET_LINES: GovernanceBudgetLine[] = [
  {
    label: "Totale projectkosten",
    value: 2433589.5383206666,
    note: "Totalen begroting (ingediende Excel, totaal 3 projectjaren).",
  },
  {
    label: "Netto te financieren saldo (NFS)",
    value: 1946871.6306565334,
    note: "Doelfinanciering, met subsidieaandeel 80%.",
  },
  {
    label: "Overige bijdragen",
    value: 486717.9076641333,
    note: "Ontvangstenzijde exclusief NFS.",
  },
  {
    label: "Indicatieve enveloppe aanvraagtekst",
    value: 2400000,
    note: "1,0 mio coordinatie/business + 1,4 mio technische lagen.",
  },
];

const GOVERNANCE_LAYER_BUDGET_LINES: GovernanceBudgetLine[] = [
  {
    label: "Programma coordinatie en business",
    value: 1000000,
    note: "Indicatieve verdeling uit subsidienota.",
  },
  {
    label: "Laag 1 (MVP kernontwikkeling)",
    value: 750000,
    note: "Technische laag 1 binnen 1,4 mio technische enveloppe.",
  },
  {
    label: "Laag 2 (functionele uitbreiding)",
    value: 400000,
    note: "Technische laag 2 binnen 1,4 mio technische enveloppe.",
  },
  {
    label: "Laag 3 (geavanceerd + opschaling)",
    value: 250000,
    note: "Technische laag 3 binnen 1,4 mio technische enveloppe.",
  },
];

const GOVERNANCE_PARTNER_BUDGET_LINES: GovernancePartnerBudgetLine[] = [
  {
    partner: "Stad Antwerpen",
    year1: 739806.4326333333,
    year2: 731911.862,
    year3: 334820.67313999997,
    total: 1806538.9677733332,
  },
  {
    partner: "Stad Vilvoorde",
    year1: 33286.839766666664,
    year2: 26342.965933333337,
    year3: 8097.590543333333,
    total: 67727.39624333334,
  },
  {
    partner: "Stad Brugge",
    year1: 33286.839766666664,
    year2: 26342.965933333337,
    year3: 8097.590543333333,
    total: 67727.39624333334,
  },
  {
    partner: "Stad Kortrijk",
    year1: 32398.223100000003,
    year2: 25434.826933333337,
    year3: 9243.654193333334,
    total: 67076.70422666667,
  },
  {
    partner: "Stad Sint-Niklaas",
    year1: 23251.11476666667,
    year2: 18638.091099999998,
    year3: 5915.039423333334,
    total: 47804.245290000006,
  },
  {
    partner: "Athumi",
    year1: 207896.814,
    year2: 96207.0348,
    year3: 72610.979744,
    total: 376714.82854400005,
  },
];

const GOVERNANCE_RUN_COST_SCENARIOS: GovernanceRunCostScenario[] = [
  {
    variant: "iPad",
    scenario: "Minimaal",
    monthlyCost: 8,
    yearlyCostExclHardware: 1035,
    source: "IPAD_APP_EVALUATIE.md",
  },
  {
    variant: "iPad",
    scenario: "Professioneel",
    monthlyCost: 173,
    yearlyCostExclHardware: 3015,
    source: "IPAD_APP_EVALUATIE.md",
  },
  {
    variant: "Android",
    scenario: "Minimaal",
    monthlyCost: 0,
    yearlyCostExclHardware: 865,
    source: "ANDROID_APP_EVALUATIE.md",
  },
  {
    variant: "Android",
    scenario: "Professioneel",
    monthlyCost: 139,
    yearlyCostExclHardware: 2533,
    source: "ANDROID_APP_EVALUATIE.md",
  },
];

const GOVERNANCE_CONTACT_GROUP_OPTIONS = [
  "Deelnemende organisatie",
  "Partnersteden",
  "Volgende steden",
  "Stuurgroep",
  "Klankbordgroep",
  "Projectteam",
  "Integratiepartners",
  "Security en compliance",
];

const DEFAULT_GOVERNANCE_CONTACT_DRAFT: GovernanceContactDraft = {
  role: "",
  name: "",
  email: "",
  organization: "",
  group: GOVERNANCE_CONTACT_GROUP_OPTIONS[0],
};

const GOVERNANCE_DOC_REFERENCES: GovernanceDocReference[] = [
  {
    kind: "md",
    fileName: "DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
    filePath: "docs/strategie/DN_8_WEKEN_STAFFING_SPRINTPLAN_SCHIL1.md",
    title: "DN 8-Weken Staffing- en Sprintplan (Schil 1)",
    content: governance8WeeksPlanRaw,
  },
  {
    kind: "md",
    fileName: "DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md",
    filePath: "docs/strategie/DN_SCHIL1_SCOPE_MUST_HAVE_VS_NIET_NU.md",
    title: "DN Schil 1 Scope - Must-Have vs Niet Nu",
    content: governanceScopeRaw,
  },
  {
    kind: "md",
    fileName: "PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md",
    filePath: "docs/strategie/PROJECTLEIDER_STARTPLAN_60_DAGEN_CONSOLIDATIE_AI_READY.md",
    title: "Projectleider Startplan - 60 Dagen Consolidatie",
    content: governance60DaysProjectLeadRaw,
  },
  {
    kind: "md",
    fileName: "DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md",
    filePath: "docs/strategie/DN_60_DAGEN_INTERSTEDELIJKE_SAMENWERKING.md",
    title: "DN 60-Dagen Interstedelijke Samenwerking",
    content: governanceIntercityRaw,
  },
  {
    kind: "md",
    fileName: "EXECUTIEBOARD.md",
    filePath: "docs/uitvoering/EXECUTIEBOARD.md",
    title: "DN Dispatch - EXECUTIEBOARD",
    content: governanceExecutionBoardRaw,
  },
  {
    kind: "md",
    fileName: "IPAD_APP_EVALUATIE.md",
    filePath: "docs/IPAD_APP_EVALUATIE.md",
    title: "Evaluatie iPad App",
    content: governanceIpadEvaluationRaw,
  },
  {
    kind: "md",
    fileName: "ANDROID_APP_EVALUATIE.md",
    filePath: "docs/ANDROID_APP_EVALUATIE.md",
    title: "Evaluatie Android App",
    content: governanceAndroidEvaluationRaw,
  },
  {
    kind: "md",
    fileName: "nis2.md",
    filePath: "docs/governance/00_governance/nis2.md",
    title: "NIS2 Baseline - Digitale Nuts",
    content: governanceNis2Raw,
  },
  {
    kind: "md",
    fileName: "avg_logging.md",
    filePath: "docs/governance/00_governance/avg_logging.md",
    title: "AVG Logging Baseline - Digitale Nuts",
    content: governanceAvgLoggingRaw,
  },
  {
    kind: "md",
    fileName: "vendor_exit.md",
    filePath: "docs/governance/00_governance/vendor_exit.md",
    title: "Vendor Exit Baseline - Digitale Nuts",
    content: governanceVendorExitRaw,
  },
  {
    kind: "pdf",
    fileName: "DETAIL_PLANNING_Digitale_nuts.pdf",
    filePath: "docs/governance/DETAIL_PLANNING_Digitale_nuts.pdf",
    title: "Detail planning Digitale Nuts",
    url: governanceDetailPlanningPdfUrl,
  },
  {
    kind: "pdf",
    fileName: "BIJLAGE D_OVERZICHT_PLANNING_DIGITALE_NUTS (1).pdf",
    filePath: "docs/governance/BIJLAGE D_OVERZICHT_PLANNING_DIGITALE_NUTS (1).pdf",
    title: "Bijlage D - Overzicht planning Digitale Nuts",
    url: governanceOverviewPlanningPdfUrl,
  },
];

const GOVERNANCE_DOC_REFERENCE_BY_NAME = new Map(
  GOVERNANCE_DOC_REFERENCES.map((doc) => [doc.fileName, doc])
);

const GOVERNANCE_MS_TIMELINE_START_ISO = "2025-11-01";
const GOVERNANCE_MS_TIMELINE_END_ISO = "2028-10-06";

const GOVERNANCE_MS_TIMELINE_MARKERS = [
  { id: "m-2025-11", label: "nov '25", isoDate: "2025-11-01" },
  { id: "m-2026-03", label: "mrt '26", isoDate: "2026-03-01" },
  { id: "m-2026-07", label: "jul '26", isoDate: "2026-07-01" },
  { id: "m-2026-11", label: "nov '26", isoDate: "2026-11-01" },
  { id: "m-2027-03", label: "mrt '27", isoDate: "2027-03-01" },
  { id: "m-2027-07", label: "jul '27", isoDate: "2027-07-01" },
  { id: "m-2027-11", label: "nov '27", isoDate: "2027-11-01" },
  { id: "m-2028-03", label: "mrt '28", isoDate: "2028-03-01" },
  { id: "m-2028-07", label: "jul '28", isoDate: "2028-07-01" },
  { id: "m-2028-10", label: "okt '28", isoDate: "2028-10-01" },
];

const GOVERNANCE_MS_STEERING_MARKERS = [
  { id: "st1", label: "ST1", isoDate: "2026-02-06" },
  { id: "st2", label: "ST2", isoDate: "2026-08-21" },
  { id: "st3", label: "ST3", isoDate: "2027-03-05" },
  { id: "st4", label: "ST4", isoDate: "2027-12-31" },
  { id: "st5", label: "ST5", isoDate: "2028-06-16" },
];

const GOVERNANCE_MS_VISUAL_LANES: GovernanceVisualLane[] = [
  {
    id: "lane-schillen",
    label: "Schillen (subsidie)",
    blocks: [
      {
        id: "schil-laag-1",
        label: "LAAG 1 - Kernontwikkeling (MVP)",
        startIso: "2026-02-06",
        endIso: "2027-03-05",
        tone: "schil-1",
      },
      {
        id: "schil-laag-2",
        label: "LAAG 2 - Functionele uitbreiding",
        startIso: "2027-03-12",
        endIso: "2027-12-31",
        tone: "schil-2",
      },
      {
        id: "schil-laag-3",
        label: "LAAG 3 - Geavanceerd en opschaling",
        startIso: "2027-12-31",
        endIso: "2028-10-06",
        tone: "schil-3",
      },
    ],
  },
  {
    id: "lane-laag-1",
    label: "Laag 1 kernblokken",
    blocks: [
      {
        id: "laag1-analyse",
        label: "ANALYSEFASE LAAG 1",
        startIso: "2026-02-09",
        endIso: "2027-01-08",
        tone: "analyse",
      },
      {
        id: "laag1-oslo",
        label: "OSLO-profiel en API-mapping",
        startIso: "2026-05-04",
        endIso: "2027-01-08",
        tone: "governance",
      },
      {
        id: "laag1-ontwikkeling",
        label: "ONTWIKKELFASE MVP app + portaal",
        startIso: "2026-07-13",
        endIso: "2027-01-08",
        tone: "ontwikkeling",
      },
    ],
  },
  {
    id: "lane-laag-2",
    label: "Laag 2 kernblokken",
    blocks: [
      {
        id: "laag2-analyse",
        label: "ANALYSE LAAG 2",
        startIso: "2027-03-15",
        endIso: "2027-05-07",
        tone: "analyse",
      },
      {
        id: "laag2-ontwikkeling",
        label: "ONTWIKKELING LAAG 2",
        startIso: "2027-05-10",
        endIso: "2027-11-05",
        tone: "ontwikkeling",
      },
    ],
  },
  {
    id: "lane-laag-3",
    label: "Laag 3 kernblokken",
    blocks: [
      {
        id: "laag3-analyse",
        label: "ANALYSEFASE LAAG 3",
        startIso: "2028-01-03",
        endIso: "2028-02-25",
        tone: "analyse",
      },
      {
        id: "laag3-ontwikkeling",
        label: "ONTWIKKELFASE LAAG 3",
        startIso: "2028-02-28",
        endIso: "2028-05-19",
        tone: "ontwikkeling",
      },
      {
        id: "laag3-governance",
        label: "GOVERNANCE & DISSEMINATIE",
        startIso: "2028-01-03",
        endIso: "2028-10-06",
        tone: "governance",
      },
      {
        id: "laag3-rapport",
        label: "EINDRAPPORT",
        startIso: "2028-06-19",
        endIso: "2028-08-11",
        tone: "rapport",
      },
    ],
  },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const GOVERNANCE_MS_TIMELINE_START_MS = parseIsoDate(GOVERNANCE_MS_TIMELINE_START_ISO).getTime();
const GOVERNANCE_MS_TIMELINE_END_MS = parseIsoDate(GOVERNANCE_MS_TIMELINE_END_ISO).getTime();
const GOVERNANCE_MS_TIMELINE_SPAN_MS = Math.max(
  DAY_IN_MS,
  GOVERNANCE_MS_TIMELINE_END_MS - GOVERNANCE_MS_TIMELINE_START_MS
);

const toGovernanceTimelinePercent = (isoDate: string) => {
  const timestamp = parseIsoDate(isoDate).getTime();
  const normalized = ((timestamp - GOVERNANCE_MS_TIMELINE_START_MS) / GOVERNANCE_MS_TIMELINE_SPAN_MS) * 100;
  return Math.min(100, Math.max(0, normalized));
};

const getGovernanceTimelineBlockStyle = (startIso: string, endIso: string): CSSProperties => {
  const startPercent = toGovernanceTimelinePercent(startIso);
  const endPercent = toGovernanceTimelinePercent(endIso) + (DAY_IN_MS / GOVERNANCE_MS_TIMELINE_SPAN_MS) * 100;
  const widthPercent = Math.max(1.2, endPercent - startPercent);
  return {
    left: `${Math.min(100, Math.max(0, startPercent))}%`,
    width: `${Math.min(100, widthPercent)}%`,
  };
};

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

function sanitizeGovernanceContactDraft(value: Partial<GovernanceContactDraft>): GovernanceContactDraft {
  return {
    role: `${value.role ?? ""}`.trim(),
    name: `${value.name ?? ""}`.trim(),
    email: `${value.email ?? ""}`
      .trim()
      .toLowerCase(),
    organization: `${value.organization ?? ""}`.trim(),
    group: `${value.group ?? ""}`.trim(),
  };
}

function isGovernanceEmailLikelyValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function loadGovernanceContacts(): GovernanceContact[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GOVERNANCE_CONTACTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const validated: GovernanceContact[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const id = `${(entry as { id?: string }).id ?? ""}`.trim();
      const sanitized = sanitizeGovernanceContactDraft({
        role: (entry as { role?: string }).role,
        name: (entry as { name?: string }).name,
        email: (entry as { email?: string }).email,
        organization: (entry as { organization?: string }).organization,
        group: (entry as { group?: string }).group,
      });

      if (!id) {
        continue;
      }
      if (!sanitized.role || !sanitized.name || !sanitized.email || !sanitized.organization) {
        continue;
      }
      if (!isGovernanceEmailLikelyValid(sanitized.email)) {
        continue;
      }

      validated.push({
        id,
        ...sanitized,
      });
    }

    return validated;
  } catch (error) {
    console.warn("[dn-dispatch] governance-contacten konden niet geladen worden", error);
    return [];
  }
}

function saveGovernanceContacts(items: GovernanceContact[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = items.map((item) => ({
    id: item.id,
    role: item.role,
    name: item.name,
    email: item.email,
    organization: item.organization,
    group: item.group,
  }));

  window.localStorage.setItem(GOVERNANCE_CONTACTS_STORAGE_KEY, JSON.stringify(payload));
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

function downloadJsonFile(content: string, fileName: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeManualInspectorMap(
  value: unknown,
  inspectorIds: string[]
): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const allowAllInspectorIds = inspectorIds.length === 0;
  const validInspectorIds = new Set(inspectorIds);
  const sanitized: Record<string, string> = {};

  for (const [workIdRaw, inspectorIdRaw] of Object.entries(value)) {
    const workId = `${workIdRaw ?? ""}`.trim();
    const inspectorId = `${inspectorIdRaw ?? ""}`.trim().toUpperCase();
    if (!workId || !inspectorId) {
      continue;
    }
    if (!allowAllInspectorIds && !validInspectorIds.has(inspectorId)) {
      continue;
    }
    sanitized[workId] = inspectorId;
  }

  return sanitized;
}

function loadManualInspectorOverrides(inspectorIds: string[]): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(MANUAL_INSPECTOR_OVERRIDE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return sanitizeManualInspectorMap(parsed, inspectorIds);
  } catch {
    return {};
  }
}

function saveManualInspectorOverrides(
  value: Record<string, string>,
  inspectorIds: string[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const sanitized = sanitizeManualInspectorMap(value, inspectorIds);
    window.localStorage.setItem(
      MANUAL_INSPECTOR_OVERRIDE_STORAGE_KEY,
      JSON.stringify(sanitized)
    );
  } catch {
    // ignore quota/permission issues
  }
}

function mapEquals(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

export default function App() {
  const runtimePort =
    typeof window !== "undefined" ? window.location.port || "80" : "n/a";
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
  const [selectedMapStyle, setSelectedMapStyle] = useState<MapStyleId>("grb");
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
  const [governanceContacts, setGovernanceContacts] = useState<GovernanceContact[]>(() =>
    loadGovernanceContacts()
  );
  const [openGovernanceDocName, setOpenGovernanceDocName] = useState<string | null>(null);
  const [governanceContactDraft, setGovernanceContactDraft] = useState<GovernanceContactDraft>(
    () => DEFAULT_GOVERNANCE_CONTACT_DRAFT
  );
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentSnapshot[]>(
    () => loadAssignmentHistory()
  );
  const [manualInspectorByWorkId, setManualInspectorByWorkId] = useState<
    Record<string, string>
  >(() => loadManualInspectorOverrides([]));
  const [vaststellingLaunchIntent, setVaststellingLaunchIntent] =
    useState<VaststellingLaunchIntent | null>(null);
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
  const preferredInspectorInputByWorkId = useMemo(
    () => ({
      ...stickyInspectorByWorkId,
      ...manualInspectorByWorkId,
    }),
    [manualInspectorByWorkId, stickyInspectorByWorkId]
  );
  const inspectorById = useMemo(
    () => new Map(inspectors.map((inspector) => [inspector.id, inspector])),
    [inspectors]
  );
  const governanceContactGroupOptions = useMemo(() => {
    const groups = new Set<string>(GOVERNANCE_CONTACT_GROUP_OPTIONS);
    for (const contact of governanceContacts) {
      if (contact.group) {
        groups.add(contact.group);
      }
    }
    return Array.from(groups.values());
  }, [governanceContacts]);
  const governanceContactGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const contact of governanceContacts) {
      const key = contact.group || "Zonder groep";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([group, count]) => ({ group, count }));
  }, [governanceContacts]);
  const governanceContactsSorted = useMemo(
    () =>
      [...governanceContacts].sort((a, b) => {
        if (a.group !== b.group) {
          return a.group.localeCompare(b.group, "nl-BE");
        }
        if (a.organization !== b.organization) {
          return a.organization.localeCompare(b.organization, "nl-BE");
        }
        if (a.role !== b.role) {
          return a.role.localeCompare(b.role, "nl-BE");
        }
        return a.name.localeCompare(b.name, "nl-BE");
      }),
    [governanceContacts]
  );
  const openGovernanceDoc = useMemo(
    () =>
      openGovernanceDocName ? GOVERNANCE_DOC_REFERENCE_BY_NAME.get(openGovernanceDocName) ?? null : null,
    [openGovernanceDocName]
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

  useEffect(() => {
    saveGovernanceContacts(governanceContacts);
  }, [governanceContacts]);

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
    setManualInspectorByWorkId((previous) => {
      const sanitized = sanitizeManualInspectorMap(previous, inspectorIds);
      return mapEquals(previous, sanitized) ? previous : sanitized;
    });
  }, [inspectorIds]);

  useEffect(() => {
    saveManualInspectorOverrides(manualInspectorByWorkId, inspectorIds);
  }, [inspectorIds, manualInspectorByWorkId]);

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
        stickyInspectorByWorkId: preferredInspectorInputByWorkId,
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
      preferredInspectorInputByWorkId,
      works,
    ]
  );

  useEffect(() => {
    const snapshot = buildAssignmentSnapshot({
      dispatchDate: selectedDate,
      dispatch,
      manualInspectorByWorkId,
    });

    setAssignmentHistory((previous) => upsertAssignmentHistory(previous, snapshot));
  }, [dispatch, manualInspectorByWorkId, selectedDate]);

  useEffect(() => {
    saveAssignmentHistory(assignmentHistory);
  }, [assignmentHistory]);

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
  const workIdsWithVaststelling = useMemo(
    () =>
      new Set(
        vaststellingRecordsSnapshot.map((record) => record.immutableContext.workId)
      ),
    [vaststellingRecordsSnapshot]
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

  const selectedAssignmentSnapshot = useMemo(
    () => getAssignmentSnapshotByDate(assignmentHistory, selectedDate),
    [assignmentHistory, selectedDate]
  );

  const assignmentCoverageRows = useMemo(() => {
    if (!selectedAssignmentSnapshot) {
      return [];
    }

    const plannedDate = selectedAssignmentSnapshot.dispatchDate;

    return selectedAssignmentSnapshot.inspectorSummaries
      .map((summary) => {
        const assignedWorkIds = new Set(
          selectedAssignmentSnapshot.assignments
            .filter((row) => row.inspectorId === summary.inspectorId)
            .map((row) => row.workId)
        );

        const matchingRecords = vaststellingRecordsSnapshot.filter((record) => {
          const plannedVisitDate = (record.immutableContext.plannedVisitDate ?? "").slice(0, 10);
          return (
            plannedVisitDate === plannedDate &&
            record.inspectorSession.inspectorId === summary.inspectorId &&
            assignedWorkIds.has(record.immutableContext.workId)
          );
        });

        const reportedWorkIds = new Set(
          matchingRecords.map((record) => record.immutableContext.workId)
        );
        const coveragePct =
          assignedWorkIds.size > 0
            ? Math.round((reportedWorkIds.size / assignedWorkIds.size) * 100)
            : null;

        return {
          ...summary,
          reportsCreated: matchingRecords.length,
          reportedWorks: reportedWorkIds.size,
          coveragePct,
        };
      })
      .filter((row) => row.assignedVisits > 0);
  }, [selectedAssignmentSnapshot, vaststellingRecordsSnapshot]);

  const assignmentCoverageTotals = useMemo(() => {
    return assignmentCoverageRows.reduce(
      (acc, row) => ({
        assignedVisits: acc.assignedVisits + row.assignedVisits,
        assignedWorks: acc.assignedWorks + row.uniqueWorks,
        reportsCreated: acc.reportsCreated + row.reportsCreated,
        reportedWorks: acc.reportedWorks + row.reportedWorks,
      }),
      {
        assignedVisits: 0,
        assignedWorks: 0,
        reportsCreated: 0,
        reportedWorks: 0,
      }
    );
  }, [assignmentCoverageRows]);

  const recentAssignmentSnapshots = useMemo(() => assignmentHistory.slice(0, 20), [assignmentHistory]);

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

  const assignedWorkIds = useMemo(
    () =>
      new Set(
        Object.values(dispatch.visitsByInspector)
          .flat()
          .map((visit) => visit.work.id)
      ),
    [dispatch.visitsByInspector]
  );

  const nonDispatchContextWorks = useMemo(
    () =>
      contextWorks.filter(
        (work) =>
          !assignedWorkIds.has(work.id) &&
          Number.isFinite(work.location.lat) &&
          Number.isFinite(work.location.lng)
      ),
    [assignedWorkIds, contextWorks]
  );

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

  const handleManualAssignWork = useCallback(
    (workId: string, inspectorId: string) => {
      const normalizedWorkId = `${workId ?? ""}`.trim();
      const normalizedInspectorId = `${inspectorId ?? ""}`.trim().toUpperCase();
      if (!normalizedWorkId || !inspectorById.has(normalizedInspectorId)) {
        return;
      }

      setManualInspectorByWorkId((previous) => {
        if (previous[normalizedWorkId] === normalizedInspectorId) {
          return previous;
        }
        return {
          ...previous,
          [normalizedWorkId]: normalizedInspectorId,
        };
      });

      const inspector = inspectorById.get(normalizedInspectorId);
      setSyncMessage(
        `Manuele toewijzing: ${normalizedWorkId} -> ${
          inspector?.initials ?? normalizedInspectorId
        }`
      );
    },
    [inspectorById]
  );

  const handleClearManualAssignWork = useCallback((workId: string) => {
    const normalizedWorkId = `${workId ?? ""}`.trim();
    if (!normalizedWorkId) {
      return;
    }

    setManualInspectorByWorkId((previous) => {
      if (!previous[normalizedWorkId]) {
        return previous;
      }
      const next = { ...previous };
      delete next[normalizedWorkId];
      return next;
    });

    setSyncMessage(`Manuele toewijzing verwijderd: ${normalizedWorkId}`);
  }, []);

  const handleOpenVaststellingFromPopup = useCallback(
    (visitId: string, mode: VaststellingLaunchMode) => {
      const targetVisit = allDispatchVisits.find((visit) => visit.id === visitId);
      if (!targetVisit) {
        setSyncMessage("Context niet gevonden om vaststelling te openen.");
        return;
      }

      if (activeInspectorSession?.inspectorId !== targetVisit.inspectorId) {
        activateInspectorSession(targetVisit.inspectorId);
      }

      setSelectedVisitId(targetVisit.id);
      setActiveView("vaststelling");
      setVaststellingLaunchIntent({
        requestId: Date.now(),
        visitId: targetVisit.id,
        mode,
      });
    },
    [activeInspectorSession?.inspectorId, activateInspectorSession, allDispatchVisits]
  );

  const handleVaststellingLaunchIntentHandled = useCallback((requestId: number) => {
    setVaststellingLaunchIntent((current) =>
      current?.requestId === requestId ? null : current
    );
  }, []);

  const handleExportAssignmentHistory = useCallback(() => {
    const payload = {
      format: "dn_dispatch_assignment_history",
      version: 1,
      exportedAt: new Date().toISOString(),
      history: assignmentHistory,
    };
    downloadJsonFile(
      JSON.stringify(payload, null, 2),
      `dn_toewijzingsarchief_${selectedDate}.json`
    );
    setSyncMessage("Toewijzingsarchief geëxporteerd.");
  }, [assignmentHistory, selectedDate]);

  const handleClearAssignmentHistory = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Wil je het lokale toewijzingsarchief wissen? Dit kan niet ongedaan worden."
      );
      if (!confirmed) {
        return;
      }
    }

    setAssignmentHistory([]);
    setSyncMessage("Lokaal toewijzingsarchief gewist.");
  }, []);

  const handleGovernanceContactDraftChange = useCallback(
    (field: keyof GovernanceContactDraft, value: string) => {
      setGovernanceContactDraft((previous) => ({
        ...previous,
        [field]: value,
      }));
    },
    []
  );

  const handleAddGovernanceContact = useCallback(() => {
    const sanitized = sanitizeGovernanceContactDraft(governanceContactDraft);
    if (
      !sanitized.role ||
      !sanitized.name ||
      !sanitized.email ||
      !sanitized.organization ||
      !sanitized.group
    ) {
      setSyncMessage("Vul rol, naam, e-mail, organisatie en groep in.");
      return;
    }
    if (!isGovernanceEmailLikelyValid(sanitized.email)) {
      setSyncMessage("Gebruik een geldig e-mailadres voor deze contactpersoon.");
      return;
    }

    const entry: GovernanceContact = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `gov-contact-${crypto.randomUUID()}`
          : `gov-contact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...sanitized,
    };

    setGovernanceContacts((previous) => [...previous, entry]);
    setGovernanceContactDraft({
      ...DEFAULT_GOVERNANCE_CONTACT_DRAFT,
      group: sanitized.group,
    });
    setSyncMessage(`Contact toegevoegd: ${sanitized.name} (${sanitized.role}).`);
  }, [governanceContactDraft]);

  const handleRemoveGovernanceContact = useCallback(
    (contactId: string) => {
      const target = governanceContacts.find((entry) => entry.id === contactId);
      if (!target) {
        return;
      }
      setGovernanceContacts((previous) => previous.filter((entry) => entry.id !== contactId));
      setSyncMessage(`Contact verwijderd: ${target.name} (${target.role}).`);
    },
    [governanceContacts]
  );

  const openGovernanceSourceDoc = useCallback((sourceName: string) => {
    const doc = GOVERNANCE_DOC_REFERENCE_BY_NAME.get(sourceName);
    if (!doc) {
      setSyncMessage(`Geen bronbestand gevonden voor ${sourceName}.`);
      return;
    }
    setOpenGovernanceDocName(sourceName);
  }, []);

  const closeGovernanceDocViewer = useCallback(() => {
    setOpenGovernanceDocName(null);
  }, []);

  const renderGovernanceSourceInline = useCallback(
    (sourceName: string) => {
      const doc = GOVERNANCE_DOC_REFERENCE_BY_NAME.get(sourceName);
      if (!doc) {
        return <span>{sourceName}</span>;
      }
      return (
        <button
          type="button"
          className="link-btn governance-source-link"
          onClick={() => openGovernanceSourceDoc(sourceName)}
          title={`Open document viewer: ${doc.filePath}`}
        >
          {sourceName}
        </button>
      );
    },
    [openGovernanceSourceDoc]
  );

  const renderGovernanceSourceLine = useCallback(
    (sourceName: string, label = "Bron") => (
      <p className="governance-source">
        {label}: {renderGovernanceSourceInline(sourceName)}
      </p>
    ),
    [renderGovernanceSourceInline]
  );

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
          <button type="button" className="secondary-btn" onClick={() => setActiveView("governance")}>
            Open DN Governance
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

  const renderGovernanceView = () => {
    const totalProjectBudget = GOVERNANCE_BUDGET_LINES[0]?.value ?? 0;
    const nfsBudget = GOVERNANCE_BUDGET_LINES[1]?.value ?? 0;
    const otherContributionBudget = GOVERNANCE_BUDGET_LINES[2]?.value ?? 0;
    const athumiBudget =
      GOVERNANCE_PARTNER_BUDGET_LINES.find((line) => line.partner === "Athumi")?.total ?? 0;
    const athumiShare = totalProjectBudget > 0 ? athumiBudget / totalProjectBudget : 0;

    return (
      <main className="view-shell governance-shell">
        <section className="view-card">
          <h2>DN Governance - Centrale Projectopvolging</h2>
          <p className="view-subtitle">
            Deze tab combineert 8-weken Schil 1, 60-dagen afstemming, subsidieroadmap en budgetopvolging in 1
            bestuurbaar overzicht.
          </p>
          <div className="governance-pill-row">
            <span className="governance-pill governance-pill-active">Pre-fase t.e.m. 2026-03-19</span>
            <span className="governance-pill governance-pill-planned">
              Formele planningstart: 2026-03-20
            </span>
            <span className="governance-pill governance-pill-planned">
              Schil 1 releasepoort: 2026-05-15
            </span>
          </div>
          <p className="muted-note">
            Bronnen: strategiedocs, uitvoeringsboard, subsidieplanning PDF's en projectbegroting Excel.
          </p>
        </section>

        <section className="view-card">
          <h3>1. Operationele doorloop vanaf 2026-03-20</h3>
          <div className="governance-stage-grid">
            {GOVERNANCE_OPERATIONAL_STAGES.map((stage) => (
              <article key={stage.id} className="governance-stage-card">
                <div className="governance-stage-head">
                  <strong>{stage.title}</strong>
                  <span className={`governance-status governance-status-${stage.status}`}>
                    {GOVERNANCE_STATUS_LABEL[stage.status]}
                  </span>
                </div>
                <p className="muted-note">{stage.period}</p>
                <p>{stage.summary}</p>
                <ul className="governance-focus-list">
                  {stage.focus.map((item) => (
                    <li key={`${stage.id}-${item}`}>{item}</li>
                  ))}
                </ul>
                {renderGovernanceSourceLine(stage.source)}
              </article>
            ))}
          </div>
        </section>

        <section className="view-card">
          <h3>2. 60-dagen interstedelijk traject</h3>
          <div className="governance-stage-grid">
            {GOVERNANCE_INTERCITY_STAGES.map((stage) => (
              <article key={stage.id} className="governance-stage-card">
                <div className="governance-stage-head">
                  <strong>{stage.title}</strong>
                  <span className={`governance-status governance-status-${stage.status}`}>
                    {GOVERNANCE_STATUS_LABEL[stage.status]}
                  </span>
                </div>
                <p className="muted-note">{stage.period}</p>
                <p>{stage.summary}</p>
                <ul className="governance-focus-list">
                  {stage.focus.map((item) => (
                    <li key={`${stage.id}-${item}`}>{item}</li>
                  ))}
                </ul>
                {renderGovernanceSourceLine(stage.source)}
              </article>
            ))}
          </div>
        </section>

        <section className="view-card">
          <h3>3. Subsidieroadmap en schillenplanning</h3>
          <div className="governance-stage-grid">
            {GOVERNANCE_STRATEGIC_STAGES.map((stage) => (
              <article key={stage.id} className="governance-stage-card">
                <div className="governance-stage-head">
                  <strong>{stage.title}</strong>
                  <span className={`governance-status governance-status-${stage.status}`}>
                    {GOVERNANCE_STATUS_LABEL[stage.status]}
                  </span>
                </div>
                <p className="muted-note">{stage.period}</p>
                <p>{stage.summary}</p>
                <ul className="governance-focus-list">
                  {stage.focus.map((item) => (
                    <li key={`${stage.id}-${item}`}>{item}</li>
                  ))}
                </ul>
                {renderGovernanceSourceLine(stage.source)}
              </article>
            ))}
          </div>
        </section>

        <section className="view-card">
          <h3>4. Actieplannen in uitvoering</h3>
          <div className="governance-stage-grid">
            {GOVERNANCE_ACTIVE_WORKSTREAMS.map((stage) => (
              <article key={stage.id} className="governance-stage-card">
                <div className="governance-stage-head">
                  <strong>{stage.title}</strong>
                  <span className={`governance-status governance-status-${stage.status}`}>
                    {GOVERNANCE_STATUS_LABEL[stage.status]}
                  </span>
                </div>
                <p className="muted-note">{stage.period}</p>
                <p>{stage.summary}</p>
                <ul className="governance-focus-list">
                  {stage.focus.map((item) => (
                    <li key={`${stage.id}-${item}`}>{item}</li>
                  ))}
                </ul>
                {renderGovernanceSourceLine(stage.source)}
              </article>
            ))}
          </div>
        </section>

        <section className="view-card">
          <h3>5. Poorten en overlegmomenten</h3>
          <div className="governance-two-column">
            <article className="governance-column-card">
              <h4>Schil 1 poorten</h4>
              <div className="governance-list">
                {GOVERNANCE_GATE_MILESTONES.map((gate) => (
                  <div key={gate.id} className="governance-list-item">
                    <strong>
                      {gate.date} - {gate.title}
                    </strong>
                    <p>{gate.decision}</p>
                    <p className="governance-source">Owner: {gate.owner}</p>
                    {renderGovernanceSourceLine(gate.source)}
                  </div>
                ))}
              </div>
            </article>

            <article className="governance-column-card">
              <h4>Stuurgroep mijlpalen (subsidie)</h4>
              <div className="governance-list">
                {GOVERNANCE_SUBSIDY_STEERING_MILESTONES.map((gate) => (
                  <div key={gate.id} className="governance-list-item">
                    <strong>
                      {gate.date} - {gate.title}
                    </strong>
                    <p>{gate.decision}</p>
                    <p className="governance-source">Owner: {gate.owner}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Ritme</th>
                  <th>Overleg</th>
                  <th>Doel</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {GOVERNANCE_CADENCE.map((item) => (
                  <tr key={item.id}>
                    <td>{item.rhythm}</td>
                    <td>{item.scope}</td>
                    <td>{item.objective}</td>
                    <td>{item.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="view-card">
          <h3>6. Projectorganisatie en contactpersonen</h3>
          <p className="view-subtitle">
            Beheer hier de contactmatrix per rol, organisatie en communicatiegroep (bv. partnersteden,
            volgende steden, deelnemende organisaties).
          </p>
          {governanceContactGroupCounts.length === 0 ? (
            <p className="muted-note">Nog geen contactpersonen toegevoegd.</p>
          ) : (
            <div className="governance-group-chip-grid">
              {governanceContactGroupCounts.map((entry) => (
                <span key={`group-count-${entry.group}`} className="governance-group-chip">
                  {entry.group}: {entry.count}
                </span>
              ))}
            </div>
          )}
          <div className="governance-contact-form">
            <label>
              Rol
              <input
                type="text"
                value={governanceContactDraft.role}
                onChange={(event) => handleGovernanceContactDraftChange("role", event.target.value)}
                placeholder="bv. Product owner"
              />
            </label>
            <label>
              Naam
              <input
                type="text"
                value={governanceContactDraft.name}
                onChange={(event) => handleGovernanceContactDraftChange("name", event.target.value)}
                placeholder="Voornaam Naam"
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={governanceContactDraft.email}
                onChange={(event) => handleGovernanceContactDraftChange("email", event.target.value)}
                placeholder="naam@organisatie.be"
              />
            </label>
            <label>
              Organisatie
              <input
                type="text"
                value={governanceContactDraft.organization}
                onChange={(event) =>
                  handleGovernanceContactDraftChange("organization", event.target.value)
                }
                placeholder="bv. Stad Antwerpen"
              />
            </label>
            <label>
              Groep
              <input
                type="text"
                list="governance-contact-group-options"
                value={governanceContactDraft.group}
                onChange={(event) => handleGovernanceContactDraftChange("group", event.target.value)}
                placeholder="Kies of typ een groep"
              />
              <datalist id="governance-contact-group-options">
                {governanceContactGroupOptions.map((group) => (
                  <option key={`group-option-${group}`} value={group} />
                ))}
              </datalist>
            </label>
            <div className="governance-contact-actions">
              <button type="button" className="secondary-btn" onClick={handleAddGovernanceContact}>
                Contact toevoegen
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Naam</th>
                  <th>E-mail</th>
                  <th>Organisatie</th>
                  <th>Groep</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {governanceContactsSorted.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Nog geen contactpersonen geregistreerd.</td>
                  </tr>
                ) : (
                  governanceContactsSorted.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.role}</td>
                      <td>{contact.name}</td>
                      <td>
                        <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </td>
                      <td>{contact.organization}</td>
                      <td>{contact.group}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => handleRemoveGovernanceContact(contact.id)}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="view-card">
          <h3>7. Schil 1 scopebewaking: must-have vs niet nu</h3>
          <div className="governance-scope-grid">
            <article className="governance-scope-card governance-scope-card-mh">
              <h4>Must-have (MH)</h4>
              <ul className="governance-focus-list">
                {GOVERNANCE_SCOPE_MUST_HAVE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="governance-scope-card governance-scope-card-nn">
              <h4>Niet nu (NN)</h4>
              <ul className="governance-focus-list">
                {GOVERNANCE_SCOPE_NOT_NOW.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="view-card">
          <h3>8. Budgetplanning en financiering</h3>
          <div className="view-grid view-grid-4 governance-budget-grid">
            {GOVERNANCE_BUDGET_LINES.map((line) => (
              <article key={line.label} className="governance-budget-card">
                <span className="stat-label">{line.label}</span>
                <strong>{formatCurrency(line.value)}</strong>
                <p>{line.note}</p>
              </article>
            ))}
          </div>

          <div className="quick-actions">
            <span className="governance-pill governance-pill-active">
              Subsidieaandeel NFS: {formatRatio(totalProjectBudget > 0 ? nfsBudget / totalProjectBudget : 0)}
            </span>
            <span className="governance-pill governance-pill-planned">
              Athumi aandeel totale kosten: {formatRatio(athumiShare)}
            </span>
            <span className="governance-pill governance-pill-planned">
              Cofinanciering en overige ontvangsten: {formatCurrency(otherContributionBudget)}
            </span>
          </div>

          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Jaar 1</th>
                  <th>Jaar 2</th>
                  <th>Jaar 3</th>
                  <th>Totaal</th>
                  <th>Aandeel</th>
                </tr>
              </thead>
              <tbody>
                {GOVERNANCE_PARTNER_BUDGET_LINES.map((line) => (
                  <tr key={line.partner}>
                    <td>{line.partner}</td>
                    <td>{formatCurrency(line.year1)}</td>
                    <td>{formatCurrency(line.year2)}</td>
                    <td>{formatCurrency(line.year3)}</td>
                    <td>{formatCurrency(line.total)}</td>
                    <td>{formatRatio(totalProjectBudget > 0 ? line.total / totalProjectBudget : 0)}</td>
                  </tr>
                ))}
                <tr className="table-totals-row">
                  <td>
                    <strong>Totaal projectkosten</strong>
                  </td>
                  <td colSpan={3}>Periode: 01/01/2026 - 30/06/2028</td>
                  <td>
                    <strong>{formatCurrency(totalProjectBudget)}</strong>
                  </td>
                  <td>
                    <strong>100%</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4>Indicatieve laagbudgetten uit subsidieaanvraag</h4>
          <div className="governance-stage-grid">
            {GOVERNANCE_LAYER_BUDGET_LINES.map((line) => (
              <article key={line.label} className="governance-stage-card">
                <strong>{line.label}</strong>
                <p className="muted-note">{formatCurrency(line.value)}</p>
                <p>{line.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="view-card">
          <h3>9. Grafische planning (MS-overzicht, grote blokken)</h3>
          <p className="view-subtitle">
            Visuele tijdsbalk op basis van de subsidieplanning, bewust beperkt tot de grote blokken.
          </p>
          <div className="governance-gantt-scroll">
            <div className="governance-gantt-shell">
              <div className="governance-gantt-header">
                <div className="governance-gantt-label">Blok</div>
                <div className="governance-gantt-ruler">
                  <span className="governance-gantt-boundary governance-gantt-boundary-start">
                    Start: {GOVERNANCE_MS_TIMELINE_START_ISO}
                  </span>
                  <span className="governance-gantt-boundary governance-gantt-boundary-end">
                    Einde: {GOVERNANCE_MS_TIMELINE_END_ISO}
                  </span>
                  {GOVERNANCE_MS_TIMELINE_MARKERS.map((marker) => (
                    <span
                      key={marker.id}
                      className="governance-gantt-marker"
                      style={{ left: `${toGovernanceTimelinePercent(marker.isoDate)}%` }}
                    >
                      {marker.label}
                    </span>
                  ))}
                </div>
              </div>

              {GOVERNANCE_MS_VISUAL_LANES.map((lane) => (
                <div key={lane.id} className="governance-gantt-row">
                  <div className="governance-gantt-label">{lane.label}</div>
                  <div className="governance-gantt-track">
                    {lane.blocks.map((block) => (
                      <span
                        key={block.id}
                        className={`governance-gantt-block governance-gantt-block-${block.tone}`}
                        style={getGovernanceTimelineBlockStyle(block.startIso, block.endIso)}
                        title={`${block.label} (${block.startIso} t.e.m. ${block.endIso})`}
                      >
                        {block.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <div className="governance-gantt-row governance-gantt-row-milestones">
                <div className="governance-gantt-label">Stuurgroep</div>
                <div className="governance-gantt-track governance-gantt-track-milestones">
                  {GOVERNANCE_MS_STEERING_MARKERS.map((marker) => (
                    <span
                      key={marker.id}
                      className="governance-gantt-milestone"
                      style={{ left: `${toGovernanceTimelinePercent(marker.isoDate)}%` }}
                      title={`${marker.label} (${marker.isoDate})`}
                    >
                      {marker.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="governance-source">
            Bron: {renderGovernanceSourceInline("DETAIL_PLANNING_Digitale_nuts.pdf")} +{" "}
            {renderGovernanceSourceInline("BIJLAGE D_OVERZICHT_PLANNING_DIGITALE_NUTS (1).pdf")}.
          </p>
        </section>

        <section className="view-card">
          <h3>10. Externe run-rate scenario's mobiele uitrol</h3>
          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Scenario</th>
                  <th>Maandelijks extern</th>
                  <th>Jaar 1 excl. hardware</th>
                  <th>Bron</th>
                </tr>
              </thead>
              <tbody>
                {GOVERNANCE_RUN_COST_SCENARIOS.map((scenario) => (
                  <tr key={`${scenario.variant}-${scenario.scenario}`}>
                    <td>{scenario.variant}</td>
                    <td>{scenario.scenario}</td>
                    <td>{formatCurrency(scenario.monthlyCost)}</td>
                    <td>{formatCurrency(scenario.yearlyCostExclHardware)}</td>
                    <td>{renderGovernanceSourceInline(scenario.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="view-card">
          <h3>11. Governance basisdocumenten</h3>
          {renderGovernanceSourceLine("nis2.md", "NIS2 baseline")}
          {renderGovernanceSourceLine("avg_logging.md", "AVG logging baseline")}
          {renderGovernanceSourceLine("vendor_exit.md", "Vendor-exit baseline")}
        </section>
      </main>
    );
  };

  const activeMainNavItem =
    MAIN_NAV_ITEMS.find((item) => item.key === effectiveActiveView) ?? MAIN_NAV_ITEMS[0];
  const requiresInspectorSession = !activeInspectorSession && effectiveActiveView !== "governance";

  return (
    <div className="app-shell">
      <header className="top-hero compact">
        <div className="hero-brand">
          <img src="/dn-dispatch-logo.svg" alt="DN Dispatch logo" className="hero-logo" />
          <div>
            <p className="eyebrow">Digitale Nuts</p>
            <p className="hero-version">
              Release {APP_RELEASE_VERSION} | Build {APP_BUILD_VERSION} | Port {runtimePort}
            </p>
            <h1>{activeMainNavItem.label}</h1>
            <p className="subtitle">
              {effectiveActiveView === "governance"
                ? "Volledige projectdoorloop met planning, governancepoorten, overlegcadans en budgetmonitoring."
                : "Alleen projecten met actie op de gekozen datum. Klik op een fiche om de exacte locatie op de kaart te markeren."}
            </p>
            <p className="subtitle">
              {effectiveActiveView === "governance"
                ? "Termijnbasis: formele planningstart op 2026-03-20 (subsidieafspraak)."
                : `Actieve toezichter: ${
                    activeInspectorSession
                      ? `${activeInspectorSession.inspectorName} (${activeInspectorSession.inspectorInitials})`
                      : "niet ingesteld"
                  }`}
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
              contextWorks={nonDispatchContextWorks}
              visits={mapVisits}
              selectedVisitId={selectedVisitId}
              onSelectVisit={setSelectedVisitId}
              workIdsWithVaststelling={workIdsWithVaststelling}
              onOpenVaststellingFromPopup={handleOpenVaststellingFromPopup}
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
                  manualInspectorByWorkId={manualInspectorByWorkId}
                  visibleInspectorIds={visibleInspectorIds}
                  absentInspectorIds={absentInspectorIdSet}
                  inactiveInspectorIds={inactiveInspectorIdSet}
                  selectedDate={selectedDate}
                  impactByVisitId={impactByVisitId}
                  selectedVisitId={selectedVisitId}
                  onSelectVisit={setSelectedVisitId}
                  onManualAssignWork={handleManualAssignWork}
                  onClearManualAssignWork={handleClearManualAssignWork}
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
          launchIntent={vaststellingLaunchIntent}
          onHandledLaunchIntent={handleVaststellingLaunchIntentHandled}
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
          <section className="view-card">
            <h3>Toewijzingsarchief</h3>
            <p className="view-subtitle">
              Snapshot per dispatchdatum van toegewezen dossiers. Handig voor opvolging en vergelijking met vaststellingen.
            </p>
            <div className="quick-actions">
              <button type="button" className="secondary-btn" onClick={handleExportAssignmentHistory}>
                Exporteer archief (.json)
              </button>
              <button type="button" className="ghost-btn" onClick={handleClearAssignmentHistory}>
                Wis lokaal archief
              </button>
            </div>
            <p className="muted-note">Snapshots lokaal: {assignmentHistory.length}</p>
            <p className="muted-note">
              Geselecteerde datum {selectedDate}:{" "}
              {selectedAssignmentSnapshot
                ? `${selectedAssignmentSnapshot.assignments.length} toegewezen bezoeken`
                : "nog geen snapshot"}
            </p>

            {assignmentCoverageRows.length === 0 ? (
              <p className="muted-note">
                Nog geen overzicht beschikbaar voor {selectedDate}. Open dispatch voor deze datum of maak eerst een toewijzing.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="dossier-table">
                  <thead>
                    <tr>
                      <th>Toezichter</th>
                      <th>Toegewezen bezoeken</th>
                      <th>Toegewezen werken</th>
                      <th>Manual overrides</th>
                      <th>Vaststellingen</th>
                      <th>Gedekte werken</th>
                      <th>Dekkingsgraad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentCoverageRows.map((row) => (
                      <tr key={`coverage-${row.inspectorId}`}>
                        <td>
                          {row.inspectorInitials} - {row.inspectorName}
                        </td>
                        <td>{row.assignedVisits}</td>
                        <td>{row.uniqueWorks}</td>
                        <td>{row.manualOverrides}</td>
                        <td>{row.reportsCreated}</td>
                        <td>{row.reportedWorks}</td>
                        <td>{row.coveragePct === null ? "-" : `${row.coveragePct}%`}</td>
                      </tr>
                    ))}
                    <tr className="table-totals-row">
                      <td>
                        <strong>Totaal</strong>
                      </td>
                      <td>
                        <strong>{assignmentCoverageTotals.assignedVisits}</strong>
                      </td>
                      <td>
                        <strong>{assignmentCoverageTotals.assignedWorks}</strong>
                      </td>
                      <td>-</td>
                      <td>
                        <strong>{assignmentCoverageTotals.reportsCreated}</strong>
                      </td>
                      <td>
                        <strong>{assignmentCoverageTotals.reportedWorks}</strong>
                      </td>
                      <td>
                        <strong>
                          {assignmentCoverageTotals.assignedWorks > 0
                            ? `${Math.round(
                                (assignmentCoverageTotals.reportedWorks /
                                  assignmentCoverageTotals.assignedWorks) *
                                  100
                              )}%`
                            : "-"}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="view-card">
            <h3>Recente snapshots</h3>
            <p className="view-subtitle">Laatste lokale historiekitems (meest recent eerst).</p>
            {recentAssignmentSnapshots.length === 0 ? (
              <p className="muted-note">Nog geen snapshots.</p>
            ) : (
              <div className="table-scroll">
                <table className="dossier-table">
                  <thead>
                    <tr>
                      <th>Dispatchdatum</th>
                      <th>Captured</th>
                      <th>Toegewezen bezoeken</th>
                      <th>Unassigned werken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssignmentSnapshots.map((snapshot) => (
                      <tr key={`snapshot-${snapshot.dispatchDate}`}>
                        <td>{snapshot.dispatchDate}</td>
                        <td>{formatDateTime(snapshot.capturedAt)}</td>
                        <td>{snapshot.assignments.length}</td>
                        <td>{snapshot.unassignedWorkIds.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      ) : effectiveActiveView === "handleiding" ? (
        renderGuideView()
      ) : effectiveActiveView === "governance" ? (
        renderGovernanceView()
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

      {openGovernanceDoc ? (
        <div className="settings-modal-backdrop" onClick={closeGovernanceDocViewer}>
          <section className="md-viewer-modal" onClick={(event) => event.stopPropagation()}>
            <div className="md-viewer-head">
              <div>
                <h3>Document Viewer - {openGovernanceDoc.title}</h3>
                <p className="muted-note">Bestand: {openGovernanceDoc.filePath}</p>
              </div>
              <button type="button" className="chip" onClick={closeGovernanceDocViewer}>
                Sluit
              </button>
            </div>
            {openGovernanceDoc.kind === "md" ? (
              <pre className="md-viewer-content">{openGovernanceDoc.content ?? "Geen inhoud beschikbaar."}</pre>
            ) : openGovernanceDoc.url ? (
              <iframe
                className="md-viewer-pdf"
                src={openGovernanceDoc.url}
                title={`PDF viewer - ${openGovernanceDoc.title}`}
              />
            ) : (
              <div className="md-viewer-empty">Geen PDF-bron beschikbaar.</div>
            )}
          </section>
        </div>
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
