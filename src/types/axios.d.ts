import "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    /**
     * Allow automatic network-error retry for this request.
     * Prefer for idempotent endpoints (attendance with Idempotency-Key,
     * location upserts). Mutating POSTs without idempotency are NOT retried.
     */
    retryable?: boolean;
    /** Internal: number of automatic retries already performed. */
    retryCount?: number;
  }
}