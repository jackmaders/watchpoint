import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { todos } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { user } from "@/shared/db/schema";
import { ApplicationError } from "@/shared/errors";

import {
  createTodo,
  deleteTodo,
  getTodos,
  promoteTempTodoImage,
  updateTodo,
  uploadTempTodoImage,
} from "../../todos-service";

beforeEach(async () => {
  const db = getDb(env.DB);
  await db
    .insert(user)
    .values([
      { email: "user-a@example.com", id: "user-a", name: "User A" },
      { email: "user-b@example.com", id: "user-b", name: "User B" },
    ])
    .onConflictDoNothing();
});

describe("todos-service createTodo creation", () => {
  it("creates a new todo with defaults and trimmed title for user", async () => {
    expect.assertions(3);

    // Arrange
    const db = getDb(env.DB);
    const input = { description: "Wipe counters", title: "  Clean kitchen  " };

    // Act
    const created = await createTodo(input, { db, userId: "user-a" });

    // Assert
    expect(created).toMatchObject({
      completed: false,
      description: "Wipe counters",
      title: "Clean kitchen",
      userId: "user-a",
    });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a new todo with null description when omitted", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    const input = { title: "Simple task" };

    // Act
    const created = await createTodo(input, { db, userId: "user-a" });

    // Assert
    expect(created.description).toBeNull();
  });
});

describe("todos-service createTodo failures", () => {
  it("rejects a duplicate title for the same user with the public creation error", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    await createTodo({ title: "Duplicate title" }, { db, userId: "user-a" });

    // Act
    const action = createTodo({ title: " Duplicate title " }, { db, userId: "user-a" });

    // Assert
    await expect(action).rejects.toThrow(new ApplicationError("TODO_CREATE_FAILED"));
  });
});

describe("todos-service getTodos", () => {
  it("returns todos for user ordered by createdAt descending", async () => {
    expect.assertions(3);

    // Arrange
    const db = getDb(env.DB);
    const first = await createTodo({ title: "First todo" }, { db, userId: "user-a" });
    await db
      .update(todos)
      .set({ createdAt: new Date(Date.now() - 10_000) })
      .where(eq(todos.id, first.id));
    const second = await createTodo({ title: "Second todo" }, { db, userId: "user-a" });

    // Act
    const results = await getTodos({ db, userId: "user-a" });

    // Assert
    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe(second.id);
    expect(results[1]?.id).toBe(first.id);
  });

  it("does not return todos belonging to another user", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    await createTodo({ title: "User B todo" }, { db, userId: "user-b" });
    const userATodo = await createTodo({ title: "User A todo" }, { db, userId: "user-a" });

    // Act
    const results = await getTodos({ db, userId: "user-a" });

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(userATodo.id);
  });
});

describe("todos-service updateTodo toggling completed", () => {
  it("toggles the completed status of an existing todo", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    const created = await createTodo({ title: "Toggle test" }, { db, userId: "user-a" });

    // Act
    const toggled = await updateTodo(created.id, { completed: true }, { db, userId: "user-a" });

    // Assert
    expect(toggled.id).toBe(created.id);
    expect(toggled.completed).toBe(true);
  });
});

describe("todos-service updateTodo", () => {
  it("updates title and description of an existing todo", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    const created = await createTodo(
      {
        description: "Initial description",
        title: "Initial title",
      },
      { db, userId: "user-a" },
    );

    // Act
    const updated = await updateTodo(
      created.id,
      {
        description: "Updated description",
        title: "Updated title",
      },
      { db, userId: "user-a" },
    );

    // Assert
    expect(updated.title).toBe("Updated title");
    expect(updated.description).toBe("Updated description");
  });
});

describe("todos-service updateTodo error cases", () => {
  it("throws Todo not found when attempting to update another user's todo", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    const todoB = await createTodo({ title: "User B todo" }, { db, userId: "user-b" });

    // Act
    const action = updateTodo(todoB.id, { title: "Unauthorized update" }, { db, userId: "user-a" });

    // Assert
    await expect(action).rejects.toThrow(new ApplicationError("TODO_NOT_FOUND"));
  });

  it("throws Todo not found when attempting to update a nonexistent todo", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const action = updateTodo(
      "non-existent-id",
      { title: "Non-existent update" },
      { db, userId: "user-a" },
    );

    // Assert
    await expect(action).rejects.toThrow(new ApplicationError("TODO_NOT_FOUND"));
  });
});

describe("todos-service deleteTodo", () => {
  it("deletes an existing todo and returns the deleted record", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    const created = await createTodo({ title: "To be deleted" }, { db, userId: "user-a" });

    // Act
    const deleted = await deleteTodo(created.id, { db, userId: "user-a" });

    // Assert
    expect(deleted.id).toBe(created.id);
  });

  it("removes the deleted record from the database", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    const created = await createTodo({ title: "To be deleted" }, { db, userId: "user-a" });

    // Act
    await deleteTodo(created.id, { db, userId: "user-a" });
    const remaining = await db.select().from(todos).where(eq(todos.id, created.id));

    // Assert
    expect(remaining).toHaveLength(0);
  });

  it("throws Todo not found when attempting to delete another user's todo", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    const todoB = await createTodo({ title: "User B todo" }, { db, userId: "user-b" });

    // Act
    const action = deleteTodo(todoB.id, { db, userId: "user-a" });

    // Assert
    await expect(action).rejects.toThrow(new ApplicationError("TODO_NOT_FOUND"));
  });

  it("throws Todo not found when attempting to delete a nonexistent todo", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const action = deleteTodo("non-existent-id", { db, userId: "user-a" });

    // Assert
    await expect(action).rejects.toThrow(new ApplicationError("TODO_NOT_FOUND"));
  });

  it("deletes the associated R2 image when deleting a todo that has one", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    const { tempKey } = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );
    const created = await createTodo(
      { imageKey: tempKey, title: "Todo with image" },
      { db, images: env.IMAGES, userId: "user-a" },
    );

    // Act
    await deleteTodo(created.id, { db, images: env.IMAGES, userId: "user-a" });

    // Assert
    expect(created.imageKey).not.toBeNull();
    await expect(env.IMAGES.get(String(created.imageKey))).resolves.toBeNull();
  });
});

