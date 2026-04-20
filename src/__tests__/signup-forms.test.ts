import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const sampleForm = {
  id: "sf_001",
  account_id: "acct_1",
  list_id: "cl_001",
  slug: "newsletter-a1b2c3",
  title: "Subscribe to updates",
  description: "Weekly news delivered to your inbox.",
  success_message: "Thank you for subscribing!",
  redirect_url: null,
  custom_fields: [{ name: "first_name", label: "First Name", type: "text", required: true }],
  theme: {},
  is_active: true,
  form_url: "https://api.euromail.dev/subscribe/newsletter-a1b2c3",
  embed_code:
    '<iframe src="https://api.euromail.dev/subscribe/newsletter-a1b2c3" width="100%" height="400" frameborder="0"></iframe>',
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

describe("createSignupForm", () => {
  it("creates a signup form and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: sampleForm }),
      headers: new Headers(),
    });
    const result = await client.createSignupForm({
      list_id: "cl_001",
      title: "Subscribe to updates",
      description: "Weekly news delivered to your inbox.",
      custom_fields: [{ name: "first_name", label: "First Name", type: "text", required: true }],
    });
    expect(result).toEqual(sampleForm);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/signup-forms");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.list_id).toBe("cl_001");
    expect(body.title).toBe("Subscribe to updates");
  });
});

describe("listSignupForms", () => {
  it("returns array of signup forms", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [sampleForm] }),
      headers: new Headers(),
    });
    const result = await client.listSignupForms();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("newsletter-a1b2c3");
  });
});

describe("getSignupForm", () => {
  it("gets a signup form and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: sampleForm }),
      headers: new Headers(),
    });
    const result = await client.getSignupForm("sf_001");
    expect(result.id).toBe("sf_001");
    expect(result.form_url).toContain("/subscribe/");
  });
});

describe("updateSignupForm", () => {
  it("updates and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const updated = { ...sampleForm, title: "Updated Title" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: updated }),
      headers: new Headers(),
    });
    const result = await client.updateSignupForm("sf_001", {
      title: "Updated Title",
    });
    expect(result.title).toBe("Updated Title");
    const init = mockFetch.mock.calls[0][1];
    expect(init.method).toBe("PUT");
  });
});

describe("deleteSignupForm", () => {
  it("deletes a signup form", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => undefined,
      headers: new Headers(),
    });
    await client.deleteSignupForm("sf_001");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/signup-forms/sf_001");
    expect(init.method).toBe("DELETE");
  });
});

describe("toggleSignupForm", () => {
  it("toggles form active status and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const toggled = { ...sampleForm, is_active: false };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: toggled }),
      headers: new Headers(),
    });
    const result = await client.toggleSignupForm("sf_001");
    expect(result.is_active).toBe(false);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/signup-forms/sf_001/toggle");
    expect(init.method).toBe("POST");
  });
});
