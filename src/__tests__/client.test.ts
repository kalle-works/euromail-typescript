import { describe, it, expect, vi, beforeEach } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("EuroMail constructor", () => {
  it("throws if apiKey is empty", () => {
    expect(() => new EuroMail({ apiKey: "" })).toThrow("EuroMail API key is required");
  });

  it("uses default base URL", () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "acct_1" } }),
      headers: new Headers(),
    });
    client.getAccount();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.euromail.dev/v1/account"),
      expect.anything()
    );
  });

  it("uses custom base URL and strips trailing slash", () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      baseUrl: "https://custom.api.com/",
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "acct_1" } }),
      headers: new Headers(),
    });
    client.getAccount();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://custom.api.com/v1/account"),
      expect.anything()
    );
  });

  it("sends Authorization header with Bearer token", async () => {
    const client = new EuroMail({ apiKey: "em_my_secret_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "acct_1", name: "Test" } }),
      headers: new Headers(),
    });
    await client.getAccount();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer em_my_secret_key");
  });

  it("sets Accept header to application/json", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "acct_1" } }),
      headers: new Headers(),
    });
    await client.getAccount();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Accept).toBe("application/json");
  });
});

describe("getAccount", () => {
  it("unwraps envelope and returns Account", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const account = {
      id: "acct_123",
      name: "Test Account",
      email: "test@example.com",
      plan: "starter",
      monthly_quota: 10000,
      emails_sent_this_month: 42,
      quota_reset_at: "2026-04-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: account }),
      headers: new Headers(),
    });
    const result = await client.getAccount();
    expect(result).toEqual(account);
    expect(result.id).toBe("acct_123");
  });
});
