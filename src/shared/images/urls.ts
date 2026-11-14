function getImageUrl(imageKey?: string | null): string | null {
  if (imageKey === null || imageKey === undefined || imageKey === "") {
    return null;
  }
  return `/api/images/${imageKey.replace(/^\/+/u, "")}`;
}

export { getImageUrl };
