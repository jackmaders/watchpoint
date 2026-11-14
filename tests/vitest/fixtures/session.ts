import type { Session, User } from "@/shared/db/schema";

const TEST_USER: User = {
  createdAt: new Date("2026-10-14T00:00:00Z"),
  email: "test@example.com",
  emailVerified: false,
  id: "user-1",
  image: null,
  name: "Test User",
  role: "user",
  updatedAt: new Date("2026-10-14T00:00:00Z"),
};

const TEST_ADMIN_USER: User = {
  ...TEST_USER,
  id: "admin-1",
  name: "Test Admin",
  role: "admin",
};

const TEST_SESSION: { session: Session; user: User } = {
  session: {
    createdAt: new Date("2026-10-14T00:00:00Z"),
    expiresAt: new Date("2026-10-15T00:00:00Z"),
    id: "session-1",
    ipAddress: "127.0.0.1",
    token: "test-session-token",
    updatedAt: new Date("2026-10-14T00:00:00Z"),
    userAgent: "Mozilla/5.0",
    userId: TEST_USER.id,
  },
  user: TEST_USER,
};

function createUserFixture(overrides: Partial<User> = {}): User {
  return { ...TEST_USER, ...overrides };
}

function createSessionFixture(overrides: Partial<typeof TEST_SESSION> = {}) {
  return { ...TEST_SESSION, ...overrides };
}

const TEST_ADMIN_SESSION = createSessionFixture({
  session: { ...TEST_SESSION.session, userId: "admin-1" },
  user: TEST_ADMIN_USER,
});

export { TEST_ADMIN_SESSION, TEST_SESSION, TEST_USER, createSessionFixture, createUserFixture };
