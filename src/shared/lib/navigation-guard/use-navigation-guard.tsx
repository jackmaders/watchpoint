import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { NavigationGuardDialog } from "./navigation-guard-dialog";

interface UseNavigationGuardOptions {
  message?: string | undefined;
  shouldBlock: boolean;
  title?: string | undefined;
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

function useBeforeUnload(shouldBlock: boolean) {
  useEffect(() => {
    if (shouldBlock) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      if (shouldBlock) {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
  }, [shouldBlock]);
}

function useNavigationGuard({
  message = "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
  shouldBlock,
  title = "Unsaved changes",
}: UseNavigationGuardOptions) {
  const [open, setOpen] = useState(false);

  const blocker = useBlocker({
    disabled: !shouldBlock,
    enableBeforeUnload: false,
    shouldBlockFn: () => {
      setOpen(true);
      return true;
    },
    withResolver: true,
  });

  useBeforeUnload(shouldBlock);

  const handleCancel = useCallback(() => {
    setOpen(false);
    blocker.reset?.();
  }, [blocker]);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    blocker.proceed?.();
  }, [blocker]);

  const renderDialog = useCallback(
    (): ReactNode => (
      <NavigationGuardDialog
        message={message}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        open={open}
        title={title}
      />
    ),
    [handleCancel, handleConfirm, message, open, title],
  );

  return {
    NavigationGuardDialog: renderDialog,
    open,
  };
}

export { useNavigationGuard };
