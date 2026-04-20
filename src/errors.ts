interface ApiErrorBody {
  error?: { code?: string; message?: string; type?: string; docs_url?: string };
  code?: string;
  message?: string;
  type?: string;
  docs_url?: string;
}

export class EuroMailError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly docsUrl: string | null;
  public readonly requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    docsUrl: string | null = null,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "EuroMailError";
    this.status = status;
    this.code = code;
    this.docsUrl = docsUrl;
    this.requestId = requestId;
  }

  static async fromResponse(response: Response): Promise<EuroMailError> {
    let raw: ApiErrorBody;
    try {
      raw = (await response.json()) as ApiErrorBody;
    } catch {
      raw = {};
    }

    const err = raw.error ?? raw;
    const code = err.code ?? "unknown";
    const message = err.message ?? response.statusText;
    const type = err.type;
    const docsUrl = err.docs_url ?? null;
    const requestId =
      response.headers.get("x-request-id") ?? response.headers.get("request-id");
    const status = response.status;

    if (type === "validation_error" || code === "VALIDATION_ERROR") {
      return new ValidationError(code, message, docsUrl, requestId);
    }

    switch (status) {
      case 401:
        return new AuthenticationError(message, docsUrl, requestId);
      case 422:
        return new ValidationError(code, message, docsUrl, requestId);
      case 429:
        return new RateLimitError(message, parseRetryAfter(response), docsUrl, requestId);
      default:
        return new EuroMailError(status, code, message, docsUrl, requestId);
    }
  }
}

export class AuthenticationError extends EuroMailError {
  constructor(
    message = "Invalid API key",
    docsUrl: string | null = null,
    requestId: string | null = null,
  ) {
    super(401, "authentication_error", message, docsUrl, requestId);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends EuroMailError {
  constructor(
    code: string,
    message: string,
    docsUrl: string | null = null,
    requestId: string | null = null,
  ) {
    super(422, code, message, docsUrl, requestId);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends EuroMailError {
  public readonly retryAfter: number | null;

  constructor(
    message = "Rate limit exceeded",
    retryAfter: number | null = null,
    docsUrl: string | null = null,
    requestId: string | null = null,
  ) {
    super(429, "rate_limit_exceeded", message, docsUrl, requestId);
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
