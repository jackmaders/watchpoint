import { expect, test } from "./fixtures";
import { AuthClient } from "./page-objects";

const UNAUTHORIZED_STATUS = 401;

test("accepts auth requests from the server origin", async ({ page, baseURL }) => {
  // Arrange
  const authClient = new AuthClient(page);

  // Act
  const response = await authClient.signIn({ baseURL });
  const body: unknown = await response.json();

  // Assert
  expect(response.status()).toBe(UNAUTHORIZED_STATUS);
  expect(body).toMatchObject({ code: "INVALID_EMAIL_OR_PASSWORD" });
});
