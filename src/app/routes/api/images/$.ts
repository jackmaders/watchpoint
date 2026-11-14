import { createFileRoute } from "@tanstack/react-router";

const HTTP_NOT_MODIFIED = 304;
const HTTP_NOT_FOUND = 404;
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const DEFAULT_IMAGE_CONTENT_TYPE = "image/webp";

interface ImageRouteContext {
  params?: Record<string, string | undefined>;
  request: Request;
}

const Route = createFileRoute("/api/images/$")({
  server: {
    handlers: {
      GET: async ({ params, request }: ImageRouteContext) => {
        const imageKey = extractImageKey(request, params?.["_splat"]);
        if (!imageKey) {
          return new Response("Not Found", { status: HTTP_NOT_FOUND });
        }

        const { getImage } = await import("@/shared/images/index.server");
        const object = await getImage(imageKey);
        if (!object) {
          return new Response("Not Found", { status: HTTP_NOT_FOUND });
        }

        if (request.headers.get("if-none-match") === object.httpEtag) {
          return new Response(null, {
            headers: {
              "Cache-Control": IMMUTABLE_CACHE_CONTROL,
              ETag: object.httpEtag,
            },
            status: HTTP_NOT_MODIFIED,
          });
        }

        return new Response(object.body, {
          headers: {
            "Cache-Control": IMMUTABLE_CACHE_CONTROL,
            "Content-Type": object.httpMetadata?.contentType ?? DEFAULT_IMAGE_CONTENT_TYPE,
            ETag: object.httpEtag,
          },
        });
      },
    },
  },
});

function extractImageKey(request: Request, splatParam: string | undefined): string {
  if (splatParam !== undefined) {
    return splatParam;
  }
  const { pathname } = new URL(request.url);
  return pathname.replace(/^\/api\/images\/?/u, "");
}

export { Route };
