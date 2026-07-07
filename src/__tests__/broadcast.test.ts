import { beforeEach, describe, expect, it, vi } from "vitest";
import { EuroMail } from "../client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("sendBroadcast", () => {
  it("includes transactional and tracking in request body", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          operation_id: "op_001",
          total_recipients: 42,
          message: "queued",
        },
      }),
      headers: new Headers(),
    });
    const result = await client.sendBroadcast({
      contact_list_id: "cl_001",
      from_address: "sender@example.com",
      subject: "Migration notice",
      text_body: "We moved!",
      transactional: true,
      tracking: false,
    });
    expect(result.total_recipients).toBe(42);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.transactional).toBe(true);
    expect(body.tracking).toBe(false);
  });
});
