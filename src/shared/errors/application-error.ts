import { HttpStatusCodes, type HttpStatusCode } from "../lib/http-status-codes";

const ErrorCodes = {
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  USER_FORBIDDEN: "USER_FORBIDDEN",
  USER_UNAUTHENTICATED: "USER_UNAUTHENTICATED",
  VOD_NOT_FOUND: "VOD_NOT_FOUND",
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const ErrorConfig: Record<ErrorCode, { message: string; statusCode?: HttpStatusCode }> = {
  INTERNAL_SERVER_ERROR: { message: "Something went wrong." },
  USER_FORBIDDEN: { message: "Permission denied.", statusCode: HttpStatusCodes.FORBIDDEN },
  USER_UNAUTHENTICATED: { message: "Not Authenticated.", statusCode: HttpStatusCodes.UNAUTHORIZED },
  VOD_NOT_FOUND: { message: "VOD not found.", statusCode: HttpStatusCodes.NOT_FOUND },
};

class ApplicationError extends Error {
  public override readonly name = "ApplicationError";
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | undefined;

  public constructor(
    code: ErrorCode,
    options?: { message?: string; details?: Record<string, unknown>; cause?: unknown },
  ) {
    const config = ErrorConfig[code];
    const message = options?.message === "" ? config.message : (options?.message ?? config.message);
    super(message, { cause: options?.cause });

    this.code = code;
    this.statusCode = config.statusCode ?? HttpStatusCodes.INTERNAL_SERVER_ERROR;
    this.details = options?.details;
  }

  public toJSON() {
    return {
      code: this.code,
      message: ErrorConfig[this.code].message,
      name: this.name,
      statusCode: this.statusCode,
    };
  }
}

export { ApplicationError };
