import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";
import type { Domain } from "../types.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function domainResponse(requireTls: boolean): { data: Partial<Domain> } {
  return { data: { id: "dom_1", domain: "mail.example.com", require_tls: requireTls } };
}

function respondWith(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    headers: new Headers(),
  });
}

describe("updateDomain", () => {
  it("PATCHes only the given settings and returns the updated domain", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    respondWith(domainResponse(true));

    const domain = await client.updateDomain("dom_1", { require_tls: true });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.euromail.dev/v1/domains/dom_1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ require_tls: true });
    expect(domain.require_tls).toBe(true);
  });
});
