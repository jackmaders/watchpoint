import { type ComponentProps, useState } from "react";

import type { Todo } from "@/shared/db";
import { useAppForm } from "@/shared/ui/form";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";

import { updateTodoDataSchema, type UpdateTodoData } from "../api/todo-schema";
import { useUpdateTodo } from "../api/use-update-todo";
import { TodoImageField } from "./todo-image-field";

interface UpdateTodoDialogProps extends ComponentProps<typeof DialogTrigger> {
  todo: Todo;
}

function UpdateTodoDialog({ children = "Update Item", todo, ...props }: UpdateTodoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger {...props}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Todo Item?</DialogTitle>
        </DialogHeader>
        <UpdateTodoForm
          todo={todo}
          onSuccess={() => {
            setOpen(false);
          }}
          onCancel={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface UpdateTodoFormProps {
  todo: Todo;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function UpdateTodoForm({ todo, onSuccess, onCancel }: UpdateTodoFormProps) {
  const { mutateAsync: updateTodo } = useUpdateTodo();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const defaultValues: UpdateTodoData = {
    description: todo.description ?? "",
    imageKey: todo.imageKey,
    title: todo.title,
  };

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await updateTodo({ data: value, id: todo.id });
      onSuccess?.();
    },
    validators: {
      onChange: updateTodoDataSchema,
      onMount: updateTodoDataSchema,
    },
  });

  return (
    <form.AppForm>
      <form.Form className="flex flex-col gap-4">
        <form.AppField name="title">
          {(field) => <field.TextField label="Title" placeholder="Title" required />}
        </form.AppField>
        <form.AppField name="description">
          {(field) => <field.TextField label="Description" placeholder="Description" />}
        </form.AppField>
        <form.AppField name="imageKey">
          {() => <TodoImageField onUploadingChange={setIsUploadingImage} />}
        </form.AppField>
        <form.FormError />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <form.SubmitButton disabled={isUploadingImage}>
            {isUploadingImage ? "Uploading image…" : "Update"}
          </form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}

export { UpdateTodoDialog };
