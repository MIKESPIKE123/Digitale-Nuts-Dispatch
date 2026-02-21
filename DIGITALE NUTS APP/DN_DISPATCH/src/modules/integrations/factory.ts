import { ApiComplaintsGateway } from "./api/ApiComplaintsGateway";
import { ApiInspectionsGateway } from "./api/ApiInspectionsGateway";
import { ApiPermitsGateway } from "./api/ApiPermitsGateway";
import { ApiWorksGateway } from "./api/ApiWorksGateway";
import type {
  ComplaintsGateway,
  InspectionsGateway,
  PermitsGateway,
  WorksGateway,
} from "./contracts";
import { INTEGRATION_FLAGS } from "./flags";
import { MockComplaintsGateway } from "./mock/MockComplaintsGateway";
import { MockInspectionsGateway } from "./mock/MockInspectionsGateway";
import { MockPermitsGateway } from "./mock/MockPermitsGateway";
import { MockWorksGateway } from "./mock/MockWorksGateway";

let worksGatewaySingleton: WorksGateway | null = null;
let inspectionsGatewaySingleton: InspectionsGateway | null = null;
let permitsGatewaySingleton: PermitsGateway | null = null;
let complaintsGatewaySingleton: ComplaintsGateway | null = null;

function buildWorksGateway(): WorksGateway {
  return INTEGRATION_FLAGS.useMockWorks ? new MockWorksGateway() : new ApiWorksGateway();
}

function buildInspectionsGateway(): InspectionsGateway {
  return INTEGRATION_FLAGS.useMockGipod
    ? new MockInspectionsGateway()
    : new ApiInspectionsGateway();
}

function buildPermitsGateway(): PermitsGateway {
  return INTEGRATION_FLAGS.useMockASign ? new MockPermitsGateway() : new ApiPermitsGateway();
}

function buildComplaintsGateway(): ComplaintsGateway {
  return INTEGRATION_FLAGS.useMockKlm
    ? new MockComplaintsGateway()
    : new ApiComplaintsGateway();
}

export function getWorksGateway(): WorksGateway {
  if (!worksGatewaySingleton) {
    worksGatewaySingleton = buildWorksGateway();
  }
  return worksGatewaySingleton;
}

export function getInspectionsGateway(): InspectionsGateway {
  if (!inspectionsGatewaySingleton) {
    inspectionsGatewaySingleton = buildInspectionsGateway();
  }
  return inspectionsGatewaySingleton;
}

export function getPermitsGateway(): PermitsGateway {
  if (!permitsGatewaySingleton) {
    permitsGatewaySingleton = buildPermitsGateway();
  }
  return permitsGatewaySingleton;
}

export function getComplaintsGateway(): ComplaintsGateway {
  if (!complaintsGatewaySingleton) {
    complaintsGatewaySingleton = buildComplaintsGateway();
  }
  return complaintsGatewaySingleton;
}

export function resetIntegrationGatewayCache(): void {
  worksGatewaySingleton = null;
  inspectionsGatewaySingleton = null;
  permitsGatewaySingleton = null;
  complaintsGatewaySingleton = null;
}
