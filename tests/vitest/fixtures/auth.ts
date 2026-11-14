const TEST_SIGN_IN_CREDENTIALS = {
  email: "test@example.com",
  password: "password123",
} as const;

const TEST_SIGN_UP_CREDENTIALS = {
  email: "jane@example.com",
  name: "Jane Doe",
  password: "password123",
} as const;

const TEST_AUTH_SUCCESS = { data: {}, error: null } as const;

const TEST_SIGN_IN_ERROR = {
  data: null,
  error: { message: "Invalid email or password", status: 401, statusText: "Unauthorized" },
} as const;

const TEST_SIGN_UP_ERROR = {
  data: null,
  error: { message: "Email already in use", status: 400, statusText: "Bad Request" },
} as const;

const TEST_AUTH_SERVER_ERROR = {
  data: null,
  error: { status: 500, statusText: "Internal Server Error" },
} as const;

export {
  TEST_AUTH_SERVER_ERROR,
  TEST_AUTH_SUCCESS,
  TEST_SIGN_IN_CREDENTIALS,
  TEST_SIGN_IN_ERROR,
  TEST_SIGN_UP_CREDENTIALS,
  TEST_SIGN_UP_ERROR,
};
