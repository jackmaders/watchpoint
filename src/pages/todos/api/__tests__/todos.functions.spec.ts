import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { hasPermission } from "@/shared/auth/permissions";
import { ensureSession } from "@/shared/auth/session.server";
import { ApplicationError } from "@/shared/errors";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { TEST_TODO } from "@test/vitest/fixtures/todos";

import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  uploadTempTodoImage,
} from "../todos-service";
import {
  createTodoFn,
  deleteTodoFn,
  getTodosFn,
  updateTodoFn,
  uploadTodoImageFn,
} from "../todos.functions";

vi.mock(import("@tanstack/react-start"));
vi.mock(import("@/shared/auth/session.server"));
vi.mock(import("@/shared/auth/permissions"), { spy: true });
vi.mock(import("../todos-service"));

const MOCK_TODO = TEST_TODO;

beforeEach(() => {
  vi.mocked(ensureSession).mockResolvedValue(TEST_SESSION);
});

describe("todos functions getTodosFn", () => {
  it("getTodosFn returns todos array for authenticated user", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(getTodos).mockResolvedValueOnce([MOCK_TODO]);

    // Act
    const result = await getTodosFn();

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "todos:read");
    expect(getTodos).toHaveBeenCalledWith({ userId: TEST_SESSION.user.id });
    expect(result).toStrictEqual([MOCK_TODO]);
  });

  it("rejects with USER_UNAUTHENTICATED when ensureSession fails", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(ensureSession).mockRejectedValueOnce(new ApplicationError("USER_UNAUTHENTICATED"));

    // Act
    const action = getTodosFn();

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_UNAUTHENTICATED", statusCode: 401 });
    expect(getTodos).not.toHaveBeenCalled();
  });

  it("rejects with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = getTodosFn();

    // Assert
    await expect(action).rejects.toThrow(ApplicationError);
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(getTodos).not.toHaveBeenCalled();
  });
});

describe("todos functions createTodoFn", () => {
  it("createTodoFn creates todo using validated input", async () => {
    expect.assertions(3);

    // Arrange
    const inputData = { description: "Test desc", title: "Test todo" };
    vi.mocked(createTodo).mockResolvedValueOnce(MOCK_TODO);

    // Act
    const result = await createTodoFn({ data: inputData });

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "todos:create");
    expect(createTodo).toHaveBeenCalledWith(inputData, { userId: TEST_SESSION.user.id });
    expect(result).toStrictEqual(MOCK_TODO);
  });

  it("rejects createTodoFn with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = createTodoFn({ data: { description: "Test desc", title: "Test todo" } });

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(createTodo).not.toHaveBeenCalled();
  });
});

describe("todos functions updateTodoFn fields", () => {
  it("updateTodoFn updates todo using validated input", async () => {
    expect.assertions(3);

    // Arrange
    const updatedTodo = { ...MOCK_TODO, title: "Updated title" };
    vi.mocked(updateTodo).mockResolvedValueOnce(updatedTodo);

    // Act
    const result = await updateTodoFn({
      data: {
        data: { description: "Updated desc", title: "Updated title" },
        id: MOCK_TODO.id,
      },
    });

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "todos:update");
    expect(updateTodo).toHaveBeenCalledWith(
      MOCK_TODO.id,
      {
        description: "Updated desc",
        title: "Updated title",
      },
      { userId: TEST_SESSION.user.id },
    );
    expect(result).toStrictEqual(updatedTodo);
  });

  it("rejects updateTodoFn with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = updateTodoFn({
      data: { data: { title: "Updated title" }, id: MOCK_TODO.id },
    });

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(updateTodo).not.toHaveBeenCalled();
  });
});

describe("todos functions updateTodoFn completed toggle", () => {
  it("updateTodoFn updates completed status when toggled", async () => {
    expect.assertions(3);

    // Arrange
    const toggledTodo = { ...MOCK_TODO, completed: true };
    vi.mocked(updateTodo).mockResolvedValueOnce(toggledTodo);

    // Act
    const result = await updateTodoFn({
      data: {
        data: { completed: true },
        id: MOCK_TODO.id,
      },
    });

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "todos:update");
    expect(updateTodo).toHaveBeenCalledWith(
      MOCK_TODO.id,
      {
        completed: true,
      },
      { userId: TEST_SESSION.user.id },
    );
    expect(result).toStrictEqual(toggledTodo);
  });
});

describe("todos functions deleteTodoFn", () => {
  it("deleteTodoFn deletes todo using validated id", async () => {
    expect.assertions(3);

    // Arrange
    vi.mocked(deleteTodo).mockResolvedValueOnce(MOCK_TODO);

    // Act
    const result = await deleteTodoFn({ data: { id: MOCK_TODO.id } });

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "todos:delete");
    expect(deleteTodo).toHaveBeenCalledWith(MOCK_TODO.id, { userId: TEST_SESSION.user.id });
    expect(result).toStrictEqual(MOCK_TODO);
  });

  it("rejects deleteTodoFn with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = deleteTodoFn({ data: { id: MOCK_TODO.id } });

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(deleteTodo).not.toHaveBeenCalled();
  });
});

describe("todos functions uploadTodoImageFn", () => {
  it("uploads a temporary todo image for an authenticated user", async () => {
    expect.assertions(3);

    // Arrange
    const uploadInput = { base64: "data:image/webp;base64,AAAA", contentType: "image/webp" };
    vi.mocked(uploadTempTodoImage).mockResolvedValueOnce({ tempKey: "temp/user-1/pic.webp" });

    // Act
    const result = await uploadTodoImageFn({ data: uploadInput });

    // Assert
    expect(hasPermission).toHaveBeenCalledWith("user", "todos:create");
    expect(uploadTempTodoImage).toHaveBeenCalledWith(uploadInput, { userId: TEST_SESSION.user.id });
    expect(result).toStrictEqual({ tempKey: "temp/user-1/pic.webp" });
  });

  it("rejects uploadTodoImageFn with USER_FORBIDDEN when permission is denied", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    // Act
    const action = uploadTodoImageFn({
      data: { base64: "data:image/webp;base64,AAAA", contentType: "image/webp" },
    });

    // Assert
    await expect(action).rejects.toMatchObject({ code: "USER_FORBIDDEN", statusCode: 403 });
    expect(uploadTempTodoImage).not.toHaveBeenCalled();
  });
});
