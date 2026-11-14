import { env } from "cloudflare:workers";

import { ApplicationError } from "../errors";

interface ImagesContext {
  images?: R2Bucket | undefined;
}

function getImagesBucket(images: R2Bucket | null = env.IMAGES): R2Bucket {
  if (images === null) {
    throw new ApplicationError("INTERNAL_SERVER_ERROR", {
      message: "IMAGES R2 bucket binding is not configured.",
    });
  }
  return images;
}

async function getImage(
  key: string,
  { images = getImagesBucket() }: ImagesContext = {},
): Promise<R2ObjectBody | null> {
  return await images.get(key);
}

interface PutImageOptions {
  contentType?: string | undefined;
  file: ArrayBuffer | ReadableStream;
  key: string;
}
async function putImage(
  { contentType, file, key }: PutImageOptions,
  { images = getImagesBucket() }: ImagesContext = {},
): Promise<void> {
  const options = contentType === undefined ? undefined : { httpMetadata: { contentType } };
  await images.put(key, file, options);
}

async function deleteImage(
  key?: string | null,
  { images = getImagesBucket() }: ImagesContext = {},
): Promise<void> {
  if (key === null || key === undefined || key === "") {
    return;
  }
  await images.delete(key);
}

export { deleteImage, getImage, getImagesBucket, putImage, type ImagesContext };
