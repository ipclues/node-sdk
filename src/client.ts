export type AttrValue = string | number | string[] | null;

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export type APIResponse = Record<string, AttrValue>;

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

  async lookup<T = APIResponse>(ip: string): Promise<T> {
    if (!ip?.trim()) {
      throw new Error("IP address is required");
    }

    const response = await fetch(
      `${this.baseUrl}/lookup/ip/${encodeURIComponent(ip)}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeout),
      },
    );

    if (!response.ok) {
      throw new APIError(
        `IPClues API returned HTTP ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}
