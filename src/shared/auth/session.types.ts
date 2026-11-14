import type { getSessionFn } from "./session.functions";

type Session = NonNullable<Awaited<ReturnType<typeof getSessionFn>>>;

export type { Session };
