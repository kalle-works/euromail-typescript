import { describe, it, expect, vi, beforeEach } from "vitest";
import { EuroMail } from "../client.js";
import { AuthenticationError, ValidationError, RateLimitError, EuroMailError } from "../errors.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("error handling", () => {
  it("throws AuthenticationError on 401", async () => {
    const client = new EuroMail({ apiKey: "em_bad_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ code: "authentication_error", message: "Invalid API key" }),
      headers: new Headers(),
    });
    await expect(client.getAccount()).rejects.toThrow(AuthenticationError);
    try {
      await client.getAccount();
    } catch (err) {
      // This won't reach because we already consumed the mock, but the above assert covers it
    }
  });

  it("AuthenticationError has correct status and code", async () => {
    const client = new EuroMail({ apiKey: "em_bad_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ code: "authentication_error", message: "Invalid API key" }),
      headers: new Headers(),
    });
    try {
      await client.getAccount();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthenticationError);
      expect((err as AuthenticationError).status).toBe(401);
      expect((err as AuthenticationError).code).toBe("authentication_error");
      expect((err as AuthenticationError).message).toBe("Invalid API key");
    }
  });

  it("throws ValidationError on 422", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ code: "invalid_email", message: "The 'to' field must be a valid email" }),
      headers: new Headers(),
    });
    await expect(
      client.sendEmail({ from: "s@e.com", to: "invalid", subject: "Test", text_body: "Hi" })
    ).rejects.toThrow(ValidationError);
  });

  it("ValidationError has correct code and message", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ code: "invalid_email", message: "The 'to' field must be a valid email" }),
      headers: new Headers(),
    });
    try {
      await client.sendEmail({ from: "s@e.com", to: "invalid", subject: "Test", text_body: "Hi" });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).status).toBe(422);
      expect((err as ValidationError).code).toBe("invalid_email");
      expect((err as ValidationError).message).toBe("The 'to' field must be a valid email");
    }
  });

  it("throws RateLimitError on 429", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ code: "rate_limit_exceeded", message: "Rate limit exceeded" }),
      headers: new Headers({ "retry-after": "60" }),
    });
    await expect(client.sendEmail({ from: "s@e.com", to: "r@e.com", subject: "Test", text_body: "Hi" })).rejects.toThrow(
      RateLimitError
    );
  });

  it("RateLimitError includes retryAfter from header", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: async () => ({ code: "rate_limit_exceeded", message: "Rate limit exceeded" }),
      headers: new Headers({ "retry-after": "30" }),
    });
    try {
      await client.sendEmail({ from: "s@e.com", to: "r@e.com", subject: "Test", text_body: "Hi" });
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(30);
    }
  });

  it("throws generic EuroMailError on other status codes", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ code: "internal_error", message: "Something went wrong" }),
      headers: new Headers(),
    });
    await expect(client.getAccount()).rejects.toThrow(EuroMailError);
  });

  it("handles non-JSON error responses", async () => {
    const client = new EuroMail({ apiKey: "em_test_key" });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => {
        throw new Error("not json");
      },
      headers: new Headers(),
    });
    try {
      await client.getAccount();
    } catch (err) {
      expect(err).toBeInstanceOf(EuroMailError);
      expect((err as EuroMailError).status).toBe(502);
      expect((err as EuroMailError).message).toBe("Bad Gateway");
    }
  });
});
