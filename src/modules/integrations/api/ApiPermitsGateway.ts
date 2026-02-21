import type {
  IntegrationMode,
  PermitLookupResult,
  PermitsGateway,
} from "../contracts";

export class ApiPermitsGateway implements PermitsGateway {
  readonly name = "ApiPermitsGateway";
  readonly mode: IntegrationMode = "api";

  async getPermitStatus(_permitReference: string): Promise<PermitLookupResult | null> {
    return null;
  }
}
