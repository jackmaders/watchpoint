import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { applicationErrorAdapter, errorMiddleware } from "@/shared/errors";

const startInstance = createStart(() => ({
  functionMiddleware: [errorMiddleware],
  requestMiddleware: [
    createCsrfMiddleware({ filter: (context) => context.handlerType === "serverFn" }),
  ],
  serializationAdapters: [applicationErrorAdapter],
}));

export { startInstance };
