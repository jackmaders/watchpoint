import { useCallback, useEffect, useId, useMemo, useState, type ComponentProps } from "react";

import { getImageUrl } from "@/shared/images";
import { useFieldContext, useFormContext } from "@/shared/ui/form";
import { ImageUpload } from "@/shared/ui/image-upload";
import { Field, FieldError, FieldLabel } from "@/shared/ui/shadcn/field";

import { useUploadTodoImage } from "../api/use-upload-todo-image";

interface TodoImageFieldProps extends ComponentProps<typeof Field> {
  label?: string | undefined;
  onUploadingChange?: ((uploading: boolean) => void) | undefined;
}

interface UploadTodoImageOptions {
  file: File;
  onError: (error: string) => void;
  onSuccess: (tempKey: string) => void;
  uploadImage: (file: File) => Promise<{ tempKey: string }>;
}

function selectIsSubmitting(state: { isSubmitting: boolean }) {
  return state.isSubmitting;
}

function useUploadingNotification(
  isUploading: boolean,
  onUploadingChange?: (uploading: boolean) => void,
) {
  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  useEffect(
    () => () => {
      onUploadingChange?.(false);
    },
    [onUploadingChange],
  );
}

async function uploadTodoImage({ file, onError, onSuccess, uploadImage }: UploadTodoImageOptions) {
  try {
    const result = await uploadImage(file);
    onSuccess(result.tempKey);
  } catch (error) {
    onError(error instanceof Error ? error.message : "Failed to upload image");
  }
}

function useTodoImageUpload(
  field: ReturnType<typeof useFieldContext<string | null>>,
  onUploadingChange?: (uploading: boolean) => void,
) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { mutateAsync: uploadImage } = useUploadTodoImage();

  useUploadingNotification(isUploading, onUploadingChange);

  const handleImageChange = useCallback(
    (value: File | string | null) => {
      if (value instanceof File) {
        setSelectedFile(value);
        setUploadError(null);
        setIsUploading(true);
        void uploadTodoImage({
          file: value,
          onError: (message) => {
            setSelectedFile(null);
            setUploadError(message);
            setIsUploading(false);
          },
          onSuccess: (tempKey) => {
            field.handleChange(tempKey);
            setIsUploading(false);
          },
          uploadImage,
        });
        return;
      }

      setSelectedFile(null);
      setUploadError(null);
      field.handleChange(null);
    },
    [field, uploadImage],
  );

  return {
    handleImageChange,
    isUploading,
    selectedFile,
    uploadError,
  };
}

function TodoImageField({
  className,
  label = "Image",
  onUploadingChange,
  ...props
}: TodoImageFieldProps) {
  const field = useFieldContext<string | null>();
  const form = useFormContext();
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const { handleImageChange, isUploading, selectedFile, uploadError } = useTodoImageUpload(
    field,
    onUploadingChange,
  );

  const isInvalid = Boolean(uploadError);
  const errors = useMemo(
    () => (uploadError === null ? [] : [{ message: uploadError }]),
    [uploadError],
  );

  const value = selectedFile ?? getImageUrl(field.state.value);

  return (
    <Field className={className} data-invalid={isInvalid} {...props}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <form.Subscribe selector={selectIsSubmitting}>
        {(isSubmitting) => (
          <ImageUpload
            alt="Todo preview"
            aria-describedby={isInvalid ? errorId : undefined}
            aria-invalid={isInvalid}
            disabled={isSubmitting}
            id={inputId}
            isUploading={isUploading}
            name={field.name}
            onChange={handleImageChange}
            value={value}
          />
        )}
      </form.Subscribe>
      <FieldError id={errorId} errors={errors} />
    </Field>
  );
}

export { TodoImageField, type TodoImageFieldProps };
