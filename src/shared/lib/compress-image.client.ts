import imageCompression from "browser-image-compression";

const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * KB_PER_MB * BYTES_PER_KB;
const MAX_IMAGE_DIMENSION = 1600;
const WEBP_QUALITY = 0.8;

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

type ImageCompressionErrorCode =
  | "CANVAS_CONTEXT_UNAVAILABLE"
  | "FILE_TOO_LARGE"
  | "IMAGE_LOAD_FAILED"
  | "INVALID_FILE_TYPE";

class ImageCompressionError extends Error {
  public override readonly name = "ImageCompressionError";
  public readonly code: ImageCompressionErrorCode;

  public constructor(message: string, code: ImageCompressionErrorCode) {
    super(message);
    this.code = code;
  }
}

export async function compressImage(file: File): Promise<File> {
  validateImageFile(file);

  try {
    return await imageCompression(file, {
      fileType: "image/webp",
      initialQuality: WEBP_QUALITY,
      maxSizeMB: MAX_IMAGE_SIZE_MB,
      maxWidthOrHeight: MAX_IMAGE_DIMENSION,
      useWebWorker: true,
    });
  } catch (error) {
    return handleCompressionError(error);
  }
}

function isAcceptedImageType(mimeType: string): mimeType is AcceptedImageType {
  return ACCEPTED_IMAGE_TYPES.some((acceptedType) => acceptedType === mimeType);
}

function validateImageFile(file: File): void {
  const isAccepted = file.type === "image/jpg" || isAcceptedImageType(file.type);

  if (!isAccepted) {
    throw new ImageCompressionError(
      `Unsupported file format "${file.type}". Please upload a JPEG, PNG, WebP, or AVIF image.`,
      "INVALID_FILE_TYPE",
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageCompressionError("File size exceeds the 10MB limit.", "FILE_TOO_LARGE");
  }
}

function handleCompressionError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Canvas") || message.includes("context") || message.includes("getContext")) {
    throw new ImageCompressionError(
      "Canvas 2D context is not available.",
      "CANVAS_CONTEXT_UNAVAILABLE",
    );
  }
  throw new ImageCompressionError("Failed to decode or compress image.", "IMAGE_LOAD_FAILED");
}

export {
  ACCEPTED_IMAGE_TYPES,
  ImageCompressionError,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_SIZE_BYTES,
  WEBP_QUALITY,
  type AcceptedImageType,
  type ImageCompressionErrorCode,
};
