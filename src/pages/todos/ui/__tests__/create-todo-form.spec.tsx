import { fireEvent, screen, waitFor } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import imageCompression from "browser-image-compression";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { getRouter } from "@/app/router";
import { ApplicationError, applicationErrorAdapter } from "@/shared/errors";
import { compressImage } from "@/shared/lib/compress-image.client";
import { toast } from "@/shared/ui/shadcn/toast";
import { retryFailedSave } from "@test/vitest/fixtures/form-submissions";
import {
  TEST_IMAGE_DATA_URL,
  TEST_IMAGE_FILE,
  TEST_TEMP_IMAGE_KEY,
} from "@test/vitest/fixtures/images";
import { TEST_TODO } from "@test/vitest/fixtures/todos";
import { createDeferred } from "@test/vitest/helpers/deferred";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { createTodoFn, uploadTodoImageFn } from "../../api/todos.functions";
import { CreateTodoForm } from "../create-todo-form";

vi.mock(import("../../api/todos.functions"));
vi.mock(import("@/shared/lib/compress-image.client"));
vi.mock(import("browser-image-compression"));
vi.mock(import("@/shared/ui/shadcn/toast"));

beforeEach(() => {
  vi.mocked(createTodoFn).mockReset().mockResolvedValue(TEST_TODO);
  vi.mocked(compressImage).mockImplementation(async (file) => await Promise.resolve(file));
  vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValue(TEST_IMAGE_DATA_URL);
});

describe("create todo form", () => {
  it("submits title and description and resets the inputs after success", async () => {
    expect.hasAssertions();

    // Arrange
    const { user } = renderCreateForm();

    // Act
    await fillAndSubmit(user, "New Todo", "New Description");

    // Assert
    expect(createTodoFn).toHaveBeenCalledWith({
      data: { description: "New Description", imageKey: null, title: "New Todo" },
    });
    await waitFor(() => {
      expect({
        description: screen.getByRole<HTMLInputElement>("textbox", { name: "Description" }).value,
        title: screen.getByRole<HTMLInputElement>("textbox", { name: "Title" }).value,
      }).toStrictEqual({ description: "", title: "" });
    });
  });

  it("submits a title with an empty description", async () => {
    expect.hasAssertions();

    // Arrange
    const { user, title } = renderCreateForm();

    // Act
    await fillAndSubmit(user, "Title Only");

    // Assert
    expect(createTodoFn).toHaveBeenCalledWith({
      data: { description: "", imageKey: null, title: "Title Only" },
    });
    await waitFor(() => {
      expect(title.value).toBe("");
    });
  });

  it("shows the public server error with a preserved draft and default toast", async () => {
    expect.hasAssertions();

    // Arrange
    const failure = applicationErrorAdapter.fromSerializable(
      applicationErrorAdapter.toSerializable(
        new ApplicationError("TODO_CREATE_FAILED", { message: "private override" }),
      ),
    );
    vi.mocked(createTodoFn).mockRejectedValueOnce(failure);
    const { user, title } = renderCreateForm();

    // Act
    await fillAndSubmit(user, "Draft title", "Draft description");
    const feedback = await screen.findByRole("alert");

    // Assert
    expect(feedback.textContent).toBe("Todo item could not be created.");
    expect({
      description: screen.getByRole<HTMLInputElement>("textbox", { name: "Description" }).value,
      title: title.value,
    }).toStrictEqual({ description: "Draft description", title: "Draft title" });
    expect(toast.add).toHaveBeenCalledOnce();
  });

  it("retries after editing the description while retaining the failed draft title", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(createTodoFn).mockRejectedValueOnce(new Error("save failed"));
    const { user, title } = renderCreateForm();
    await user.type(title, "Draft title");

    // Act
    const failure = await retryFailedSave(user, { buttonName: "Add Todo", title });

    // Assert
    expect(failure).toStrictEqual({
      feedbackVisibleAfterEdit: false,
      message: "save failed",
      retainedTitle: "Draft title",
      retryDisabled: false,
      retryDisabledAfterEdit: false,
    });
    await waitFor(() => {
      expect(title.value).toBe("");
    });
    expect(createTodoFn).toHaveBeenLastCalledWith({
      data: { description: " revised", imageKey: null, title: "Draft title" },
    });
  });

  it("preserves invalid input and validation feedback without calling the server", async () => {
    expect.assertions(3);

    // Arrange
    const { user, title } = renderCreateForm();
    await user.type(title, "   ");

    // Act
    fireEvent.submit(screen.getByRole("form", { name: "Create todo" }));
    const feedback = await screen.findByText("Title is required");

    // Assert
    expect(feedback).toBeDefined();
    expect(title.value).toBe("   ");
    expect(createTodoFn).not.toHaveBeenCalled();
  });

  it("keeps submit enabled when the title is empty or whitespace and blocks server submission", async () => {
    expect.assertions(4);

    // Arrange
    const { user, title } = renderCreateForm();
    const submit = screen.getByRole<HTMLButtonElement>("button", { name: "Add Todo" });

    // Act
    await user.type(title, "Draft title");
    await user.clear(title);
    const emptyDisabled = submit.disabled;
    await user.type(title, "   ");
    await user.click(submit);
    const feedback = await screen.findByText("Title is required");

    // Assert
    expect(emptyDisabled).toBe(false);
    expect(submit.disabled).toBe(false);
    expect(feedback).toBeDefined();
    expect(createTodoFn).not.toHaveBeenCalled();
  });

  it("disables submit while an image is uploading and submits the uploaded tempKey", async () => {
    expect.assertions(4);

    // Arrange
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:http://localhost/create-preview");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue();
    const uploadDeferred = createDeferred<{ tempKey: string }>();
    vi.mocked(uploadTodoImageFn).mockImplementationOnce(async () => await uploadDeferred.promise);
    const { user } = renderCreateForm();

    // Act
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Todo with image");
    await user.upload(screen.getByLabelText<HTMLInputElement>("Image"), TEST_IMAGE_FILE);

    // Assert uploading state
    const uploadingButton = await screen.findByRole<HTMLButtonElement>("button", {
      name: "Uploading image…",
    });
    expect(uploadingButton.disabled).toBe(true);

    // Finish upload and submit
    uploadDeferred.resolve({ tempKey: TEST_TEMP_IMAGE_KEY });
    const readyButton = await screen.findByRole<HTMLButtonElement>("button", { name: "Add Todo" });
    expect(readyButton.disabled).toBe(false);

    await user.click(readyButton);
    expect(createTodoFn).toHaveBeenCalledWith({
      data: { description: "", imageKey: TEST_TEMP_IMAGE_KEY, title: "Todo with image" },
    });
    await waitFor(() => {
      expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Title" }).value).toBe("");
    });
  });
});

function renderCreateForm() {
  const { user } = renderWithProviders(<CreateTodoForm aria-label="Create todo" />, {
    queryClient: getRouter().options.context.queryClient,
  });
  return {
    title: screen.getByRole<HTMLInputElement>("textbox", { name: "Title" }),
    user,
  };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  description?: string,
) {
  await user.type(screen.getByRole("textbox", { name: "Title" }), title);
  if (typeof description === "string") {
    await user.type(screen.getByRole("textbox", { name: "Description" }), description);
  }
  await user.click(screen.getByRole("button", { name: "Add Todo" }));
}
