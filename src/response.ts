export type AttrValue = string | number | string[] | null;
export type APIResponseData = Record<string, AttrValue>;

export interface RateLimitMetadata {
  policy: string | null;
  limit: number | null;
  remaining: number | null;
  reset: number | null;
  retry_after: number | null;
}

export interface ResponseMetadata {
  status: number;
  reason: string;
  request_id: string | null;
  credits_charged: number | null;
  credits_remaining: number | null;
  databases: string[] | null;
  database_versions: Record<string, string> | null;
  rate_limit: RateLimitMetadata;
}

export interface APIResponse<T = unknown> {
  data: T;
  metadata: ResponseMetadata;
}
