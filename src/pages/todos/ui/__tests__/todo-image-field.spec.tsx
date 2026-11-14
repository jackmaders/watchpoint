import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { getRouter } from "@/app/router";
import { useAppForm } from "@/shared/ui/form";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { useUploadTodoImage } from "../../api/use-upload-todo-image";
import { TodoImageField } from "../todo-image-field";

vi.mock(import("../../api/use-upload-todo-image"));

interface TestFormProps {
  defaultValue?: string | null;
  onUploadingChange?: ((uploading: boolean) => void) | undefined;
}

function TestForm({ defaultValue = null, onUploadingChange }: TestFormProps) {
  const form = useAppForm({
    defaultValues: {
      imageKey: defaultValue,
    },
  });

  return (
    <form.AppForm>
      <form.Form>
        <form.AppField name="imageKey">
          {() => <TodoImageField onUploadingChange={onUploadingChange} />}
        </form.AppField>
      </form.Form>
    </form.AppForm>
  );
}

function renderTodoImageField(props: TestFormProps = {}) {
  const { wrapper } = createTestingWrapper({
    queryClient: getRouter().options.context.queryClient,
  });
  return {
    ...render(<TestForm {...props} />, { wrapper }),
    user: userEvent.setup(),
  };
}

describe("todo image field", () => {
  const mockFile = new File(["image-bytes"], "photo.png", { type: "image/png" });

  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/todo-preview");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads a selected file, notifies uploading state, and updates field value", async () => {
    expect.assertions(5);

    // Arrange
    const mutateAsync = vi
      .fn<(file: File) => Promise<{ tempKey: string }>>()
      .mockResolvedValueOnce({ tempKey: "temp/user-1/todo.webp" });
    vi.mocked(useUploadTodoImage).mockReturnValue({ mutateAsync } as never);
    const onUploadingChange = vi.fn<(uploading: boolean) => void>();
    const { unmount, user } = renderTodoImageField({ onUploadingChange });
    const fileInput = screen.getByLabelText<HTMLInputElement>("Image");

    // Act
    await user.upload(fileInput, mockFile);

    // Assert
    expect(mutateAsync).toHaveBeenCalledWith(mockFile);
    await waitFor(() => {
      expect(screen.getByAltText<HTMLImageElement>("Todo preview").src).toBe(
        "blob:http://localhost/todo-preview",
      );
    });
    expect(onUploadingChange).toHaveBeenCalledWith(true);
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    unmount();
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("renders existing image URL, clears on remove, and shows Error upload failures", async () => {
    expect.assertions(5);

    // Arrange
    const mutateAsync = vi
      .fn<(file: File) => Promise<{ tempKey: string }>>()
      .mockRejectedValueOnce(new Error("File exceeds 10MB limit"));
    vi.mocked(useUploadTodoImage).mockReturnValue({ mutateAsync } as never);
    const { user } = renderTodoImageField({ defaultValue: "todos/todo-1/pic.webp" });

    // Assert existing image
    expect(screen.getByAltText<HTMLImageElement>("Todo preview").src).toContain(
      "/api/images/todos/todo-1/pic.webp",
    );

    // Act remove
    await user.click(screen.getByRole("button", { name: "Remove image" }));
    await waitFor(() => {
      expect(screen.queryByAltText("Todo preview")).toBeNull();
    });

    // Act upload error
    await user.upload(screen.getByLabelText<HTMLInputElement>("Image"), mockFile);
    await waitFor(() => {
      expect(screen.getByText("File exceeds 10MB limit")).toBeDefined();
    });
    expect(screen.queryByAltText("Todo preview")).toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>("Image").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("shows fallback message on non-Error upload failure", async () => {
    expect.assertions(1);

    // Arrange
    const mutateAsync = vi
      .fn<(file: File) => Promise<{ tempKey: string }>>()
      .mockRejectedValueOnce("Network error");
    vi.mocked(useUploadTodoImage).mockReturnValue({ mutateAsync } as never);
    const { user } = renderTodoImageField();

    // Act
    await user.upload(screen.getByLabelText<HTMLInputElement>("Image"), mockFile);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Failed to upload image")).toBeDefined();
    });
  });
});
