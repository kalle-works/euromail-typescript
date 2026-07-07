import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("replyToMessage", () => {
  it("POSTs the reply body and unwraps the envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const reply = {
      id: "eml_reply1",
      status: "queued",
      message_id: "<reply@euromail.dev>",
      to: "sender@example.com",
      subject: "Re: Hello",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: reply }),
      headers: new Headers(),
    });

    const result = await client.replyToMessage("mbx_001", "msg_001", {
      text_body: "Thanks for reaching out",
    });
    expect(result).toEqual(reply);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/msg_001/reply");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ text_body: "Thanks for reaching out" });
  });

  it("surfaces a 400 when neither body is provided", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ code: "invalid_request", message: "text_body or html_body required" }),
      text: async () => "",
      headers: new Headers({ "content-type": "application/json" }),
    });

    await expect(client.replyToMessage("mbx_001", "msg_001", {})).rejects.toThrow();
  });
});

describe("listMailboxThreads", () => {
  it("GETs the threads endpoint with pagination and unwraps the envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const threads = [{ id: "msg_010", thread_id: "thr_1" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: threads }),
      headers: new Headers(),
    });

    const result = await client.listMailboxThreads("mbx_001", { limit: 10, offset: 5 });
    expect(result).toEqual(threads);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/threads");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
    expect(init.method).toBe("GET");
  });

  it("omits the query string when no params are given", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
      headers: new Headers(),
    });

    await client.listMailboxThreads("mbx_001");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/v1\/agent-mailboxes\/mbx_001\/threads$/);
  });
});

describe("getMailboxThread", () => {
  it("GETs a single thread with the thread id in the path", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const messages = [
      { id: "msg_010", thread_id: "thr_1" },
      { id: "msg_011", thread_id: "thr_1" },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: messages }),
      headers: new Headers(),
    });

    const result = await client.getMailboxThread("mbx_001", "thr_1", { limit: 100 });
    expect(result).toEqual(messages);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/threads/thr_1");
    expect(url).toContain("limit=100");
  });
});

describe("searchMailboxMessages", () => {
  it("GETs the search endpoint with the required q param", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const messages = [{ id: "msg_020" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: messages }),
      headers: new Headers(),
    });

    const result = await client.searchMailboxMessages("mbx_001", "invoice #42", { limit: 25 });
    expect(result).toEqual(messages);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/search");
    expect(url).toContain("q=invoice+%2342");
    expect(url).toContain("limit=25");
  });
});

describe("updateMessageLabels", () => {
  it("PUTs the full label set and returns the resulting labels", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { labels: ["urgent", "sales"] } }),
      headers: new Headers(),
    });

    const result = await client.updateMessageLabels("mbx_001", "msg_001", ["urgent", "sales"]);
    expect(result).toEqual(["urgent", "sales"]);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/msg_001/labels");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ labels: ["urgent", "sales"] });
  });
});

describe("getMessageAttachmentUrls", () => {
  it("returns pre-signed download URLs", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const attachments = [
      {
        filename: "invoice.pdf",
        content_type: "application/pdf",
        size: 1024,
        url: "https://storage.euromail.dev/signed/abc",
        expires_in_seconds: 3600,
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: attachments }),
      headers: new Headers(),
    });

    const result = await client.getMessageAttachmentUrls("mbx_001", "msg_001");
    expect(result).toEqual(attachments);
    expect(result[0].url).toBe("https://storage.euromail.dev/signed/abc");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/messages/msg_001/attachments");
  });

  it("tolerates the raw-metadata fallback shape without url/expires fields", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const rawMetadata = [
      { filename: "note.txt", content_type: "text/plain", size: 12, content_id: "cid-1" },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: rawMetadata }),
      headers: new Headers(),
    });

    const result = await client.getMessageAttachmentUrls("mbx_001", "msg_001");
    expect(result[0].url).toBeUndefined();
    expect(result[0].filename).toBe("note.txt");
    expect(result[0].content_id).toBe("cid-1");
  });
});

describe("listMailboxContacts", () => {
  it("GETs the contacts endpoint and unwraps the envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const contacts = [
      {
        email: "sender@example.com",
        display_name: "Sender",
        message_count: 3,
        last_seen: "2026-07-01T00:00:00Z",
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: contacts }),
      headers: new Headers(),
    });

    const result = await client.listMailboxContacts("mbx_001", { limit: 20, offset: 0 });
    expect(result).toEqual(contacts);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/contacts");
    expect(url).toContain("limit=20");
    expect(url).toContain("offset=0");
  });
});

describe("getMailboxAnalytics", () => {
  it("GETs analytics and unwraps the envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const analytics = {
      total_messages: 42,
      unread_messages: 3,
      total_threads: 12,
      messages_today: 4,
      messages_this_week: 18,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: analytics }),
      headers: new Headers(),
    });

    const result = await client.getMailboxAnalytics("mbx_001");
    expect(result).toEqual(analytics);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/analytics");
  });
});

describe("updateAutoResponder", () => {
  it("PATCHes the auto-responder config and unwraps the envelope", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    const rules = [{ match: { subject_contains: "invoice" }, action: { reply_text: "Received." } }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { auto_responder_enabled: true, auto_responder_rules: rules },
      }),
      headers: new Headers(),
    });

    const result = await client.updateAutoResponder("mbx_001", { enabled: true, rules });
    expect(result).toEqual({ auto_responder_enabled: true, auto_responder_rules: rules });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/v1/agent-mailboxes/mbx_001/auto-responder");
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ enabled: true, rules });
  });
});
