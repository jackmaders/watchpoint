function createDeferred<TValue = null>() {
  let resolvePromise: ((value: TValue) => void) | null = null;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<TValue>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject: (reason?: unknown) => {
      rejectPromise?.(reason);
    },
    resolve: (value: TValue) => {
      resolvePromise?.(value);
    },
  };
}

export { createDeferred };
