export class EuroMailError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "EuroMailError";
    this.status = status;
    this.code = code;
  }

  static async fromResponse(response: Response): Promise<EuroMailError> {
    let body: { code?: string; message?: string };
    try {
      body = (await response.json()) as { code?: string; message?: string };
    } catch {
      body = { code: "unknown", message: response.statusText };
    }

    const code = body.code ?? "unknown";
    const message = body.message ?? response.statusText;
    const status = response.status;

    switch (status) {
      case 401:
        return new AuthenticationError(message);
      case 422:
        return new ValidationError(code, message);
      case 429:
        return new RateLimitError(message, parseRetryAfter(response));
      default:
        return new EuroMailError(status, code, message);
    }
  }
}

export class AuthenticationError extends EuroMailError {
  constructor(message = "Invalid API key") {
    super(401, "authentication_error", message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends EuroMailError {
  constructor(code: string, message: string) {
    super(422, code, message);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends EuroMailError {
  public readonly retryAfter: number | null;

  constructor(message = "Rate limit exceeded", retryAfter: number | null = null) {
    super(429, "rate_limit_exceeded", message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? null : seconds;
}
