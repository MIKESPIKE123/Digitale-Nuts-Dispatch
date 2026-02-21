import type {
  IntegrationMode,
  PermitLookupResult,
  PermitStatus,
  PermitsGateway,
} from "../contracts";

const STATUS_ROTATION: PermitStatus[] = ["VALID", "UNKNOWN", "BLOCKED", "EXPIRED"];

function computeHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash += value.charCodeAt(index) * (index + 1);
  }
  return Math.abs(hash);
}

export class MockPermitsGateway implements PermitsGateway {
  readonly name = "MockPermitsGateway";
  readonly mode: IntegrationMode = "mock";

  async getPermitStatus(permitReference: string): Promise<PermitLookupResult | null> {
    const clean = permitReference.trim();
    if (!clean) {
      return null;
    }

    const status = STATUS_ROTATION[computeHash(clean) % STATUS_ROTATION.length];

    return {
      permitReference: clean,
      status,
      source: "mock",
      updatedAt: new Date().toISOString(),
      notes: "Mock vergunningstatus voor pitch/demo.",
    };
  }
}
