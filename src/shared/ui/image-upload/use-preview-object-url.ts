import { useCallback, useRef, useSyncExternalStore } from "react";

function usePreviewObjectUrl(value: File | string | null = null): string | null {
  const urlRef = useRef<string | null>(null);

  const getSnapshot = useCallback(() => urlRef.current, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof File !== "undefined" && value instanceof File) {
        const objectUrl = URL.createObjectURL(value);
        urlRef.current = objectUrl;
        onStoreChange();
        return () => {
          urlRef.current = null;
          URL.revokeObjectURL(objectUrl);
        };
      }
      urlRef.current = null;
      onStoreChange();
      return () => {
        // No-op cleanup when value is not a File instance
      };
    },
    [value],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export { usePreviewObjectUrl };
