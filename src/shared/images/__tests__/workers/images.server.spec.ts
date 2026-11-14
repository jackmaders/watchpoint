import { env } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

import { ApplicationError } from "@/shared/errors";

import { deleteImage, getImage, getImagesBucket, putImage } from "../../images.server";

describe("images.server", () => {
  it("gets default and explicit buckets and handles missing binding", () => {
    expect.assertions(3);

    const defaultBucket = getImagesBucket();
    const explicitBucket = getImagesBucket(env.IMAGES);

    expect(defaultBucket).toBe(env.IMAGES);
    expect(explicitBucket).toBe(env.IMAGES);
    expect(() => getImagesBucket(null)).toThrow(
      new ApplicationError("INTERNAL_SERVER_ERROR", {
        message: "IMAGES R2 bucket binding is not configured.",
      }),
    );
  });

  it("stores and retrieves images with or without contentType", async () => {
    expect.assertions(5);

    const withTypeOptions = {
      contentType: "image/webp",
      file: new Uint8Array([1, 2, 3, 4]).buffer,
      key: "test/with-type.webp",
    };
    const withoutTypeOptions = {
      file: new Uint8Array([5, 6]).buffer,
      key: "test/without-type.webp",
    };

    await putImage(withTypeOptions);
    await putImage(withoutTypeOptions, { images: env.IMAGES });
    const withTypeObject = await getImage(withTypeOptions.key);
    const withoutTypeObject = await getImage(withoutTypeOptions.key, { images: env.IMAGES });
    const withTypeBytes = await withTypeObject?.bytes();
    const withoutTypeBytes = await withoutTypeObject?.bytes();

    expect(withTypeObject).not.toBeNull();
    expect(withTypeObject?.httpMetadata?.contentType).toBe("image/webp");
    expect(withTypeBytes).toStrictEqual(new Uint8Array([1, 2, 3, 4]));
    expect(withoutTypeObject?.httpMetadata?.contentType).toBeUndefined();
    expect(withoutTypeBytes).toStrictEqual(new Uint8Array([5, 6]));
  });

  it("handles missing images and deletes existing images", async () => {
    expect.assertions(2);

    const retrieved = await getImage("todos/missing/nonexistent.webp");
    expect(retrieved).toBeNull();

    const key = "test/to-delete.webp";
    await putImage({
      contentType: "image/webp",
      file: new Uint8Array([9, 8, 7]).buffer,
      key,
    });

    await deleteImage(key);
    await deleteImage(null, { images: env.IMAGES });
    await deleteImage();
    await deleteImage("");
    const afterDelete = await getImage(key);

    expect(afterDelete).toBeNull();
  });
});
