import { createServerFn } from "@tanstack/react-start";

import { permissionMiddleware } from "@/shared/auth";

import {
  createTodoInputSchema,
  deleteTodoInputSchema,
  updateTodoInputSchema,
  uploadTodoImageInputSchema,
} from "./todo-schema";
import { createTodo, deleteTodo, getTodos, updateTodo, uploadTempTodoImage } from "./todos-service";

const getTodosFn = createServerFn({ method: "GET" })
  .middleware([permissionMiddleware("todos:read")])
  .handler(async ({ context }) => await getTodos({ userId: context.user.id }));

const createTodoFn = createServerFn({ method: "POST" })
  .middleware([permissionMiddleware("todos:create")])
  .validator(createTodoInputSchema)
  .handler(async ({ context, data }) => await createTodo(data, { userId: context.user.id }));

const updateTodoFn = createServerFn({ method: "POST" })
  .middleware([permissionMiddleware("todos:update")])
  .validator(updateTodoInputSchema)
  .handler(
    async ({ context, data }) => await updateTodo(data.id, data.data, { userId: context.user.id }),
  );

const deleteTodoFn = createServerFn({ method: "POST" })
  .middleware([permissionMiddleware("todos:delete")])
  .validator(deleteTodoInputSchema)
  .handler(async ({ context, data }) => await deleteTodo(data.id, { userId: context.user.id }));

const uploadTodoImageFn = createServerFn({ method: "POST" })
  .middleware([permissionMiddleware("todos:create")])
  .validator(uploadTodoImageInputSchema)
  .handler(
    async ({ context, data }) => await uploadTempTodoImage(data, { userId: context.user.id }),
  );

export { createTodoFn, deleteTodoFn, getTodosFn, updateTodoFn, uploadTodoImageFn };
