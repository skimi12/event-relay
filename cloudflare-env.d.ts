declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MARKETPLACE_LIVE?: string;
    PREVIEW_OWNER_EMAIL?: string;
    OPERATOR_NAME?: string;
    OPERATOR_CONTACT?: string;
  }
}
