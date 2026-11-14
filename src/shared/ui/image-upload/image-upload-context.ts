import { createContext, useContext, type ChangeEvent, type RefObject } from "react";

interface ImageUploadContextValue {
  accept?: string | undefined;
  alt: string;
  ariaDescribedby?: string | undefined;
  ariaInvalid?: boolean | "false" | "true" | "grammar" | "spelling" | undefined;
  disabled: boolean;
  displayUrl: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  id?: string | undefined;
  isUploading: boolean;
  name?: string | undefined;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onTriggerPicker: () => void;
  uploadButtonRef: RefObject<HTMLButtonElement | null>;
  value: File | string | null;
}

const ImageUploadContext = createContext<ImageUploadContextValue | null>(null);

function useImageUpload(): ImageUploadContextValue {
  const context = useContext(ImageUploadContext);
  if (!context) {
    throw new Error("useImageUpload must be used within an ImageUpload");
  }
  return context;
}

export { ImageUploadContext, useImageUpload, type ImageUploadContextValue };
