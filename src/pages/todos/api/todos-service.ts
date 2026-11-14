import { and, desc, eq } from "drizzle-orm";

import { todos } from "@/shared/db";
import { getDb, type DbContext } from "@/shared/db/index.server";
import { ApplicationError } from "@/shared/errors";
import { decodeBase64ToArrayBuffer } from "@/shared/images";
import {
  deleteImage,
  getImage,
  getImagesBucket,
  putImage,
  type ImagesContext,
} from "@/shared/images/index.server";

import type { CreateTodoInput, UpdateTodoData, UploadTodoImageInput } from "./todo-schema";

interface TodoContext extends DbContext, ImagesContext {
  userId: string;
}

async function getTodos({ db = getDb(), userId }: TodoContext) {
  const result = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(desc(todos.createdAt));
  return result;
}

async function promoteTempTodoImage(
  tempKey: string | null | undefined,
  {
    images = getImagesBucket(),
    todoId,
    userId,
  }: ImagesContext & { todoId: string; userId: string },
) {
  if (tempKey === null || tempKey === undefined || !tempKey.startsWith(`temp/${userId}/`)) {
    return tempKey;
  }

  const object = await getImage(tempKey, { images });
  if (!object) {
    return tempKey;
  }

  const permanentKey = `todos/${todoId}/${crypto.randomUUID()}.webp`;
  await putImage(
    {
      contentType: object.httpMetadata?.contentType,
      file: object.body,
      key: permanentKey,
    },
    { images },
  );
  await deleteImage(tempKey, { images });

  return permanentKey;
}

async function createTodo(
  input: CreateTodoInput,
  { db = getDb(), images = getImagesBucket(), userId }: TodoContext,
) {
  const todoId = crypto.randomUUID();
  const permanentKey = await promoteTempTodoImage(input.imageKey, { images, todoId, userId });

  const [created] = await db
    .insert(todos)
    .values({
      description: input.description,
      id: todoId,
      imageKey: permanentKey ?? null,
      title: input.title.trim(),
      userId,
    })
    .onConflictDoNothing({ target: [todos.userId, todos.title] })
    .returning();

  if (!created) {
    if (permanentKey !== undefined && permanentKey !== null && permanentKey !== input.imageKey) {
      await deleteImage(permanentKey, { images });
    }
    throw new ApplicationError("TODO_CREATE_FAILED");
  }

  return created;
}

async function getTodoById(id: string, { db = getDb(), userId }: TodoContext) {
  const [existing] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)));
  return existing ?? null;
}

async function cleanupPreviousImage(
  previousKey: string | null | undefined,
  nextKey: string | null | undefined,
  images: R2Bucket,
) {
  if (previousKey !== null && previousKey !== undefined && previousKey !== nextKey) {
    await deleteImage(previousKey, { images });
  }
}

async function updateTodo(
  id: string,
  input: UpdateTodoData,
  { db = getDb(), images = getImagesBucket(), userId }: TodoContext,
) {
  const existing = input.imageKey === undefined ? null : await getTodoById(id, { db, userId });
  if (input.imageKey !== undefined && !existing) {
    throw new ApplicationError("TODO_NOT_FOUND");
  }

  const imageKey = await promoteTempTodoImage(input.imageKey, { images, todoId: id, userId });
  const [updated] = await db
    .update(todos)
    .set({ ...input, ...(imageKey === undefined ? {} : { imageKey }) })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();

  if (!updated) {
    throw new ApplicationError("TODO_NOT_FOUND");
  }

  await cleanupPreviousImage(existing?.imageKey, imageKey, images);

  return updated;
}

async function deleteTodo(
  id: string,
  { db = getDb(), images = getImagesBucket(), userId }: TodoContext,
) {
  const [deleted] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();

  if (!deleted) {
    throw new ApplicationError("TODO_NOT_FOUND");
  }

  if (deleted.imageKey !== null) {
    await deleteImage(deleted.imageKey, { images });
  }

  return deleted;
}

async function uploadTempTodoImage(
  { base64, contentType }: UploadTodoImageInput,
  { images = getImagesBucket(), userId }: ImagesContext & { userId: string },
) {
  const file = decodeBase64ToArrayBuffer(base64);
  const tempKey = `temp/${userId}/${crypto.randomUUID()}.webp`;
  await putImage({ contentType, file, key: tempKey }, { images });
  return { tempKey };
}

export {
  createTodo,
  deleteTodo,
  getTodos,
  promoteTempTodoImage,
  updateTodo,
  uploadTempTodoImage,
  type TodoContext,
};
