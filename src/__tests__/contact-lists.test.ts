import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const sampleList = {
  id: "cl_001",
  account_id: "acct_1",
  name: "Newsletter",
  description: "Monthly newsletter subscribers",
  double_opt_in: true,
  contact_count: 150,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("createContactList", () => {
  it("creates a contact list and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: sampleList }),
      headers: new Headers(),
    });
    const result = await client.createContactList({
      name: "Newsletter",
      description: "Monthly newsletter subscribers",
      double_opt_in: true,
    });
    expect(result).toEqual(sampleList);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/contact-lists");
    expect(init.method).toBe("POST");
  });
});

describe("listContactLists", () => {
  it("returns array of contact lists (not paginated)", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [sampleList] }),
      headers: new Headers(),
    });
    const result = await client.listContactLists();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Newsletter");
  });
});

describe("getContactList", () => {
  it("gets a contact list and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: sampleList }),
      headers: new Headers(),
    });
    const result = await client.getContactList("cl_001");
    expect(result.id).toBe("cl_001");
  });
});

describe("updateContactList", () => {
  it("updates and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const updated = { ...sampleList, name: "Updated Newsletter" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: updated }),
      headers: new Headers(),
    });
    const result = await client.updateContactList("cl_001", {
      name: "Updated Newsletter",
      double_opt_in: true,
    });
    expect(result.name).toBe("Updated Newsletter");
    const init = mockFetch.mock.calls[0][1];
    expect(init.method).toBe("PUT");
  });
});

describe("deleteContactList", () => {
  it("deletes a contact list", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
      headers: new Headers(),
    });
    await client.deleteContactList("cl_001");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/contact-lists/cl_001");
    expect(init.method).toBe("DELETE");
  });
});

describe("addContact", () => {
  it("adds a contact and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const contact = {
      id: "ct_001",
      list_id: "cl_001",
      email: "subscriber@example.com",
      metadata: null,
      status: "active",
      created_at: "2026-03-07T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: contact }),
      headers: new Headers(),
    });
    const result = await client.addContact("cl_001", { email: "subscriber@example.com" });
    expect(result.email).toBe("subscriber@example.com");
    expect(mockFetch.mock.calls[0][0]).toContain("/v1/contact-lists/cl_001/contacts");
  });
});

describe("bulkAddContacts", () => {
  it("bulk adds contacts and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { inserted: 3, total_requested: 5 } }),
      headers: new Headers(),
    });
    const result = await client.bulkAddContacts("cl_001", {
      contacts: [
        { email: "a@b.com" },
        { email: "c@d.com" },
        { email: "e@f.com", metadata: { source: "web" } },
      ],
    });
    expect(result.inserted).toBe(3);
    expect(result.total_requested).toBe(5);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.contacts).toHaveLength(3);
  });
});

describe("listContacts", () => {
  it("returns paginated contacts", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: "ct_001", email: "a@b.com" }],
        pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
      }),
      headers: new Headers(),
    });
    const result = await client.listContacts("cl_001", { page: 1, per_page: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it("passes status filter as query param", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
      }),
      headers: new Headers(),
    });
    await client.listContacts("cl_001", { status: "active" });
    expect(mockFetch.mock.calls[0][0]).toContain("status=active");
  });
});

describe("removeContact", () => {
  it("removes a contact", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
      headers: new Headers(),
    });
    await client.removeContact("cl_001", "subscriber@example.com");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/contact-lists/cl_001/contacts/subscriber%40example.com");
    expect(init.method).toBe("DELETE");
  });
});
