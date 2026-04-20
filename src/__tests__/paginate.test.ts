import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";
import type { PaginatedResponse } from "../types.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function pageResponse<T>(
  data: T[],
  page: number,
  per_page: number,
  total: number,
): { ok: true; status: 200; json: () => Promise<PaginatedResponse<T>>; headers: Headers } {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.max(1, Math.ceil(total / per_page)),
      },
    }),
    headers: new Headers(),
  };
}

describe("paginate + paginateItems", () => {
  it("yields pages until total_pages is reached", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch
      .mockResolvedValueOnce(pageResponse([{ id: "e1" }, { id: "e2" }], 1, 2, 5))
      .mockResolvedValueOnce(pageResponse([{ id: "e3" }, { id: "e4" }], 2, 2, 5))
      .mockResolvedValueOnce(pageResponse([{ id: "e5" }], 3, 2, 5));

    const pages: number[] = [];
    for await (const page of client.paginate((p) => client.listEmails(p), { perPage: 2 })) {
      pages.push(page.data.length);
    }
    expect(pages).toEqual([2, 2, 1]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("flattens items across pages with paginateItems", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch
      .mockResolvedValueOnce(pageResponse([{ id: "e1" }, { id: "e2" }], 1, 2, 3))
      .mockResolvedValueOnce(pageResponse([{ id: "e3" }], 2, 2, 3));

    const ids: string[] = [];
    for await (const email of client.paginateItems((p) => client.listEmails(p), { perPage: 2 })) {
      ids.push((email as { id: string }).id);
    }
    expect(ids).toEqual(["e1", "e2", "e3"]);
  });

  it("stops early when data is empty (guards against malformed server responses)", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch.mockResolvedValueOnce(pageResponse([], 1, 50, 1000));

    const items: unknown[] = [];
    for await (const item of client.paginateItems((p) => client.listEmails(p))) {
      items.push(item);
    }
    expect(items).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("respects startPage", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch.mockResolvedValueOnce(pageResponse([{ id: "e5" }], 3, 2, 5));

    const collected: string[] = [];
    for await (const item of client.paginateItems((p) => client.listEmails(p), {
      perPage: 2,
      startPage: 3,
    })) {
      collected.push((item as { id: string }).id);
    }
    expect(collected).toEqual(["e5"]);
    const [firstUrl] = mockFetch.mock.calls[0];
    expect(firstUrl).toContain("page=3");
    expect(firstUrl).toContain("per_page=2");
  });

  it("passes custom filter params through the closure", async () => {
    const client = new EuroMail({ apiKey: "em_test_key", maxRetries: 0 });
    mockFetch.mockResolvedValueOnce(pageResponse([{ id: "e1" }], 1, 50, 1));

    for await (const _ of client.paginateItems((p) =>
      client.listEmails({ ...p, status: "delivered" }),
    )) {
      // consume
    }
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("status=delivered");
  });
});
