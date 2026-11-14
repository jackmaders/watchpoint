import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/shadcn/dialog";

interface NavigationGuardDialogProps extends ComponentProps<typeof Dialog> {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

function NavigationGuardDialog({
  message,
  onCancel,
  onConfirm,
  onOpenChange,
  title,
  ...props
}: NavigationGuardDialogProps): ReactNode {
  return (
    <Dialog
      {...props}
      onOpenChange={(nextOpen, eventDetails) => {
        onCancel();
        onOpenChange?.(nextOpen, eventDetails);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="outline">
            Stay on page
          </Button>
          <Button onClick={onConfirm} type="button" variant="destructive">
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { NavigationGuardDialog };
