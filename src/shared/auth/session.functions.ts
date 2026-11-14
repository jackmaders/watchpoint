import { createServerFn } from "@tanstack/react-start";

import { getSession } from "./session.server";

const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  return session;
});

export { getSessionFn };
