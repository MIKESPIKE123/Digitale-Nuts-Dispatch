import { describe, expect, it, vi } from "vitest";
import { ApiNotificationsGateway } from "./ApiNotificationsGateway";

describe("ApiNotificationsGateway contract", () => {
  it("returns empty taxonomy arrays by default", async () => {
    const gateway = new ApiNotificationsGateway();

    await expect(gateway.getNotificationTypes()).resolves.toEqual([]);
    await expect(gateway.getNotificationCategories()).resolves.toEqual([]);
    await expect(gateway.getNotificationStatuses()).resolves.toEqual([]);
  });

  it("returns empty search results by default", async () => {
    const gateway = new ApiNotificationsGateway();
    const result = await gateway.searchNotifications({});

    expect(result).toEqual({
      items: [],
      totalItems: 0,
      hasNextPage: false,
    });
  });

  it("returns null detail and a 501 update placeholder when not configured", async () => {
    const gateway = new ApiNotificationsGateway();

    await expect(gateway.getNotificationDetail("notif-1")).resolves.toBeNull();
    await expect(
      gateway.updateNotificationStatus({
        notificationId: "notif-1",
        statusId: "status-done",
      })
    ).resolves.toEqual({
      ok: false,
      statusCode: 501,
      error: "Notifications update endpoint not configured.",
      source: "api",
    });
  });

  it("resolves label filters through taxonomies and maps labels in results", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/taxonomies/statuses")) {
        return new Response(
          JSON.stringify([{ id: "status-new", prefLabel: "Nieuw" }]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      if (url.pathname.endsWith("/taxonomies/notificationtypes")) {
        return new Response(
          JSON.stringify([{ id: "ntf-expiry-warning", prefLabel: "Expiry warning" }]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      if (url.pathname.endsWith("/taxonomies/notification-categories")) {
        return new Response(
          JSON.stringify([{ id: "cat-warning", prefLabel: "Warning" }]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      if (url.pathname.endsWith("/notifications")) {
        return new Response(
          JSON.stringify({
            totalItems: 1,
            member: [
              {
                notificationId: "notif-2001",
                createdOn: "2026-02-28T10:00:00.000Z",
                statusId: "status-new",
                notificationTypeId: "ntf-expiry-warning",
                notificationCategoryId: "cat-warning",
                data: { gipodId: "19230012" },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    });

    const gateway = new ApiNotificationsGateway({
      baseUrl: "https://example.test",
      bearerToken: "test-token",
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const result = await gateway.searchNotifications({
      statusLabels: ["nieuw"],
      notificationTypeLabels: ["expiry warning"],
      notificationCategoryLabels: ["warning"],
      limit: 5,
      offset: 0,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].notificationCategoryLabel).toBe("Warning");
    expect(result.items[0].notificationTypeLabel).toBe("Expiry warning");
    expect(result.items[0].statusLabel).toBe("Nieuw");

    const notificationCall = fetchMock.mock.calls.find(([input]) =>
      new URL(String(input)).pathname.endsWith("/notifications")
    );
    expect(notificationCall).toBeDefined();

    const usedUrl = new URL(String(notificationCall?.[0]));
    expect(usedUrl.searchParams.getAll("statusId")).toContain("status-new");
    expect(usedUrl.searchParams.getAll("notificationTypeId")).toContain(
      "ntf-expiry-warning"
    );
    expect(usedUrl.searchParams.getAll("notificationCategoryId")).toContain("cat-warning");
  });

  it("supports status updates when configured", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (!url.pathname.endsWith("/notifications/notif-3001")) {
        return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
      }

      expect(init?.method).toBe("PUT");
      expect((init?.headers as Record<string, string>)?.Authorization).toBe("Bearer test-token");

      return new Response(
        JSON.stringify({
          statusId: "status-done",
          updatedAt: "2026-02-28T11:00:00.000Z",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    });

    const gateway = new ApiNotificationsGateway({
      baseUrl: "https://example.test",
      bearerToken: "test-token",
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const result = await gateway.updateNotificationStatus({
      notificationId: "notif-3001",
      statusId: "status-done",
      comment: "Handled in DN",
      actorId: "dispatcher-01",
    });

    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      statusId: "status-done",
      updatedAt: "2026-02-28T11:00:00.000Z",
      source: "api",
    });
  });

  it("throws on HTTP 429 so caller can apply backoff", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/taxonomies/statuses")) {
        return new Response("{}", {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const gateway = new ApiNotificationsGateway({
      baseUrl: "https://example.test",
      bearerToken: "test-token",
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    await expect(gateway.searchNotifications({ limit: 5 })).rejects.toThrow("HTTP 429");
  });
});
