import { describe, expect, it } from "vite-plus/test";

import type { UserRole } from "../../db/schema";
import { hasPermission } from "../permissions";

describe("hasPermission authorization helper", () => {
  describe("admin role", () => {
    it.each(["todos:read", "todos:create", "todos:update", "todos:delete"] as const)(
      "grants %s permission",
      (permission) => {
        expect.assertions(1);

        // Act
        const result = hasPermission("admin", permission);

        // Assert
        expect(result).toBe(true);
      },
    );
  });

  describe("user role", () => {
    it.each(["todos:read", "todos:create", "todos:update", "todos:delete"] as const)(
      "grants %s permission",
      (permission) => {
        expect.assertions(1);

        // Act
        const result = hasPermission("user", permission);

        // Assert
        expect(result).toBe(true);
      },
    );
  });

  describe("missing or unrecognized role", () => {
    it("denies permission when role is undefined", () => {
      expect.assertions(1);

      // Act
      const result = hasPermission(undefined, "todos:read");

      // Assert
      expect(result).toBe(false);
    });

    it("denies permission for unrecognized roles", () => {
      expect.assertions(1);

      // Act
      const result = hasPermission("guest" as unknown as UserRole, "todos:read");

      // Assert
      expect(result).toBe(false);
    });
  });
});
