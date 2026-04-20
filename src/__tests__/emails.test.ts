import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("sendEmail", () => {
  it("sends email and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const emailResponse = {
      id: "email_001",
      message_id: "<msg@euromail.dev>",
      status: "queued",
      to: "user@example.com",
      created_at: "2026-03-07T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: emailResponse }),
      headers: new Headers(),
    });
    const result = await client.sendEmail({
      from: "sender@example.com",
      to: "user@example.com",
      subject: "Hello",
      html_body: "<p>Hi</p>",
    });
    expect(result).toEqual(emailResponse);
    expect(result.id).toBe("email_001");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/emails");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.from).toBe("sender@example.com");
    expect(body.to).toBe("user@example.com");
  });

  it("includes attachments in request body", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: "email_002",
          message_id: "<m>",
          status: "queued",
          to: "u@e.com",
          created_at: "",
        },
      }),
      headers: new Headers(),
    });
    await client.sendEmail({
      from: "a@b.com",
      to: "c@d.com",
      subject: "With attachment",
      text_body: "See attached",
      attachments: [
        { filename: "test.pdf", content: "base64data", content_type: "application/pdf" },
      ],
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].filename).toBe("test.pdf");
  });
});

describe("sendBatch", () => {
  it("sends batch and returns full response", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const batchResponse = {
      data: [
        { id: "email_001", message_id: "<m1>", status: "queued", to: "a@b.com", created_at: "" },
      ],
      errors: [],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => batchResponse,
      headers: new Headers(),
    });
    const result = await client.sendBatch({
      emails: [{ from: "s@e.com", to: "a@b.com", subject: "Hi", text_body: "Hello" }],
    });
    expect(result.data).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});

describe("getEmail", () => {
  it("unwraps envelope and returns Email", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const email = {
      id: "email_123",
      account_id: "acct_1",
      domain_id: null,
      message_id: "<msg@euromail.dev>",
      from_address: "s@e.com",
      to_address: "r@e.com",
      cc: null,
      bcc: null,
      reply_to: null,
      subject: "Test",
      html_body: null,
      text_body: "Hello",
      template_id: null,
      template_data: null,
      headers: {},
      tags: [],
      metadata: {},
      status: "delivered",
      attempts: 1,
      max_attempts: 3,
      error_message: null,
      smtp_response: "250 OK",
      created_at: "2026-03-07T00:00:00Z",
      updated_at: "2026-03-07T00:00:01Z",
      sent_at: "2026-03-07T00:00:01Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: email }),
      headers: new Headers(),
    });
    const result = await client.getEmail("email_123");
    expect(result).toEqual(email);
    expect(result.status).toBe("delivered");
  });

  it("encodes email ID in URL", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "email/special" } }),
      headers: new Headers(),
    });
    await client.getEmail("email/special");
    expect(mockFetch.mock.calls[0][0]).toContain("/v1/emails/email%2Fspecial");
  });
});

describe("listEmails", () => {
  it("returns paginated response without unwrapping", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const paginatedResponse = {
      data: [{ id: "email_1" }, { id: "email_2" }],
      pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => paginatedResponse,
      headers: new Headers(),
    });
    const result = await client.listEmails({ page: 1, per_page: 20 });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
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
    await client.listEmails({ status: "delivered" });
    expect(mockFetch.mock.calls[0][0]).toContain("status=delivered");
  });
});
