declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Optional per-user cloud storage quota in megabytes. */
    PIXL_STORAGE_QUOTA_MB?: string;
  }
}
