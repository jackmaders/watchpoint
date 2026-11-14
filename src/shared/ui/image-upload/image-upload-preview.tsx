import { UploadIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Spinner } from "@/shared/ui/shadcn/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";

import { useImageUpload } from "./image-upload-context";

interface ImageUploadActionButtonProps {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

function ImageUploadActionButton({ disabled, icon, label, onClick }: ImageUploadActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className="rounded-full"
            disabled={disabled}
            onClick={onClick}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ImageUploadOverlayControls() {
  const { disabled, isUploading, onRemove, onTriggerPicker } = useImageUpload();
  const isDisabled = disabled || isUploading;

  return (
    <TooltipProvider>
      <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full border border-border/50 bg-background/80 p-0.5 shadow-xs backdrop-blur-xs">
        <ImageUploadActionButton
          disabled={isDisabled}
          icon={<UploadIcon aria-hidden="true" />}
          label="Replace image"
          onClick={onTriggerPicker}
        />
        <ImageUploadActionButton
          disabled={isDisabled}
          icon={<XIcon aria-hidden="true" />}
          label="Remove image"
          onClick={onRemove}
        />
      </div>
    </TooltipProvider>
  );
}

interface ImageUploadPreviewProps {
  imageUrl: string;
}

function ImageUploadPreview({ imageUrl }: ImageUploadPreviewProps) {
  const { alt, ariaInvalid, isUploading } = useImageUpload();

  return (
    <fieldset
      aria-invalid={ariaInvalid}
      aria-label="Image preview"
      className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md border border-input bg-muted aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
      data-slot="image-upload-preview"
    >
      <img alt={alt} className="size-full object-cover" src={imageUrl} />
      <ImageUploadOverlayControls />
      {isUploading && (
        <output
          aria-label="Uploading image"
          className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-xs"
        >
          <Spinner className="size-6" />
        </output>
      )}
    </fieldset>
  );
}

export { ImageUploadPreview };
