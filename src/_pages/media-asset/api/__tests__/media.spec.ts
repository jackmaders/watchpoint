import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMediaBucket, handleGetMedia } from "../media";

vi.mock("wrangler");

interface GlobalMediaMock {
	MEDIA?: unknown;
	__env__?: { MEDIA?: unknown };
}

const mockMediaGlobals = globalThis as unknown as GlobalMediaMock;

describe("GET /api/media/[...key] handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete mockMediaGlobals.MEDIA;
		delete mockMediaGlobals.__env__;
	});

	it.each([
		{ description: "empty key array", key: [] },
		{ description: "undefined key", key: undefined },
		{ description: "whitespace-only segment", key: ["  "] },
		{ description: "non-string segment", key: [123 as unknown as string] },
		{ description: "malformed percent-encoding", key: ["%E0%A4%A"] },
		{ description: "parent directory segment", key: ["..", "secret.png"] },
		{
			description: "nested parent traversal",
			key: ["images", "..", "maps", "point.webp"],
		},
		{
			description: "segment with forward slash",
			key: ["images/nested", "point.webp"],
		},
		{
			description: "segment with backslash",
			key: ["images", "maps\\point.webp"],
		},
		{
			description: "current directory segment",
			key: ["images", ".", "point.webp"],
		},
		{
			description: "encoded traversal segment",
			key: ["images", "%2e%2e", "point.webp"],
		},
	])("returns 400 Bad Request for $description", async ({ key }) => {
		// Arrange
		const request = new Request("http://localhost/api/media/test");

		// Act
		const response = await handleGetMedia(request, {
			params: Promise.resolve({ key }),
		});

		// Assert
		expect(response.status).toBe(400);
	});

	it("returns 400 Bad Request when context or params is missing", async () => {
		// Arrange
		const request = new Request("http://localhost/api/media/");

		// Act
		const response = await handleGetMedia(
			request,
			undefined as unknown as { params: Promise<{ key?: string[] | string }> },
		);

		// Assert
		expect(response.status).toBe(400);
	});

	it("returns 500 when media bucket cannot be resolved", async () => {
		// Arrange
		const { getPlatformProxy } = await import("wrangler");
		vi.mocked(getPlatformProxy).mockRejectedValueOnce(
			new Error("No proxy available"),
		);
		const request = new Request("http://localhost/api/media/test.png");

		// Act
		const response = await handleGetMedia(request, {
			params: Promise.resolve({ key: "test.png" }),
		});

		// Assert
		expect(response.status).toBe(500);
	});

	it("returns 404 Not Found when R2 object does not exist", async () => {
		// Arrange
		const mockGet = vi.fn().mockResolvedValueOnce(null);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
			env: { MEDIA: { get: mockGet } as never },
			params: Promise.resolve({ key: ["scenarios", "kings-row.webp"] }),
		});

		// Assert
		expect(response.status).toBe(404);
		expect(mockGet).toHaveBeenCalledWith("scenarios/kings-row.webp", {
			onlyIf: request.headers,
		});
	});

	it("returns 200 with streamed body and metadata headers when R2 object exists", async () => {
		// Arrange
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("image-data"));
				controller.close();
			},
		});
		const mockObject = {
			body: stream,
			httpEtag: '"etag-12345"',
			writeHttpMetadata: vi.fn((headers: Headers) => {
				headers.set("Content-Type", "image/webp");
			}),
		};
		const mockGet = vi.fn().mockResolvedValueOnce(mockObject);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
			env: { MEDIA: { get: mockGet } as never },
			params: Promise.resolve({ key: ["scenarios", "kings-row.webp"] }),
		});
		const text = await response.text();

		// Assert
		expect(response.status).toBe(200);
		expect(text).toBe("image-data");
		expect(response.headers.get("ETag")).toBe('"etag-12345"');
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=31536000, s-maxage=31536000, immutable",
		);
		expect(response.headers.get("Content-Type")).toBe("image/webp");
		expect(mockObject.writeHttpMetadata).toHaveBeenCalled();
	});

	it("supports single string key and object without writeHttpMetadata or httpEtag", async () => {
		// Arrange
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode("raw-bytes"));
				controller.close();
			},
		});
		const mockObject = {
			body: stream,
		};
		const mockGet = vi.fn().mockResolvedValueOnce(mockObject);
		const request = new Request("http://localhost/api/media/overview.png");

		// Act
		const response = await handleGetMedia(request, {
			env: { MEDIA: { get: mockGet } as never },
			params: Promise.resolve({ key: "overview.png" }),
		});
		const text = await response.text();

		// Assert
		expect(response.status).toBe(200);
		expect(text).toBe("raw-bytes");
		expect(response.headers.get("ETag")).toBeNull();
		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(mockGet).toHaveBeenCalledWith("overview.png", {
			onlyIf: request.headers,
		});
	});

	it.each([
		{ expectedMime: "image/webp", key: ["scenarios", "kings-row.webp"] },
		{ expectedMime: "image/png", key: ["maps", "overview.png"] },
		{ expectedMime: "image/jpeg", key: ["screenshots", "point-a.jpg"] },
		{ expectedMime: "image/jpeg", key: ["screenshots", "point-b.jpeg"] },
		{ expectedMime: "image/svg+xml", key: ["icons", "pin.svg"] },
		{ expectedMime: "application/octet-stream", key: ["data", "blob.bin"] },
		{ expectedMime: "application/octet-stream", key: ["data", "blob-no-ext"] },
	])(
		"infers fallback Content-Type $expectedMime when R2 metadata lacks Content-Type",
		async ({ expectedMime, key }) => {
			// Arrange
			const mockObject = {
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode("bytes"));
						controller.close();
					},
				}),
				httpEtag: '"etag-test"',
				writeHttpMetadata: vi.fn(),
			};
			const mockGet = vi.fn().mockResolvedValueOnce(mockObject);
			const request = new Request(
				`http://localhost/api/media/${key.join("/")}`,
			);

			// Act
			const response = await handleGetMedia(request, {
				env: { MEDIA: { get: mockGet } as never },
				params: Promise.resolve({ key }),
			});

			// Assert
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe(expectedMime);
		},
	);

	it("returns 304 Not Modified without body when conditional preconditions match", async () => {
		// Arrange
		const mockObjectWithoutBody = {
			httpEtag: '"etag-12345"',
			writeHttpMetadata: vi.fn(),
		};
		const mockGet = vi.fn().mockResolvedValueOnce(mockObjectWithoutBody);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
			{
				headers: {
					"If-None-Match": '"etag-12345"',
				},
			},
		);

		// Act
		const response = await handleGetMedia(request, {
			env: { MEDIA: { get: mockGet } as never },
			params: Promise.resolve({ key: ["scenarios", "kings-row.webp"] }),
		});
		const text = await response.text();

		// Assert
		expect(response.status).toBe(304);
		expect(text).toBe("");
		expect(response.headers.get("ETag")).toBe('"etag-12345"');
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=31536000, s-maxage=31536000, immutable",
		);
	});

	it("returns 304 Not Modified without ETag when object has no httpEtag", async () => {
		// Arrange
		const mockObjectWithoutBody = {};
		const mockGet = vi.fn().mockResolvedValueOnce(mockObjectWithoutBody);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
			env: { MEDIA: { get: mockGet } as never },
			params: Promise.resolve({ key: ["scenarios", "kings-row.webp"] }),
		});

		// Assert
		expect(response.status).toBe(304);
		expect(response.headers.get("ETag")).toBeNull();
	});

	describe("getMediaBucket", () => {
		it("resolves MEDIA bucket from context.MEDIA, cloudflare context, and globals", async () => {
			// Arrange
			const mockBucket = { get: vi.fn() } as never;

			// Act & Assert
			const b1 = await getMediaBucket({ MEDIA: mockBucket });
			const b2 = await getMediaBucket({
				cloudflare: { env: { MEDIA: mockBucket } },
			});
			mockMediaGlobals.MEDIA = mockBucket;
			const b3 = await getMediaBucket();

			expect(b1).toBe(mockBucket);
			expect(b2).toBe(mockBucket);
			expect(b3).toBe(mockBucket);
		});

		it("resolves MEDIA bucket from wrangler getPlatformProxy fallback", async () => {
			// Arrange
			const mockBucket = { get: vi.fn() } as never;
			const { getPlatformProxy } = await import("wrangler");
			vi.mocked(getPlatformProxy).mockResolvedValueOnce({
				dispose: vi.fn(),
				env: { MEDIA: mockBucket },
			} as never);

			// Act
			const bucket = await getMediaBucket();

			// Assert
			expect(bucket).toBe(mockBucket);
		});
	});
});
