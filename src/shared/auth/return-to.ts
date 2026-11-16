const FALLBACK_RETURN_TO = "/vods";
const INTERNAL_ORIGIN = "https://watchpoint.invalid";

function getInternalReturnTo(value: string | null): string {
  if (value === null || !value.startsWith("/") || value.startsWith("//")) {
    return FALLBACK_RETURN_TO;
  }

  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    return url.origin === INTERNAL_ORIGIN && !url.pathname.startsWith("//")
      ? `${url.pathname}${url.search}${url.hash}`
      : FALLBACK_RETURN_TO;
  } catch {
    return FALLBACK_RETURN_TO;
  }
}

export { getInternalReturnTo };
