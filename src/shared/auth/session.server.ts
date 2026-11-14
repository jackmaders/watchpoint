import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "./auth.server";

async function getSession() {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session;
}

async function ensureSession() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export { ensureSession, getSession };
