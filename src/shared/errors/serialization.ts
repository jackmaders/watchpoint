import { createSerializationAdapter } from "@tanstack/react-router";

import { ApplicationError } from "./application-error";

/** Transports configured public fields and restores errors for rejecting client calls. */
const applicationErrorAdapter = createSerializationAdapter<
  ApplicationError,
  ReturnType<ApplicationError["toJSON"]>
>({
  fromSerializable: (error) => new ApplicationError(error.code),
  key: "ApplicationError",
  test: (value): value is ApplicationError => value instanceof ApplicationError,
  toSerializable: (error) => error.toJSON(),
});

export { applicationErrorAdapter };
