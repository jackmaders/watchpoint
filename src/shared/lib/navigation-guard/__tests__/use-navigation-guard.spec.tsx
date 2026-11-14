import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { useNavigationGuard } from "../use-navigation-guard";

interface TestComponentProps {
  message?: string | undefined;
  shouldBlock: boolean;
  title?: string | undefined;
}

function TestComponent({ message, shouldBlock, title }: TestComponentProps) {
  const { NavigationGuardDialog } = useNavigationGuard({
    message,
    shouldBlock,
    title,
  });

  return <NavigationGuardDialog />;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("navigation guard hook", () => {
  it("opens dialog on blocked navigation and resets when staying on page", async () => {
    expect.hasAssertions();

    // Arrange
    const { router, user } = renderWithProviders(
      <TestComponent message="Discard?" shouldBlock title="Warning" />,
    );
    await router.load();
    expect(screen.queryByText("Warning")).toBeNull();

    // Act
    const navigation = router.navigate({ to: "/about" });
    await expect(screen.findByText("Warning")).resolves.toBeDefined();
    await user.click(screen.getByRole("button", { name: "Stay on page" }));
    await navigation;

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Warning")).toBeNull();
    });
    expect(router.state.location.pathname).toBe("/");
  });

  it("proceeds with navigation when confirming discard changes", async () => {
    expect.hasAssertions();

    // Arrange
    const { router, user } = renderWithProviders(<TestComponent shouldBlock />);
    await router.load();

    // Act
    const navigation = router.navigate({ to: "/about" });
    await user.click(await screen.findByRole("button", { name: "Discard changes" }));
    await navigation;

    // Assert
    const history = router.history as { location: { pathname: string } };
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Stay on page" })).toBeNull();
      expect(history.location.pathname).toBe("/about");
    });
  });

  it("manages beforeunload listener and event prevention", () => {
    expect.assertions(3);

    // Arrange
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const { rerender, unmount } = renderWithProviders(<TestComponent shouldBlock={false} />);

    // Assert before enabling guard
    expect(addEventListenerSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));

    // Act
    rerender(<TestComponent shouldBlock />);
    const event = new Event("beforeunload", { cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    unmount();

    // Assert
    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(preventDefaultSpy).toHaveBeenCalledOnce();
  });
});
