import type { R2Bucket, R2ObjectBody } from "@cloudflare/workers-types";

const CACHE_CONTROL_VALUE =
	"public, max-age=31536000, s-maxage=31536000, immutable";

const MIME_TYPES: Record<string, string> = {
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	png: "image/png",
	svg: "image/svg+xml",
	webp: "image/webp",
};

function resolveContentType(key: string): string {
	const lastDotIndex = key.lastIndexOf(".");
	if (lastDotIndex === -1) {
		return "application/octet-stream";
	}

	const ext = key.slice(lastDotIndex + 1).toLowerCase();
	return MIME_TYPES[ext] ?? "application/octet-stream";
}

function decodeSegment(rawSegment: unknown): string | null {
	if (typeof rawSegment !== "string" || rawSegment.trim() === "") {
		return null;
	}

	let decoded: string;
	try {
		decoded = decodeURIComponent(rawSegment);
	} catch {
		return null;
	}

	if (
		decoded === ".." ||
		decoded === "." ||
		decoded.includes("..") ||
		decoded.includes("/") ||
		decoded.includes("\\")
	) {
		return null;
	}

	return decoded;
}

function parseObjectKey(rawKey: string[] | string | undefined): string | null {
	if (!rawKey) return null;

	const rawSegments = Array.isArray(rawKey) ? rawKey : [rawKey];
	if (rawSegments.length === 0) return null;

	const decodedSegments: string[] = [];
	for (const rawSegment of rawSegments) {
		const decoded = decodeSegment(rawSegment);
		if (decoded === null) {
			return null;
		}
		decodedSegments.push(decoded);
	}

	return decodedSegments.join("/");
}

export type MediaContext =
	| {
			MEDIA?: R2Bucket;
			cloudflare?: {
				env?: {
					MEDIA?: R2Bucket;
				};
			};
			env?: {
				MEDIA?: R2Bucket;
			};
			params?:
				| Promise<{ key?: string[] | string }>
				| { key?: string[] | string };
	  }
	| Record<string, unknown>;

export async function getMediaBucket(
	context?: MediaContext,
): Promise<R2Bucket> {
	const globalEnv = globalThis as unknown as {
		MEDIA?: R2Bucket;
		__env__?: { MEDIA?: R2Bucket };
	};

	let media: R2Bucket | undefined =
		(context as { env?: { MEDIA?: R2Bucket } })?.env?.MEDIA ??
		(context as { MEDIA?: R2Bucket })?.MEDIA ??
		(context as { cloudflare?: { env?: { MEDIA?: R2Bucket } } })?.cloudflare
			?.env?.MEDIA ??
		globalEnv.MEDIA ??
		globalEnv.__env__?.MEDIA;

	if (!media && process.env.NODE_ENV !== "production") {
		try {
			const pkg = "wrangler";
			const { getPlatformProxy } = (await import(
				/* @vite-ignore */ pkg
			)) as typeof import("wrangler");
			const proxy = await getPlatformProxy<{ MEDIA: R2Bucket }>();
			media = proxy.env.MEDIA;
		} catch {
			// ignore fallback error
		}
	}

	if (!media) {
		throw new Error("Cloudflare R2 binding (MEDIA) not found");
	}

	return media;
}

export async function handleGetMedia(
	request: Request,
	context: {
		[key: string]: unknown;
		env?: { MEDIA?: R2Bucket };
		params?: Promise<{ key?: string[] | string }> | { key?: string[] | string };
	},
): Promise<Response> {
	const params = await context?.params;
	const objectKey = parseObjectKey(params?.key);

	if (!objectKey) {
		return new Response("Bad Request", { status: 400 });
	}

	let mediaBucket: R2Bucket;
	try {
		mediaBucket = await getMediaBucket(context);
	} catch {
		return new Response("Internal Server Error", { status: 500 });
	}

	const object = await mediaBucket.get(objectKey, {
		onlyIf: request.headers,
	});

	if (!object) {
		return new Response("Not Found", { status: 404 });
	}

	const headers = new Headers();
	const r2Obj = object as unknown as {
		httpEtag?: string;
		writeHttpMetadata?: (headers: Headers) => void;
	};

	if (typeof r2Obj.writeHttpMetadata === "function") {
		r2Obj.writeHttpMetadata(headers);
	}
	if (r2Obj.httpEtag) {
		headers.set("ETag", r2Obj.httpEtag);
	}
	headers.set("Cache-Control", CACHE_CONTROL_VALUE);

	const objectBody = (object as R2ObjectBody).body;
	const hasBody =
		"body" in object && objectBody !== null && objectBody !== undefined;

	if (!hasBody) {
		return new Response(null, {
			headers,
			status: 304,
		});
	}

	if (!headers.get("Content-Type")) {
		headers.set("Content-Type", resolveContentType(objectKey));
	}

	return new Response(objectBody as unknown as BodyInit, {
		headers,
		status: 200,
	});
}

export async function handleMediaRequest({
	params,
	request,
}: {
	params: unknown;
	request: Request;
}): Promise<Response> {
	const splat = (params as { _splat?: string })._splat;
	return handleGetMedia(request, {
		params: Promise.resolve({ key: splat }),
	});
}
