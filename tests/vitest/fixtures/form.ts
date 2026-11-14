import * as z from "zod";

const TEST_ACCOUNT_SCHEMA = z.object({
  accountName: z.string().trim().min(1, "Account name is required"),
});

const TEST_EMAIL_SCHEMA = z.string().email("Enter a valid email address");

const TEST_FORM_VALUES = {
  accountName: "Account",
  email: "ada@example.com",
  emptyEmail: "",
  updatedEmail: "grace@example.com",
  validAccountName: "Valid Account",
} as const;

const TEST_FORM_ERRORS = {
  invalidCredentials: "Invalid credentials",
  invalidEmail: "Enter a valid email address",
  objectError: { message: "Object error message" },
  requestUnavailable: "request unavailable",
  required: "Required",
  stringError: "String error message",
  stringRejection: "string rejection",
} as const;

export { TEST_ACCOUNT_SCHEMA, TEST_EMAIL_SCHEMA, TEST_FORM_ERRORS, TEST_FORM_VALUES };
