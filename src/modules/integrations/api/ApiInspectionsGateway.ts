import type {
  InspectionSyncAck,
  InspectionSyncCommand,
  InspectionSyncResult,
  InspectionsGateway,
  IntegrationMode,
} from "../contracts";

async function postWithTimeout(url: string, body: Record<string, unknown>, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": body.idempotencyKey as string,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function readJsonSafe(response: Response): Promise<Record<string, unknown> | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    const parsed = (await response.json()) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function parseAck(
  body: Record<string, unknown> | null,
  fallbackInspectionId: string,
  fallbackIdempotencyKey: string
): InspectionSyncAck | undefined {
  if (!body) {
    return undefined;
  }

  const outcomeRaw =
    typeof body.outcome === "string" ? body.outcome.toLowerCase() : undefined;
  const outcome =
    outcomeRaw === "accepted" || outcomeRaw === "duplicate" || outcomeRaw === "rejected"
      ? outcomeRaw
      : undefined;

  if (!outcome) {
    return undefined;
  }

  return {
    outcome,
    inspectionId:
      typeof body.inspectionId === "string" && body.inspectionId.trim().length > 0
        ? body.inspectionId
        : fallbackInspectionId,
    idempotencyKey:
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim().length > 0
        ? body.idempotencyKey
        : fallbackIdempotencyKey,
    syncEventId:
      typeof body.syncEventId === "string" && body.syncEventId.trim().length > 0
        ? body.syncEventId
        : undefined,
    processedAt:
      typeof body.processedAt === "string" && body.processedAt.trim().length > 0
        ? body.processedAt
        : undefined,
    serverVersion:
      typeof body.serverVersion === "string" && body.serverVersion.trim().length > 0
        ? body.serverVersion
        : undefined,
    mappedStatus:
      body.mappedStatus === "planned" ||
      body.mappedStatus === "in_progress" ||
      body.mappedStatus === "temporary_restore" ||
      body.mappedStatus === "closed"
        ? body.mappedStatus
        : undefined,
    statusMappingSource:
      typeof body.statusMappingSource === "string" && body.statusMappingSource.trim().length > 0
        ? body.statusMappingSource
        : undefined,
  };
}

function parseApiError(body: Record<string, unknown> | null, status: number): string {
  if (!body) {
    return `HTTP ${status}`;
  }

  const topLevelError = typeof body.error === "string" ? body.error : "";
  if (topLevelError.trim().length > 0) {
    return topLevelError.trim();
  }

  const detailError =
    body.error && typeof body.error === "object"
      ? (body.error as Record<string, unknown>).message
      : undefined;
  if (typeof detailError === "string" && detailError.trim().length > 0) {
    return detailError.trim();
  }

  return `HTTP ${status}`;
}

export class ApiInspectionsGateway implements InspectionsGateway {
  readonly name = "ApiInspectionsGateway";
  readonly mode: IntegrationMode = "api";

  async syncInspection(command: InspectionSyncCommand): Promise<InspectionSyncResult> {
    try {
      const response = await postWithTimeout(
        command.endpoint,
        {
          itemId: command.itemId,
          itemType: command.itemType,
          inspectionId: command.inspectionId,
          idempotencyKey: command.idempotencyKey,
          mutationVersion: command.mutationVersion,
          createdAt: command.createdAt,
          payload: command.payload,
          deviceId: command.deviceId,
          attempts: command.attempts,
        },
        command.timeoutMs
      );
      const responseBody = await readJsonSafe(response);
      const ack = parseAck(responseBody, command.inspectionId, command.idempotencyKey);
      const isDuplicate = response.status === 208 || ack?.outcome === "duplicate";

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error: parseApiError(responseBody, response.status),
          ack,
          duplicate: isDuplicate,
        };
      }

      return {
        ok: true,
        statusCode: response.status,
        ack,
        duplicate: isDuplicate,
      };
    } catch (error) {
      return {
        ok: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : "Onbekende sync fout",
      };
    }
  }
}
