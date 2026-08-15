import { getCloudflareContext } from "@opennextjs/cloudflare";

const CACHE_CONTROL_VALUE =
	"public, max-age=31536000, s-maxage=31536000, immutable";

function resolveContentType(key: string): string {
	const lastDotIndex = key.lastIndexOf(".");
	if (lastDotIndex === -1) {
		return "application/octet-stream";
	}

	const ext = key.slice(lastDotIndex + 1).toLowerCase();
	switch (ext) {
		case "webp":
			return "image/webp";
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "svg":
			return "image/svg+xml";
		default:
			return "application/octet-stream";
	}
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

export async function handleGetMedia(
	request: Request,
	context: { params: Promise<{ key?: string[] | string }> },
): Promise<Response> {
	const params = await context?.params;
	const objectKey = parseObjectKey(params?.key);

	if (!objectKey) {
		return new Response("Bad Request", { status: 400 });
	}

	const { env } = await getCloudflareContext({ async: true });
	const object = await env.MEDIA.get(objectKey, {
		onlyIf: request.headers,
	});

	if (!object) {
		return new Response("Not Found", { status: 404 });
	}

	const headers = new Headers();
	if (typeof object.writeHttpMetadata === "function") {
		object.writeHttpMetadata(headers);
	}
	if (object.httpEtag) {
		headers.set("ETag", object.httpEtag);
	}
	headers.set("Cache-Control", CACHE_CONTROL_VALUE);

	const hasBody =
		"body" in object && object.body !== null && object.body !== undefined;

	if (!hasBody) {
		return new Response(null, {
			headers,
			status: 304,
		});
	}

	if (!headers.get("Content-Type")) {
		headers.set("Content-Type", resolveContentType(objectKey));
	}

	return new Response(object.body as BodyInit, {
		headers,
		status: 200,
	});
}
