import { describe, it, expect, vi, beforeEach } from "vitest";
import { EuroMail } from "../client.js";
import { EuroMailError } from "../errors.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function okJson(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: new Headers(),
  };
}

function errorJson(status: number, body: unknown, headers?: Record<string, string>) {
  return {
    ok: false,
    status,
    statusText: "Error",
    json: async () => body,
    headers: new Headers(headers ?? {}),
  };
}

describe("retry behavior", () => {
  it("retries 503 then succeeds on second attempt", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch
      .mockResolvedValueOnce(errorJson(503, { error: { code: "unavail", message: "nope" } }))
      .mockResolvedValueOnce(okJson({ data: { id: "acct_1" } }));

    const result = await client.getAccount();
    expect(result).toEqual({ id: "acct_1" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries up to maxRetries+1 total attempts then throws", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch.mockResolvedValue(
      errorJson(500, { error: { code: "boom", message: "boom" } }),
    );

    await expect(client.getAccount()).rejects.toThrow(EuroMailError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry POST without idempotency key", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch.mockResolvedValueOnce(
      errorJson(500, { error: { code: "boom", message: "boom" } }),
    );

    await expect(
      client.sendEmail({ from: "a@b.com", to: "c@d.com", subject: "s", text_body: "t" }),
    ).rejects.toThrow(EuroMailError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries POST when idempotency key is provided", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch
      .mockResolvedValueOnce(errorJson(503, { error: { code: "x", message: "x" } }))
      .mockResolvedValueOnce(okJson({ data: { id: "em_1" } }));

    const result = await client.sendEmail(
      { from: "a@b.com", to: "c@d.com", subject: "s", text_body: "t" },
      { idempotencyKey: "key_123" },
    );
    expect(result).toEqual({ id: "em_1" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers["Idempotency-Key"]).toBe("key_123");
  });

  it("does not retry 4xx errors (except 429)", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch.mockResolvedValueOnce(
      errorJson(400, { error: { code: "bad", message: "bad" } }),
    );

    await expect(client.getAccount()).rejects.toThrow(EuroMailError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries 429 and respects retry-after header", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch
      .mockResolvedValueOnce(
        errorJson(429, { error: { code: "rate", message: "rate" } }, { "retry-after": "0" }),
      )
      .mockResolvedValueOnce(okJson({ data: { id: "acct_1" } }));

    await client.getAccount();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on network error", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    mockFetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(okJson({ data: { id: "acct_1" } }));

    const result = await client.getAccount();
    expect(result).toEqual({ id: "acct_1" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry when user aborts", async () => {
    const client = new EuroMail({
      apiKey: "em_test_key",
      maxRetries: 2,
      retryBaseDelayMs: 1,
    });
    const controller = new AbortController();
    controller.abort();
    mockFetch.mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    await expect(
      client.sendEmail(
        { from: "a@b.com", to: "c@d.com", subject: "s", text_body: "t" },
        { idempotencyKey: "k", signal: controller.signal },
      ),
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
