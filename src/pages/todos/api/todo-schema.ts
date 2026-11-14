import * as z from "zod";

const TITLE_MIN_LENGTH = 1;
const TITLE_MAX_LENGTH = 256;
const DESCRIPTION_MAX_LENGTH = 1024;
const ID_MIN_LENGTH = 1;

const titleSchema = z
  .string()
  .trim()
  .min(TITLE_MIN_LENGTH, "Title is required")
  .max(TITLE_MAX_LENGTH);

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, "Description must not exceed 1024 characters")
  .nullable()
  .optional();

const imageKeySchema = z.string().nullable().optional();

const idSchema = z.string().trim().min(ID_MIN_LENGTH);

const createTodoInputSchema = z.object({
  description: descriptionSchema,
  imageKey: imageKeySchema,
  title: titleSchema,
});
type CreateTodoInput = z.infer<typeof createTodoInputSchema>;

const updateTodoDataSchema = z.object({
  completed: z.boolean().optional(),
  description: descriptionSchema,
  imageKey: imageKeySchema,
  title: titleSchema.optional(),
});
type UpdateTodoData = z.infer<typeof updateTodoDataSchema>;

const updateTodoInputSchema = z.object({
  data: updateTodoDataSchema,
  id: idSchema,
});
type UpdateTodoInput = z.infer<typeof updateTodoInputSchema>;

const deleteTodoInputSchema = z.object({
  id: idSchema,
});
type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;

const uploadTodoImageInputSchema = z.object({
  base64: z.string().min(1, "Image data is required"),
  contentType: z.string().trim().min(1, "Content type is required").default("image/webp"),
});
type UploadTodoImageInput = z.infer<typeof uploadTodoImageInputSchema>;

export {
  createTodoInputSchema,
  deleteTodoInputSchema,
  updateTodoDataSchema,
  updateTodoInputSchema,
  uploadTodoImageInputSchema,
};
export type {
  CreateTodoInput,
  DeleteTodoInput,
  UpdateTodoData,
  UpdateTodoInput,
  UploadTodoImageInput,
};
