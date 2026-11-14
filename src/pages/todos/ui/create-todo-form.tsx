import { useSelector } from "@tanstack/react-form";
import { useState } from "react";

import { useNavigationGuard } from "@/shared/lib/navigation-guard";
import { useAppForm, type AppFormProps } from "@/shared/ui/form";
import { Card } from "@/shared/ui/shadcn/card";

import { createTodoInputSchema, type CreateTodoInput } from "../api/todo-schema";
import { useCreateTodo } from "../api/use-create-todo";
import { TodoImageField } from "./todo-image-field";

const DEFAULT_FORM_VALUES: CreateTodoInput = {
  description: "",
  imageKey: null,
  title: "",
};

function CreateTodoForm({ ...props }: AppFormProps) {
  const { mutateAsync: createTodo } = useCreateTodo();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const form = useAppForm({
    defaultValues: DEFAULT_FORM_VALUES,
    onSubmit: async ({ value, formApi }) => {
      await createTodo(value);
      formApi.reset();
    },
    validators: { onChange: createTodoInputSchema },
  });

  const isDirty = useSelector(form.store, (state) => state.isDirty);
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const { NavigationGuardDialog } = useNavigationGuard({
    shouldBlock: (isDirty || isUploadingImage) && !isSubmitting,
  });

  return (
    <Card>
      <form.AppForm>
        <form.Form className="flex flex-col gap-3" {...props}>
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
          <form.SubmitButton disabled={isUploadingImage}>
            {isUploadingImage ? "Uploading image…" : "Add Todo"}
          </form.SubmitButton>
        </form.Form>
        <NavigationGuardDialog />
      </form.AppForm>
    </Card>
  );
}

export { CreateTodoForm };
