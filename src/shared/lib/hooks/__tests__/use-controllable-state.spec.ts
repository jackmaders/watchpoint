import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { useControllableState } from "../use-controllable-state";

describe("useControllableState hook", () => {
  describe("uncontrolled mode", () => {
    it("returns defaultProp as the initial value", () => {
      // Arrange
      expect.assertions(1);

      // Act
      const { result } = renderHook(() => useControllableState({ defaultProp: "initial-value" }));

      // Assert
      expect(result.current[0]).toBe("initial-value");
    });

    it("returns undefined as initial value when defaultProp is omitted", () => {
      // Arrange
      expect.assertions(1);

      // Act
      const { result } = renderHook(() => useControllableState({}));

      // Assert
      expect(result.current[0]).toBeUndefined();
    });

    it("updates value directly and calls onChange callback", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() =>
        useControllableState({ defaultProp: "initial", onChange }),
      );

      // Act
      act(() => {
        result.current[1]("updated-direct");
      });

      // Assert
      expect(result.current[0]).toBe("updated-direct");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("updated-direct");
    });

    it("updates value via functional updater and calls onChange callback", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() =>
        useControllableState({ defaultProp: "initial", onChange }),
      );

      // Act
      act(() => {
        result.current[1]((prev) => `${prev}-functional`);
      });

      // Assert
      expect(result.current[0]).toBe("initial-functional");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("initial-functional");
    });

    it("does not call onChange when updated to the same value", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() =>
        useControllableState({ defaultProp: "same-value", onChange }),
      );

      // Act
      act(() => {
        result.current[1]("same-value");
      });

      // Assert
      expect(result.current[0]).toBe("same-value");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("updates value when onChange is not provided", () => {
      // Arrange
      expect.assertions(1);
      const { result } = renderHook(() => useControllableState({ defaultProp: "initial" }));

      // Act
      act(() => {
        result.current[1]("next-value");
      });

      // Assert
      expect(result.current[0]).toBe("next-value");
    });
  });

  describe("controlled mode", () => {
    it("returns prop as the current value ignoring defaultProp", () => {
      // Arrange
      expect.assertions(1);

      // Act
      const { result } = renderHook(() =>
        useControllableState({
          defaultProp: "uncontrolled-default",
          prop: "controlled-value",
        }),
      );

      // Assert
      expect(result.current[0]).toBe("controlled-value");
    });

    it("calls onChange on direct update while keeping returned value as prop", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() =>
        useControllableState({ onChange, prop: "controlled-value" }),
      );

      // Act
      act(() => {
        result.current[1]("new-controlled-value");
      });

      // Assert
      expect(result.current[0]).toBe("controlled-value");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("new-controlled-value");
    });

    it("calls onChange with functional update result", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() =>
        useControllableState({ onChange, prop: "initial-value" }),
      );

      // Act
      act(() => {
        result.current[1]((prev) => `${prev}-updated`);
      });

      // Assert
      expect(result.current[0]).toBe("initial-value");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("initial-value-updated");
    });

    it("does not call onChange when direct update equals current prop", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() => useControllableState({ onChange, prop: "same-value" }));

      // Act
      act(() => {
        result.current[1]("same-value");
      });

      // Assert
      expect(result.current[0]).toBe("same-value");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does not call onChange when functional update returns current prop", () => {
      // Arrange
      expect.assertions(2);
      const onChange = vi.fn<(state: string) => void>();
      const { result } = renderHook(() => useControllableState({ onChange, prop: "same-value" }));

      // Act
      act(() => {
        result.current[1](() => "same-value");
      });

      // Assert
      expect(result.current[0]).toBe("same-value");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("handles direct update when onChange is omitted", () => {
      // Arrange
      expect.assertions(1);
      const { result } = renderHook(() => useControllableState({ prop: "controlled-value" }));

      // Act
      act(() => {
        result.current[1]("new-value");
      });

      // Assert
      expect(result.current[0]).toBe("controlled-value");
    });

    it("calls updated onChange callback when callback reference changes", () => {
      // Arrange
      expect.assertions(3);
      const initialOnChange = vi.fn<(state: string) => void>();
      const updatedOnChange = vi.fn<(state: string) => void>();
      const { rerender, result } = renderHook(
        (props: { onChange: (state: string) => void }) =>
          useControllableState({ onChange: props.onChange, prop: "value" }),
        { initialProps: { onChange: initialOnChange } },
      );

      // Act
      rerender({ onChange: updatedOnChange });
      act(() => {
        result.current[1]("updated-value");
      });

      // Assert
      expect(result.current[0]).toBe("value");
      expect(initialOnChange).not.toHaveBeenCalled();
      expect(updatedOnChange).toHaveBeenCalledExactlyOnceWith("updated-value");
    });
  });
});
