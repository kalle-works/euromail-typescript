import { describe, it, expect, vi, beforeEach } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("createMailbox", () => {
  it("creates a mailbox and unwraps envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const mailbox = {
      id: "mbx_001",
      account_id: "acct_1",
      local_part: "agent-abc123",
      domain: "inbox.euromail.dev",
      address: "agent-abc123@inbox.euromail.dev",
      display_name: "Support Agent",
      created_at: "2026-04-13T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: mailbox }),
      headers: new Headers(),
    });

    const result = await client.createMailbox({ display_name: "Support Agent" });
    expect(result).toEqual(mailbox);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.display_name).toBe("Support Agent");
  });

  it("sends an empty body when no params are provided", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "mbx_002" } }),
      headers: new Headers(),
    });
    await client.createMailbox();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({});
  });
});

describe("waitForNextMessage", () => {
  it("returns the leased message envelope on 200", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const leased = {
      data: {
        id: "msg_001",
        mailbox_id: "mbx_001",
        account_id: "acct_1",
        message_id: "<msg@example.com>",
        mail_from: "sender@example.com",
        from_header: "Sender <sender@example.com>",
        reply_to: null,
        subject: "Hello",
        text_body: "Hi there",
        html_body: null,
        size_bytes: 42,
        thread_id: null,
        labels: [],
        read_at: null,
        created_at: "2026-04-13T00:00:00Z",
      },
      lease_token: "lease_abc",
      lease_expires_at: "2026-04-13T00:05:00Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => leased,
      headers: new Headers(),
    });

    const result = await client.waitForNextMessage("mbx_001", { timeout: 30 });
    expect(result).not.toBeNull();
    expect(result?.lease_token).toBe("lease_abc");
    expect(result?.data.id).toBe("msg_001");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/next");
    expect(url).toContain("timeout=30");
  });

  it("returns null when the server responds with HTTP 408", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 408,
      json: async () => ({}),
      text: async () => "",
      headers: new Headers(),
    });

    const result = await client.waitForNextMessage("mbx_001", { timeout: 1 });
    expect(result).toBeNull();
  });
});

describe("ackMessage", () => {
  it("POSTs the lease token to the ack endpoint", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });

    await client.ackMessage("mbx_001", "msg_001", "lease_abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/msg_001/ack");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ lease_token: "lease_abc" });
  });
});

describe("nackMessage", () => {
  it("POSTs the lease token to the nack endpoint", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });

    await client.nackMessage("mbx_001", "msg_001", "lease_abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/msg_001/nack");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ lease_token: "lease_abc" });
  });
});
