import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("importSuppressions", () => {
  it("sends emails and reason, returns the import result", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { inserted: 2, total_requested: 3, invalid_addresses: ["not-an-email"] },
      }),
      headers: new Headers(),
    });

    const result = await client.importSuppressions(
      ["a@example.com", "b@example.com", "not-an-email"],
      "bulk-cleanup",
    );

    expect(result).toEqual({
      inserted: 2,
      total_requested: 3,
      invalid_addresses: ["not-an-email"],
    });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      emails: ["a@example.com", "b@example.com", "not-an-email"],
      reason: "bulk-cleanup",
    });
  });

  it("omits reason when not given", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { inserted: 1, total_requested: 1, invalid_addresses: [] } }),
      headers: new Headers(),
    });

    await client.importSuppressions(["a@example.com"]);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ emails: ["a@example.com"] });
  });
});

describe("exportSuppressions", () => {
  it("returns the raw CSV body", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    const csv = "email_address,reason,created_at\na@example.com,manual,2026-01-01T00:00:00Z\n";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => csv,
      headers: new Headers({ "content-type": "text/csv" }),
    });

    const result = await client.exportSuppressions();

    expect(result).toBe(csv);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/suppressions/export"),
      expect.anything(),
    );
  });
});
