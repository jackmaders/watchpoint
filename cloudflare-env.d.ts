/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
	DB: D1Database;
	MEDIA_BUCKET: R2Bucket;
}