describe("todos-service image lifecycle", () => {
  it("uploads a temporary todo image into the user temp prefix", async () => {
    expect.assertions(3);

    // Act
    const { tempKey } = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );
    const stored = await env.IMAGES.get(tempKey);

    // Assert
    expect(tempKey.startsWith("temp/user-a/")).toBe(true);
    expect(stored).not.toBeNull();
    expect(stored?.httpMetadata?.contentType).toBe("image/webp");
  });

  it("returns missing or non-user temp keys unchanged in promoteTempTodoImage", async () => {
    expect.assertions(3);

    // Act
    const ignored = await promoteTempTodoImage("todos/todo-1/pic.webp", {
      images: env.IMAGES,
      todoId: "todo-1",
      userId: "user-a",
    });
    const missing = await promoteTempTodoImage("temp/user-a/missing.webp", {
      images: env.IMAGES,
      todoId: "todo-1",
      userId: "user-a",
    });
    const nullResult = await promoteTempTodoImage(null, {
      todoId: "todo-1",
      userId: "user-a",
    });

    // Assert
    expect(ignored).toBe("todos/todo-1/pic.webp");
    expect(missing).toBe("temp/user-a/missing.webp");
    expect(nullResult).toBeNull();
  });

  it("promotes temp image on create and deletes temp key", async () => {
    expect.assertions(3);

    // Arrange
    const db = getDb(env.DB);
    const { tempKey } = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );

    // Act
    const created = await createTodo(
      { imageKey: tempKey, title: "With image" },
      { db, images: env.IMAGES, userId: "user-a" },
    );

    // Assert
    expect(created.imageKey?.startsWith(`todos/${created.id}/`)).toBe(true);
    await expect(env.IMAGES.get(tempKey)).resolves.toBeNull();
    await expect(env.IMAGES.get(String(created.imageKey))).resolves.not.toBeNull();
  });

  it("cleans up newly promoted image when create fails on duplicate title", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    await createTodo({ title: "Duplicate image title" }, { db, userId: "user-a" });
    const { tempKey } = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );

    // Act
    const action = createTodo(
      { imageKey: tempKey, title: "Duplicate image title" },
      { db, images: env.IMAGES, userId: "user-a" },
    );

    // Assert
    await expect(action).rejects.toThrow(new ApplicationError("TODO_CREATE_FAILED"));
    const remaining = await env.IMAGES.list();
    expect(remaining.objects).toHaveLength(0);
  });

  it("replaces and preserves images cleanly on updateTodo", async () => {
    expect.assertions(3);

    // Arrange
    const db = getDb(env.DB);
    const firstUpload = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );
    const created = await createTodo(
      { imageKey: firstUpload.tempKey, title: "Updatable image todo" },
      { db, images: env.IMAGES, userId: "user-a" },
    );
    const firstPermanentKey = String(created.imageKey);
    const secondUpload = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );

    // Act
    const kept = await updateTodo(
      created.id,
      { imageKey: firstPermanentKey },
      { db, images: env.IMAGES, userId: "user-a" },
    );
    const replaced = await updateTodo(
      created.id,
      { imageKey: secondUpload.tempKey },
      { db, images: env.IMAGES, userId: "user-a" },
    );

    // Assert
    expect(kept.imageKey).toBe(firstPermanentKey);
    expect(replaced.imageKey?.startsWith(`todos/${created.id}/`)).toBe(true);
    await expect(env.IMAGES.get(firstPermanentKey)).resolves.toBeNull();
  });

  it("clears existing image on updateTodo and throws when todo is missing", async () => {
    expect.assertions(3);

    // Arrange
    const db = getDb(env.DB);
    const upload = await uploadTempTodoImage(
      { base64: "data:image/webp;base64,d2VicA==", contentType: "image/webp" },
      { images: env.IMAGES, userId: "user-a" },
    );
    const created = await createTodo(
      { imageKey: upload.tempKey, title: "Clearable image todo" },
      { db, images: env.IMAGES, userId: "user-a" },
    );
    const oldKey = String(created.imageKey);

    // Act
    const cleared = await updateTodo(
      created.id,
      { imageKey: null },
      { db, images: env.IMAGES, userId: "user-a" },
    );

    // Assert
    expect(cleared.imageKey).toBeNull();
    await expect(env.IMAGES.get(oldKey)).resolves.toBeNull();
    await expect(
      updateTodo(
        "non-existent-id",
        { imageKey: null },
        { db, images: env.IMAGES, userId: "user-a" },
      ),
    ).rejects.toThrow(new ApplicationError("TODO_NOT_FOUND"));
  });
});
