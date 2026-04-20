import { describe, it, expect, vi, beforeEach } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("listNewsletters pagination", () => {
  it("sends no pagination params when none are provided", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
      headers: new Headers(),
    });
    await client.listNewsletters();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.euromail.dev/v1/newsletters");
  });

  it("honors per_page even when page is not set", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
      headers: new Headers(),
    });
    await client.listNewsletters({ per_page: 50 });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=0");
  });

  it("converts page/per_page to limit/offset", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
      headers: new Headers(),
    });
    await client.listNewsletters({ page: 3, per_page: 25 });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("limit=25");
    expect(url).toContain("offset=50");
  });
});
