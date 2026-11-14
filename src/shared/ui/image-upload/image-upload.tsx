import { cn } from "cn";
import { UploadIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type ComponentProps,
} from "react";

import { Button } from "@/shared/ui/shadcn/button";

import { useControllableState } from "../../lib/hooks";
import {
  ImageUploadContext,
  useImageUpload,
  type ImageUploadContextValue,
} from "./image-upload-context";
import { ImageUploadPreview } from "./image-upload-preview";
import { usePreviewObjectUrl } from "./use-preview-object-url";

const DEFAULT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

interface ImageUploadProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling" | undefined;
  accept?: string | undefined;
  alt?: string | undefined;
  defaultValue?: File | string | null | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  isUploading?: boolean | undefined;
  name?: string | undefined;
  onChange?: ((value: File | string | null) => void) | undefined;
  value?: File | string | null | undefined;
}

interface UseImageUploadStateOptions {
  accept: string;
  alt: string;
  ariaDescribedby?: string | undefined;
  ariaInvalid?: boolean | "false" | "true" | "grammar" | "spelling" | undefined;
  defaultValue: File | string | null;
  disabled: boolean;
  id?: string | undefined;
  isUploading: boolean;
  name?: string | undefined;
  onChange?: ((value: File | string | null) => void) | undefined;
  value?: File | string | null | undefined;
}

interface UseFocusOnRemoveOptions {
  displayUrl: string | null;
  setValue: (value: File | string | null) => void;
}

function ImageUploadTrigger() {
  const { disabled, isUploading, onTriggerPicker, uploadButtonRef } = useImageUpload();

  return (
    <Button
      ref={uploadButtonRef}
      disabled={disabled || isUploading}
      onClick={onTriggerPicker}
      type="button"
      variant="outline"
    >
      <UploadIcon className="mr-2 size-4" />
      Upload image
    </Button>
  );
}

function ImageUploadControls() {
  const {
    accept,
    ariaDescribedby,
    ariaInvalid,
    disabled,
    displayUrl,
    fileInputRef,
    id,
    isUploading,
    name,
    onFileChange,
  } = useImageUpload();

  return (
    <>
      <input
        ref={fileInputRef}
        accept={accept}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        className="sr-only"
        disabled={disabled || isUploading}
        id={id}
        name={name}
        onChange={onFileChange}
        tabIndex={-1}
        type="file"
      />
      {displayUrl === null ? <ImageUploadTrigger /> : <ImageUploadPreview imageUrl={displayUrl} />}
    </>
  );
}

function useFocusOnRemove({ displayUrl, setValue }: UseFocusOnRemoveOptions) {
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const wasRemovedRef = useRef(false);

  const handleRemove = useCallback(() => {
    wasRemovedRef.current = true;
    setValue(null);
  }, [setValue]);

  useEffect(() => {
    if (wasRemovedRef.current && displayUrl === null) {
      wasRemovedRef.current = false;
      uploadButtonRef.current?.focus();
    }
  }, [displayUrl]);

  return { handleRemove, uploadButtonRef };
}

function useFileInputChange(setValue: (value: File | string | null) => void) {
  return useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (file !== null) {
        setValue(file);
        event.target.value = "";
      }
    },
    [setValue],
  );
}

function useImageUploadContextValue(value: ImageUploadContextValue): ImageUploadContextValue {
  return useMemo<ImageUploadContextValue>(
    () => ({
      accept: value.accept,
      alt: value.alt,
      ariaDescribedby: value.ariaDescribedby,
      ariaInvalid: value.ariaInvalid,
      disabled: value.disabled,
      displayUrl: value.displayUrl,
      fileInputRef: value.fileInputRef,
      id: value.id,
      isUploading: value.isUploading,
      name: value.name,
      onFileChange: value.onFileChange,
      onRemove: value.onRemove,
      onTriggerPicker: value.onTriggerPicker,
      uploadButtonRef: value.uploadButtonRef,
      value: value.value,
    }),
    [
      value.accept,
      value.alt,
      value.ariaDescribedby,
      value.ariaInvalid,
      value.disabled,
      value.displayUrl,
      value.fileInputRef,
      value.id,
      value.isUploading,
      value.name,
      value.onFileChange,
      value.onRemove,
      value.onTriggerPicker,
      value.uploadButtonRef,
      value.value,
    ],
  );
}

function useImageUploadState({
  accept,
  alt,
  ariaDescribedby,
  ariaInvalid,
  defaultValue,
  disabled,
  id,
  isUploading,
  name,
  onChange,
  value: valueProp,
}: UseImageUploadStateOptions): ImageUploadContextValue {
  const [value = null, setValue] = useControllableState<File | string | null>({
    defaultProp: defaultValue,
    onChange,
    prop: valueProp,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = usePreviewObjectUrl(value);
  const displayUrl = typeof value === "string" ? value : previewUrl;
  const { handleRemove, uploadButtonRef } = useFocusOnRemove({
    displayUrl,
    setValue,
  });
  const handleFileChange = useFileInputChange(setValue);
  const handleTriggerPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return useImageUploadContextValue({
    accept,
    alt,
    ariaDescribedby,
    ariaInvalid,
    disabled,
    displayUrl,
    fileInputRef,
    id,
    isUploading,
    name,
    onFileChange: handleFileChange,
    onRemove: handleRemove,
    onTriggerPicker: handleTriggerPicker,
    uploadButtonRef,
    value,
  });
}

function ImageUpload({
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  accept = DEFAULT_IMAGE_ACCEPT,
  alt = "Image preview",
  className,
  defaultValue = null,
  disabled = false,
  id,
  isUploading = false,
  name,
  onChange,
  value: valueProp,
  ...props
}: ImageUploadProps) {
  const contextValue = useImageUploadState({
    accept,
    alt,
    ariaDescribedby,
    ariaInvalid,
    defaultValue,
    disabled,
    id,
    isUploading,
    name,
    onChange,
    value: valueProp,
  });

  return (
    <ImageUploadContext.Provider value={contextValue}>
      <div className={cn("space-y-3", className)} data-slot="image-upload" {...props}>
        <ImageUploadControls />
      </div>
    </ImageUploadContext.Provider>
  );
}

export { ImageUpload };
