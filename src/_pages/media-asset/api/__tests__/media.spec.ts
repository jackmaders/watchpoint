import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleGetMedia } from "../media";

vi.mock("@opennextjs/cloudflare");

describe("GET /api/media/[...key] handler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 400 Bad Request when key is missing, null, or empty array", async () => {
		// Arrange
		const request = new Request("http://localhost/api/media/");

		// Act
		const responseEmpty = await handleGetMedia(request, {
			params: Promise.resolve({ key: [] }),
		});
		const responseNull = await handleGetMedia(request, {
			params: Promise.resolve({ key: undefined }),
		});
		const responseNoParams = await handleGetMedia(
			request,
			undefined as unknown as { params: Promise<{ key?: string[] | string }> },
		);

		// Assert
		expect(responseEmpty.status).toBe(400);
		expect(responseNull.status).toBe(400);
		expect(responseNoParams.status).toBe(400);
	});

	it("returns 400 Bad Request when key is undefined, whitespace, or non-string", async () => {
		// Arrange
		const request = new Request("http://localhost/api/media/");

		// Act
		const responseWithoutKey = await handleGetMedia(request, {
			params: Promise.resolve({}),
		});
		const responseWithWhitespace = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["  "] }),
		});
		const responseWithNonString = await handleGetMedia(request, {
			params: Promise.resolve({
				key: [123 as unknown as string],
			}),
		});

		// Assert
		expect(responseWithoutKey.status).toBe(400);
		expect(responseWithWhitespace.status).toBe(400);
		expect(responseWithNonString.status).toBe(400);
	});

	it("returns 400 Bad Request when key contains malformed percent-encoding", async () => {
		// Arrange
		const request = new Request("http://localhost/api/media/%E0%A4%A");

		// Act
		const response = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["%E0%A4%A"] }),
		});

		// Assert
		expect(response.status).toBe(400);
	});

	it("returns 400 Bad Request when key contains directory traversal or invalid segments", async () => {
		// Arrange
		const request = new Request("http://localhost/api/media/../secret.png");

		// Act
		const response = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["..", "secret.png"] }),
		});

		// Assert
		expect(response.status).toBe(400);
	});

	it("returns 400 Bad Request when nested segments contain traversal or slash characters", async () => {
		// Arrange
		const request = new Request(
			"http://localhost/api/media/images/../maps/point.webp",
		);

		// Act
		const responseDotDot = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["images", "..", "maps", "point.webp"] }),
		});
		const responseSlash = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["images/nested", "point.webp"] }),
		});
		const responseBackslash = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["images", "maps\\point.webp"] }),
		});
		const responseDot = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["images", ".", "point.webp"] }),
		});

		// Assert
		expect(responseDotDot.status).toBe(400);
		expect(responseSlash.status).toBe(400);
		expect(responseBackslash.status).toBe(400);
		expect(responseDot.status).toBe(400);
	});

	it("returns 400 Bad Request when segment has encoded traversal", async () => {
		// Arrange
		const request = new Request(
			"http://localhost/api/media/images/%2e%2e/point.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["images", "%2e%2e", "point.webp"] }),
		});

		// Assert
		expect(response.status).toBe(400);
	});

	it("returns 404 Not Found when R2 object does not exist", async () => {
		// Arrange
		const mockGet = vi.fn().mockResolvedValueOnce(null);
		vi.mocked(getCloudflareContext).mockResolvedValueOnce({
			env: { MEDIA: { get: mockGet } },
		} as never);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
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
		vi.mocked(getCloudflareContext).mockResolvedValueOnce({
			env: { MEDIA: { get: mockGet } },
		} as never);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
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
		vi.mocked(getCloudflareContext).mockResolvedValueOnce({
			env: { MEDIA: { get: mockGet } },
		} as never);
		const request = new Request("http://localhost/api/media/overview.png");

		// Act
		const response = await handleGetMedia(request, {
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
			vi.mocked(getCloudflareContext).mockResolvedValueOnce({
				env: { MEDIA: { get: mockGet } },
			} as never);
			const request = new Request(
				`http://localhost/api/media/${key.join("/")}`,
			);

			// Act
			const response = await handleGetMedia(request, {
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
		vi.mocked(getCloudflareContext).mockResolvedValueOnce({
			env: { MEDIA: { get: mockGet } },
		} as never);
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
		vi.mocked(getCloudflareContext).mockResolvedValueOnce({
			env: { MEDIA: { get: mockGet } },
		} as never);
		const request = new Request(
			"http://localhost/api/media/scenarios/kings-row.webp",
		);

		// Act
		const response = await handleGetMedia(request, {
			params: Promise.resolve({ key: ["scenarios", "kings-row.webp"] }),
		});

		// Assert
		expect(response.status).toBe(304);
		expect(response.headers.get("ETag")).toBeNull();
	});
});
