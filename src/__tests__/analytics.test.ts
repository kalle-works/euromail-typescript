import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getAnalyticsOverview", () => {
  it("returns analytics summary", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const summary = {
      data: {
        sent: 1000,
        delivered: 950,
        bounced: 20,
        opens: 400,
        clicks: 100,
        complaints: 2,
        delivery_rate: 0.95,
        open_rate: 0.42,
        click_rate: 0.11,
      },
      period: { from: "2026-02-07", to: "2026-03-07", period: "30d" },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => summary,
      headers: new Headers(),
    });
    const result = await client.getAnalyticsOverview({ period: "30d" });
    expect(result.data.sent).toBe(1000);
    expect(result.period.period).toBe("30d");
    expect(mockFetch.mock.calls[0][0]).toContain("period=30d");
  });

  it("works without query params", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: {}, period: {} }),
      headers: new Headers(),
    });
    await client.getAnalyticsOverview();
    expect(mockFetch.mock.calls[0][0]).toContain("/v1/analytics/overview?");
  });

  it("passes from and to date params", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: {}, period: {} }),
      headers: new Headers(),
    });
    await client.getAnalyticsOverview({ from: "2026-01-01", to: "2026-01-31" });
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("from=2026-01-01");
    expect(url).toContain("to=2026-01-31");
  });
});

describe("getAnalyticsTimeseries", () => {
  it("returns timeseries data", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const response = {
      data: [
        { date: "2026-03-01", sent: 100, delivered: 95 },
        { date: "2026-03-02", sent: 120, delivered: 115 },
      ],
      period: { from: "2026-03-01", to: "2026-03-07", period: "7d" },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => response,
      headers: new Headers(),
    });
    const result = await client.getAnalyticsTimeseries({ period: "7d", metrics: "sent,delivered" });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].sent).toBe(100);
    expect(mockFetch.mock.calls[0][0]).toContain("metrics=sent%2Cdelivered");
  });
});

describe("getAnalyticsDomains", () => {
  it("returns domain analytics", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const response = {
      data: [
        {
          domain: "example.com",
          sent: 500,
          delivered: 480,
          bounced: 10,
          open_rate: 0.4,
          click_rate: 0.1,
        },
      ],
      period: { from: "2026-02-07", to: "2026-03-07", period: "30d" },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => response,
      headers: new Headers(),
    });
    const result = await client.getAnalyticsDomains({ period: "30d", limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].domain).toBe("example.com");
    expect(mockFetch.mock.calls[0][0]).toContain("limit=10");
  });
});

describe("exportAnalyticsCsv", () => {
  it("returns CSV text", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const csvText = "date,sent,delivered\n2026-03-01,100,95\n2026-03-02,120,115";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => csvText,
      headers: new Headers(),
    });
    const result = await client.exportAnalyticsCsv({ period: "7d" });
    expect(result).toBe(csvText);
    expect(result).toContain("date,sent,delivered");
  });

  it("sends Bearer auth header for CSV export", async () => {
    const client = new EuroMail({ apiKey: "em_secret" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => "csv",
      headers: new Headers(),
    });
    await client.exportAnalyticsCsv();
    const init = mockFetch.mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer em_secret");
  });
});

describe("listAuditLogs", () => {
  it("returns paginated audit logs", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const response = {
      data: [
        {
          id: "log_001",
          account_id: "acct_1",
          action: "email.sent",
          resource_type: "email",
          resource_id: "email_001",
          ip_address: "192.168.1.1",
          user_agent: "SDK/0.1.0",
          details: null,
          created_at: "2026-03-07T00:00:00Z",
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => response,
      headers: new Headers(),
    });
    const result = await client.listAuditLogs({ page: 1, per_page: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].action).toBe("email.sent");
    expect(result.pagination.total).toBe(1);
  });
});
