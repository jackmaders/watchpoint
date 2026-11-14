import { expect, test } from "./fixtures";
import { AboutPage, HomePage } from "./page-objects";

test.describe("home page", () => {
  test("renders the centered auth card with sign in form", async ({ page }) => {
    // Arrange & Act
    const homePage = new HomePage(page);
    await homePage.goto();

    // Assert
    await expect(page).toHaveTitle("TanStack Start Starter");
    await expect(homePage.heading).toBeVisible();
    await expect(homePage.emailInput).toBeVisible();
    await expect(homePage.passwordInput).toBeVisible();
    await expect(homePage.submitButton).toBeVisible();
  });

  test("switches between sign in and sign up tabs", async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.goto();

    // Act
    await homePage.switchToSignUp();

    // Assert
    await expect(homePage.signUpHeading).toBeVisible();
    await expect(homePage.nameInput).toBeVisible();

    // Act back
    await homePage.switchToSignIn();

    // Assert back
    await expect(homePage.heading).toBeVisible();
  });

  test("navigates to the about page from the navbar", async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    const aboutPage = new AboutPage(page);
    await homePage.goto();

    // Act
    await homePage.navigateToAbout();

    // Assert
    await expect(page).toHaveURL(/\/about$/u);
    await expect(aboutPage.heading).toBeVisible();
  });
});
