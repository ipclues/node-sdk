import { Database } from "./database.js";
import {
  APIResponse,
  APIResponseData,
  RateLimitMetadata,
  ResponseMetadata,
} from "./response.js";

export interface LookupOptions {
  db?: Database | readonly Database[];
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

function headerNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseVersions(value: string | null): Record<string, string> | null {
  if (!value) return null;

  const versions: Record<string, string> = {};
  for (const item of value.split(",")) {
    const separator = item.indexOf("=");
    if (separator > 0) {
      versions[item.slice(0, separator).trim()] = item
        .slice(separator + 1)
        .trim();
    }
  }
  return Object.keys(versions).length ? versions : null;
}

function parseRateLimit(
  value: string | null,
  policyValue: string | null,
  retryValue: string | null,
): RateLimitMetadata {
  const match = value?.match(/^"?([^";]+)"?(.*)$/);
  const parameters = match?.[2] ?? "";
  const parameter = (name: string) =>
    parameters.match(new RegExp(`(?:^|;)\\s*${name}=([0-9]+)`))?.[1];

  const policyMatch = policyValue?.match(/^"?([^";]+)"?/);

  return {
    policy: match?.[1] ?? policyMatch?.[1] ?? null,
    limit: headerNumber(policyValue?.match(/(?:^|;)\s*q=(\d+)/)?.[1] ?? null),
    remaining: headerNumber(parameter("r") ?? null),
    reset: headerNumber(parameter("t") ?? null),
    retry_after: headerNumber(retryValue),
  };
}

export class IPCluesError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IPCluesError";
  }
}

export class Client {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: ClientOptions) {
    if (!options.apiKey?.trim()) {
      throw new Error("IPClues API key is required");
    }

    const timeout = options.timeout ?? 10_000;
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new Error("Timeout must be a positive number");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.ipclues.com/v1").replace(
      /\/+$/,
      "",
    );
    this.timeout = timeout;
  }

  async lookup<T = APIResponseData>(
    ip: string,
    options: LookupOptions = {},
  ): Promise<APIResponse<T>> {
    if (!ip?.trim()) {
      throw new Error("IP address is required");
    }

    const databases =
      options.db === undefined
        ? []
        : Array.isArray(options.db)
          ? options.db
          : [options.db];

    if (options.db !== undefined && databases.length === 0) {
      throw new Error("At least one database must be selected");
    }

    const query = new URLSearchParams();
    if (databases.length) query.set("db", databases.join(","));

    const url =
      `${this.baseUrl}/lookup/ip/${encodeURIComponent(ip)}` +
      (query.size ? `?${query}` : "");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    const text = await response.text();
    let data: unknown = text;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Preserve a non-JSON response as text.
    }

    const headers = response.headers;
    const metadata: ResponseMetadata = {
      status: response.status,
      reason: response.statusText,
      request_id: headers.get("I3-Request-Id"),
      credits_charged: headerNumber(headers.get("I3-Credits-Charged")),
      credits_remaining: headerNumber(headers.get("I3-Credits-Remaining")),
      databases:
        headers
          .get("I3-Databases")
          ?.split(",")
          .map((v) => v.trim()) ?? null,
      database_versions: parseVersions(headers.get("I3-Database-Versions")),
      rate_limit: parseRateLimit(
        headers.get("Ratelimit"),
        headers.get("Ratelimit-Policy"),
        headers.get("Retry-After"),
      ),
    };

    return { data: data as T, metadata };
  }
}
