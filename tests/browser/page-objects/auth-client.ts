import type { APIResponse, Page } from "@playwright/test";

interface SignUpOptions {
  baseURL?: string | undefined;
  email?: string | undefined;
  name?: string | undefined;
  password?: string | undefined;
}

interface SignInOptions {
  baseURL?: string | undefined;
  email?: string | undefined;
  password?: string | undefined;
}

class AuthClient {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async signUp({
    baseURL,
    email = `user-${globalThis.crypto.randomUUID()}@example.com`,
    name = "Test User",
    password = "test-password-1234",
  }: SignUpOptions = {}): Promise<APIResponse> {
    const headers = typeof baseURL === "string" && baseURL.length > 0 ? { Origin: baseURL } : {};
    return await this.page.request.post("/api/auth/sign-up/email", {
      data: { email, name, password },
      headers,
    });
  }

  public async signIn({
    baseURL,
    email = "missing-user@example.com",
    password = "invalid-test-password",
  }: SignInOptions = {}): Promise<APIResponse> {
    const headers = typeof baseURL === "string" && baseURL.length > 0 ? { Origin: baseURL } : {};
    return await this.page.request.post("/api/auth/sign-in/email", {
      data: { email, password },
      headers,
    });
  }
}

export { AuthClient };
export type { SignInOptions, SignUpOptions };
